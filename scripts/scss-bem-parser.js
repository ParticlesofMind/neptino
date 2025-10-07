const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const scssSyntax = require('postcss-scss');
const selectorParser = require('postcss-selector-parser');
const { defaultConfig, splitBEMClass } = require('./bem-utils');

function splitSelectors(selector) {
  const result = [];
  selectorParser(selectors => {
    selectors.each(selectorNode => {
      result.push(String(selectorNode).trim());
    });
  }).processSync(selector);
  return result;
}

function selectorHasClass(selector, className) {
  let found = false;
  selectorParser(selectors => {
    selectors.walkClasses(node => {
      if (node.value === className) {
        found = true;
        return false;
      }
      return undefined;
    });
  }).processSync(selector);
  return found;
}

function findBlockRule(root, blockName, excludeRule) {
  let match = null;
  root.walkRules(rule => {
    if (match || rule === excludeRule) return;
    const selectors = splitSelectors(rule.selector || '');
    if (selectors.some(sel => selectorHasClass(sel, blockName))) {
      match = rule;
      return false;
    }
  });
  return match;
}

function findChildRule(parentRule, targetSelector) {
  if (!parentRule.nodes) return null;
  for (const node of parentRule.nodes) {
    if (node.type !== 'rule') continue;
    const selectors = splitSelectors(node.selector || '');
    if (selectors.includes(targetSelector)) {
      return node;
    }
  }
  return null;
}

function ensureElementRule(blockRule, elementPath) {
  let current = blockRule;
  for (const elementName of elementPath) {
    const selector = `&__${elementName}`;
    let next = findChildRule(current, selector);
    if (!next) {
      next = postcss.rule({ selector });
      current.append(next);
    }
    current = next;
  }
  return current;
}

function moveRuleContent(sourceRule, targetRule) {
  if (!Array.isArray(sourceRule.nodes)) return;
  if (!targetRule.nodes) {
    targetRule.nodes = [];
  }
  for (const child of sourceRule.nodes) {
    targetRule.append(child.clone());
  }
  sourceRule.remove();
}

function attemptAutoFix(rule, selector, bemInfo, root) {
  if (!rule || !selector || !bemInfo) return false;
  if ((rule.selector || '').includes(',')) return false;

  const isModifier = Boolean(bemInfo.modifier);
  const elementPath = bemInfo.elements || [];
  const blockName = bemInfo.block;

  const blockRule = findBlockRule(root, blockName, rule);
  if (!blockRule) return false;

  if (!elementPath.length && !isModifier) {
    return false;
  }

  if (!elementPath.length && isModifier) {
    const modifierSelector = `&--${bemInfo.modifier}`;
    let modifierRule = findChildRule(blockRule, modifierSelector);
    if (!modifierRule) {
      modifierRule = postcss.rule({ selector: modifierSelector });
      blockRule.append(modifierRule);
    }
    moveRuleContent(rule, modifierRule);
    return true;
  }

  const parentRule = ensureElementRule(blockRule, elementPath);
  if (!parentRule) return false;

  if (!isModifier) {
    moveRuleContent(rule, parentRule);
    return true;
  }

  const modifierSelector = `&--${bemInfo.modifier}`;
  let modifierRule = findChildRule(parentRule, modifierSelector);
  if (!modifierRule) {
    modifierRule = postcss.rule({ selector: modifierSelector });
    parentRule.append(modifierRule);
  }
  moveRuleContent(rule, modifierRule);
  return true;
}

function buildSuggestion(bemInfo) {
  if (!bemInfo) return null;
  if (bemInfo.modifier && !bemInfo.elements.length) {
    return `&--${bemInfo.modifier} {`;
  }
  if (bemInfo.modifier && bemInfo.elements.length) {
    return `&__${bemInfo.elements[bemInfo.elements.length - 1]} {\n  &--${bemInfo.modifier} {\n    /* … */\n  }\n}`;
  }
  if (bemInfo.elements.length) {
    return `&__${bemInfo.elements[bemInfo.elements.length - 1]} {`;
  }
  return null;
}

function validateRule(rule, filePath, config, enableAutoFix, root) {
  if (config.rules && config.rules.requireNesting === false) {
    return [];
  }

  const violations = [];
  const selectorText = rule.selector || '';
  const selectors = splitSelectors(selectorText);

  for (const selector of selectors) {
    const normalizedSelector = selector.trim();
    if (!normalizedSelector.startsWith('.')) continue;
    if (normalizedSelector.includes('&')) continue;

    const classNames = [];
    selectorParser(sel => {
      sel.walkClasses(node => {
        if (node.value) {
          classNames.push(node.value);
        }
      });
    }).processSync(normalizedSelector);

    for (const className of classNames) {
      const bemInfo = splitBEMClass(className);
      if (!bemInfo) continue;
      if (!bemInfo.elements.length && !bemInfo.modifier) continue;

      const location = rule.source && rule.source.start
        ? { line: rule.source.start.line, column: rule.source.start.column }
        : { line: 1, column: 1 };

      const messageType = bemInfo.modifier
        ? 'modifier-not-nested'
        : 'element-not-nested';

      const suggestion = buildSuggestion(bemInfo);
      const violationSelector = `.${className}`;

      const violation = {
        file: filePath,
        line: location.line,
        column: location.column,
        selector: violationSelector,
        context: normalizedSelector,
        bemInfo,
        type: messageType,
        message: `Element/modifier not nested properly: ${violationSelector}`,
        suggestion,
        fixApplied: false
      };

      const isStandaloneSelector = normalizedSelector === violationSelector;

      if (enableAutoFix && isStandaloneSelector) {
        const fixed = attemptAutoFix(rule, normalizedSelector, bemInfo, root);
        if (fixed) {
          violation.fixApplied = true;
        }
      }

      violations.push(violation);
    }
  }

  return violations;
}

function validateSCSSContent(filePath, content, config, options) {
  const autoFix = Boolean(options.autoFix);
  const root = scssSyntax.parse(content, { from: filePath });
  const violations = [];

  root.walkRules(rule => {
    violations.push(
      ...validateRule(rule, filePath, config, autoFix, root)
    );
  });

  const hasFixes = violations.some(v => v.fixApplied);
  const output = hasFixes ? root.toString() : content;

  return { violations, output, fixed: hasFixes };
}

async function validateSCSSFiles(files, options = {}) {
  const config = options.config || defaultConfig;
  const autoFix = Boolean(options.autoFix);

  const results = {
    filesChecked: 0,
    violations: [],
    fixedFiles: []
  };

  for (const file of files) {
    try {
      const absolutePath = path.resolve(file);
      const contents = fs.readFileSync(absolutePath, 'utf8');
      const { violations, output, fixed } = validateSCSSContent(
        absolutePath,
        contents,
        config,
        { autoFix }
      );

      results.filesChecked += 1;
      results.violations.push(...violations);

      if (autoFix && fixed) {
        fs.writeFileSync(absolutePath, output, 'utf8');
        results.fixedFiles.push(absolutePath);
      }
    } catch (error) {
      results.violations.push({
        file,
        line: 0,
        column: 0,
        type: 'parser-error',
        message: `Unable to parse SCSS: ${error.message}`,
        suggestion: null,
        fixApplied: false
      });
    }
  }

  return results;
}

module.exports = {
  validateSCSSFiles
};
