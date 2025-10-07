const fs = require('fs');
const path = require('path');

const defaultConfig = {
  rules: {
    requireNesting: true,
    maxElementDepth: 1,
    allowUtilityClasses: true,
    utilityPrefixes: ['is-', 'has-', 'js-']
  },
  ignore: ['node_modules/**', 'dist/**', '*.min.*'],
  autoFix: false
};

function loadConfig(cwd, overrides = {}) {
  const configPath = path.resolve(cwd, '.bemrc.json');
  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(fileContents);
    } catch (error) {
      throw new Error(`Unable to parse .bemrc.json: ${error.message}`);
    }
  }
  return mergeConfigs(defaultConfig, mergeConfigs(fileConfig, overrides));
}

function mergeConfigs(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    const value = override[key];
    if (Array.isArray(value)) {
      result[key] = [...new Set([...(base[key] || []), ...value])];
    } else if (value && typeof value === 'object') {
      result[key] = mergeConfigs(base[key] || {}, value);
    } else if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function normalizeClassName(input) {
  if (!input) return input;
  const prefix = input.startsWith('.') || input.startsWith('#') ? input[0] : '';
  const body = prefix ? input.slice(1) : input;
  const preserve = body.startsWith('--') ? '--' : '';
  const bodyWithoutPreserve = preserve ? body.slice(2) : body;

  const segmentsForModifiers = bodyWithoutPreserve.split('--');
  const baseSegment = segmentsForModifiers.shift();
  const modifierSegments = segmentsForModifiers;

  const baseParts = baseSegment.split('__').map(toKebabCase);
  const normalizedBase = baseParts.join('__');

  const normalizedModifiers = modifierSegments.map(segment => {
    return segment
      .split('__')
      .map(toKebabCase)
      .join('__');
  });

  let finalBody = normalizedBase;
  if (normalizedModifiers.length) {
    finalBody += '--' + normalizedModifiers.join('--');
  }

  if (preserve) {
    finalBody = preserve + finalBody;
  }

  return prefix + finalBody;
}

function toKebabCase(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function splitBEMClass(className) {
  if (!className || typeof className !== 'string') {
    return null;
  }
  const target = className.trim();
  if (!target) return null;

  const doubleDashCount = (target.match(/--/g) || []).length;
  if (doubleDashCount > 1) return null;

  const [basePart, modifierPart] = target.split('--');
  const baseSegments = basePart.split('__');

  const block = baseSegments.shift();
  if (!block) return null;

  const elements = baseSegments;

  return {
    block,
    elements,
    modifier: modifierPart || null,
    original: target
  };
}

function isValidNameSegment(segment) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment);
}

function isUtilityClass(className, config) {
  if (!config.rules.allowUtilityClasses) return false;
  const prefixes = config.rules.utilityPrefixes || [];
  return prefixes.some(prefix => className.startsWith(prefix));
}

function isValidBEMClass(className, config) {
  if (!className || typeof className !== 'string') {
    return { valid: false, reason: 'Empty class name', suggestion: null };
  }

  const name = className.trim();
  if (!name) return { valid: false, reason: 'Empty class name', suggestion: null };

  if (/[\s]/.test(name)) {
    return {
      valid: false,
      reason: 'Class names must not contain whitespace',
      suggestion: name.replace(/\s+/g, '-')
    };
  }

  if (/[^a-z0-9\-_]/.test(name)) {
    return {
      valid: false,
      reason: 'Only lowercase letters, numbers, hyphen, and underscore are allowed',
      suggestion: normalizeClassName(name)
    };
  }

  if (isUtilityClass(name, config)) {
    return { valid: true };
  }

  if (name.startsWith('-')) {
    return {
      valid: false,
      reason: 'Class names must not start with a hyphen',
      suggestion: normalizeClassName(name.replace(/^-+/, ''))
    };
  }

  const split = splitBEMClass(name);
  if (!split) {
    return {
      valid: false,
      reason: 'Not a valid BEM class structure',
      suggestion: normalizeClassName(name)
    };
  }

  if (!isValidNameSegment(split.block)) {
    return {
      valid: false,
      reason: `Invalid block name "${split.block}"`,
      suggestion: normalizeClassName(name)
    };
  }

  const maxDepth = Number.isFinite(config.rules.maxElementDepth)
    ? config.rules.maxElementDepth
    : defaultConfig.rules.maxElementDepth;

  if (split.elements.length > maxDepth) {
    return {
      valid: false,
      reason: `Element depth exceeds limit of ${maxDepth}`,
      suggestion: null
    };
  }

  for (const element of split.elements) {
    if (!isValidNameSegment(element)) {
      return {
        valid: false,
        reason: `Invalid element name "${element}"`,
        suggestion: normalizeClassName(name)
      };
    }
  }

  if (split.modifier && !isValidNameSegment(split.modifier)) {
    return {
      valid: false,
      reason: `Invalid modifier name "${split.modifier}"`,
      suggestion: normalizeClassName(name)
    };
  }

  return { valid: true };
}

function getModifierBase(className) {
  const split = splitBEMClass(className);
  if (!split || !split.modifier) return null;
  let base = split.block;
  if (split.elements.length) {
    base += `__${split.elements.join('__')}`;
  }
  return base;
}

function indexToLineColumn(content, index) {
  const substring = content.slice(0, index);
  const lines = substring.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

module.exports = {
  defaultConfig,
  loadConfig,
  mergeConfigs,
  normalizeClassName,
  isValidBEMClass,
  getModifierBase,
  indexToLineColumn,
  isUtilityClass,
  splitBEMClass
};
