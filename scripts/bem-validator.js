#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const chokidar = require('chokidar');
const pc = require('picocolors');
const {
  loadConfig,
  normalizeClassName,
  isValidBEMClass,
  getModifierBase,
  indexToLineColumn,
  mergeConfigs
} = require('./bem-utils');
const { validateSCSSFiles } = require('./scss-bem-parser');

const DEFAULT_EXTENSIONS = ['scss', 'html', 'htm', 'svg', 'ts', 'tsx', 'js', 'jsx'];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function buildReplacer(content) {
  const edits = [];
  return {
    replace(start, end, value) {
      if (start === undefined || end === undefined) return;
      if (content.slice(start, end) === value) return;
      edits.push({ start, end, value });
    },
    hasEdits() {
      return edits.length > 0;
    },
    apply() {
      if (!edits.length) return content;
      edits.sort((a, b) => b.start - a.start);
      let updated = content;
      for (const edit of edits) {
        updated = updated.slice(0, edit.start) + edit.value + updated.slice(edit.end);
      }
      return updated;
    }
  };
}

function parseArgs(rawArgs) {
  const args = rawArgs.slice();
  const options = {
    paths: [],
    autoFix: false,
    watch: false,
    verbose: false,
    configPath: null,
    ignore: []
  };

  while (args.length) {
    const arg = args.shift();
    switch (arg) {
      case '--fix':
      case '--auto-fix':
        options.autoFix = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--config':
        options.configPath = args.shift();
        break;
      case '--ignore':
        options.ignore.push(args.shift());
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown flag "${arg}"`);
        }
        options.paths.push(arg);
    }
  }

  if (!options.paths.length) {
    options.paths = ['./src'];
  }

  return options;
}

function formatViolation(violation) {
  const location = violation.line
    ? `${violation.file}:${violation.line}`
    : violation.file;
  const message = violation.message || 'BEM violation';
  const suggestion = violation.suggestion
    ? ` Suggested: ${violation.suggestion}`
    : '';
  return `  ${pc.dim(location)}\n    ${pc.red('✖')} ${message}${suggestion}`;
}

class BEMValidator {
  constructor(options = {}) {
    this.cwd = options.cwd || path.resolve(__dirname, '..');
    this.verbose = Boolean(options.verbose);
    this.autoFix = Boolean(options.autoFix);
    this.configOverrides =
      options.config && typeof options.config === 'object' ? { ...options.config } : {};

    if (options.configPath) {
      const resolvedConfigPath = path.resolve(this.cwd, options.configPath);
      if (!fs.existsSync(resolvedConfigPath)) {
        throw new Error(`Config file not found: ${options.configPath}`);
      }
      try {
        const configContents = fs.readFileSync(resolvedConfigPath, 'utf8');
        const parsed = JSON.parse(configContents);
        this.configOverrides = mergeConfigs(this.configOverrides, parsed);
      } catch (error) {
        throw new Error(`Unable to read config file: ${error.message}`);
      }
    }

    this.config = loadConfig(
      this.cwd,
      mergeConfigs(this.configOverrides, {
        autoFix: this.autoFix || options.autoFix || this.configOverrides.autoFix
      })
    );

    this.autoFix = this.autoFix || Boolean(this.config.autoFix);

    if (Array.isArray(options.ignore) && options.ignore.length) {
      this.config.ignore = Array.from(new Set([...(this.config.ignore || []), ...options.ignore]));
    }

    if (options.configPath) {
      this.configPath = options.configPath;
    }
  }

  async collectFiles(targetPaths) {
    const patterns = [];
    for (const target of targetPaths) {
      const absoluteTarget = path.resolve(this.cwd, target);
      if (!fs.existsSync(absoluteTarget)) continue;
      const stat = fs.statSync(absoluteTarget);
      if (stat.isDirectory()) {
        const posixDir = toPosix(path.relative(this.cwd, absoluteTarget));
        patterns.push(`${posixDir}/**/*.{${DEFAULT_EXTENSIONS.join(',')}}`);
      } else if (stat.isFile()) {
        const posixFile = toPosix(path.relative(this.cwd, absoluteTarget));
        patterns.push(posixFile);
      }
    }

    if (!patterns.length) return [];

    const files = await fg(patterns, {
      cwd: this.cwd,
      absolute: true,
      onlyFiles: true,
      ignore: this.config.ignore || []
    });

    return files;
  }

  validateHTMLContent(filePath, content) {
    const violations = [];
    const replacer = buildReplacer(content);
    const classAttrRegex = /class\s*=\s*["']([^"']+)["']/gi;
    let match;

    while ((match = classAttrRegex.exec(content)) !== null) {
      const [fullMatch, rawValue] = match;
      const attrStart = match.index;
      const valueOffset = fullMatch.indexOf(rawValue);
      const valueStart = attrStart + valueOffset;
      const valueEnd = valueStart + rawValue.length;
      const classNames = rawValue.split(/\s+/).filter(Boolean);
      if (!classNames.length) continue;

      const location = indexToLineColumn(content, attrStart);

      let mutated = false;

      for (let idx = 0; idx < classNames.length; idx += 1) {
        const className = classNames[idx];
        const validation = isValidBEMClass(className, this.config);
        if (!validation.valid) {
          const suggestion = validation.suggestion || normalizeClassName(className);
          violations.push({
            file: filePath,
            line: location.line,
            column: location.column,
            type: 'invalid-class-name',
            message: `Invalid BEM class name: ${className}`,
            suggestion,
            fixApplied: this.autoFix && Boolean(suggestion)
          });
          if (this.autoFix && suggestion) {
            classNames[idx] = suggestion;
            mutated = true;
          }
        }
      }

      const existingSet = new Set(classNames);
      const missingBases = [];
      classNames.forEach((className, idx) => {
        if (!className.includes('--')) return;
        const base = getModifierBase(className);
        if (base && !existingSet.has(base)) {
          missingBases.push({ base, modifier: className, index: idx });
          existingSet.add(base);
        }
      });

      if (missingBases.length) {
        missingBases.forEach(item => {
          violations.push({
            file: filePath,
            line: location.line,
            column: location.column,
            type: 'modifier-without-base',
            message: `Modifier used without base class: ${item.modifier}`,
            suggestion: `${item.base} ${item.modifier}`,
            fixApplied: this.autoFix
          });
        });

        if (this.autoFix) {
          missingBases.sort((a, b) => a.index - b.index);
          let offset = 0;
          for (const item of missingBases) {
            if (!classNames.includes(item.base)) {
              classNames.splice(item.index + offset, 0, item.base);
              offset += 1;
              mutated = true;
            }
          }
        }
      }

      const updatedValue = classNames.join(' ');
      if (this.autoFix && mutated && updatedValue !== rawValue) {
        replacer.replace(valueStart, valueEnd, updatedValue);
      }
    }

    const fixed = this.autoFix && replacer.hasEdits();
    return {
      violations,
      fixed,
      output: fixed ? replacer.apply() : content
    };
  }

  validateTSContent(filePath, content) {
    const violations = [];
    const replacer = buildReplacer(content);

    const classListRegex = /classList\.(add|remove|toggle|contains)\s*\(([^)]*)\)/g;
    let match;

    while ((match = classListRegex.exec(content)) !== null) {
      const argsText = match[2];
      const argsStart = match.index + match[0].indexOf(argsText);
      const stringLiteralRegex = /(['"`])([^'"`]+?)\1/g;
      let argMatch;
      while ((argMatch = stringLiteralRegex.exec(argsText)) !== null) {
        const quote = argMatch[1];
        const rawValue = argMatch[2];
        const valueStart = argsStart + argMatch.index + 1;
        const valueEnd = valueStart + rawValue.length;
        const classes = rawValue.split(/\s+/).filter(Boolean);
        let updatedClasses = [...classes];
        let changed = false;

        classes.forEach((className, idx) => {
          const validation = isValidBEMClass(className, this.config);
          if (!validation.valid) {
            violations.push({
              file: filePath,
              ...indexToLineColumn(content, valueStart),
              type: 'invalid-class-name',
              message: `Invalid BEM class name: ${className}`,
              suggestion: validation.suggestion || normalizeClassName(className),
              fixApplied: this.autoFix && Boolean(validation.suggestion)
            });
            if (this.autoFix && validation.suggestion) {
              updatedClasses[idx] = validation.suggestion;
              changed = true;
            }
          }
        });

        if (this.autoFix && changed) {
          const replacement = updatedClasses.join(' ');
          replacer.replace(valueStart, valueEnd, replacement);
        }
      }
    }

    const selectorRegex = /(querySelector(All)?|closest)\s*\(\s*(['"`])([^'"`]+)\3/g;
    while ((match = selectorRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const selectorValue = match[4];
      const valueStart = match.index + fullMatch.indexOf(selectorValue);
      const valueEnd = valueStart + selectorValue.length;
      let updatedSelector = selectorValue;
      let selectorChanged = false;

      updatedSelector = updatedSelector.replace(/\.([A-Za-z0-9_-]+)/g, (_, className) => {
        const validation = isValidBEMClass(className, this.config);
        if (validation.valid) return `.${className}`;
        const suggestion = validation.suggestion || normalizeClassName(className);
        violations.push({
          file: filePath,
          ...indexToLineColumn(content, valueStart),
          type: 'invalid-selector-class',
          message: `Invalid BEM class reference in selector: .${className}`,
          suggestion: `.${suggestion}`,
          fixApplied: this.autoFix
        });
        selectorChanged = true;
        return `.${suggestion}`;
      });

      if (this.autoFix && selectorChanged) {
        replacer.replace(valueStart, valueEnd, updatedSelector);
      }
    }

    const classNameAssignRegex = /(?:^|\s)([\w.]+)\.className\s*=\s*(['"`])([^'"`]+)\2/gm;
    while ((match = classNameAssignRegex.exec(content)) !== null) {
      const rawValue = match[3];
      const valueStart = match.index + match[0].lastIndexOf(rawValue);
      const valueEnd = valueStart + rawValue.length;
      const classes = rawValue.split(/\s+/).filter(Boolean);
      let updatedClasses = [...classes];
      let changed = false;

      classes.forEach((className, idx) => {
        const validation = isValidBEMClass(className, this.config);
        if (!validation.valid) {
          violations.push({
            file: filePath,
            ...indexToLineColumn(content, valueStart),
            type: 'invalid-class-name',
            message: `Invalid BEM class name: ${className}`,
            suggestion: validation.suggestion || normalizeClassName(className),
            fixApplied: this.autoFix && Boolean(validation.suggestion)
          });
          if (this.autoFix && validation.suggestion) {
            updatedClasses[idx] = validation.suggestion;
            changed = true;
          }
        }
      });

      if (this.autoFix && changed) {
        replacer.replace(valueStart, valueEnd, updatedClasses.join(' '));
      }
    }

    const fixed = this.autoFix && replacer.hasEdits();
    return {
      violations,
      fixed,
      output: fixed ? replacer.apply() : content
    };
  }

  validateHTMLFiles(files) {
    const results = {
      filesChecked: 0,
      violations: [],
      fixedFiles: []
    };

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const { violations, fixed, output } = this.validateHTMLContent(file, content);
        results.filesChecked += 1;
        results.violations.push(...violations);
        if (this.autoFix && fixed) {
          fs.writeFileSync(file, output, 'utf8');
          results.fixedFiles.push(file);
        }
      } catch (error) {
        results.violations.push({
          file,
          line: 0,
          column: 0,
          type: 'parser-error',
          message: `Unable to process HTML: ${error.message}`,
          suggestion: null,
          fixApplied: false
        });
      }
    }

    return results;
  }

  validateScriptFiles(files) {
    const results = {
      filesChecked: 0,
      violations: [],
      fixedFiles: []
    };

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const { violations, fixed, output } = this.validateTSContent(file, content);
        results.filesChecked += 1;
        results.violations.push(...violations);
        if (this.autoFix && fixed) {
          fs.writeFileSync(file, output, 'utf8');
          results.fixedFiles.push(file);
        }
      } catch (error) {
        results.violations.push({
          file,
          line: 0,
          column: 0,
          type: 'parser-error',
          message: `Unable to process script file: ${error.message}`,
          suggestion: null,
          fixApplied: false
        });
      }
    }

    return results;
  }

  summarize(sectionTitle, violations) {
    if (!violations.length) return '';
    const header = `${pc.bold(sectionTitle)} (${violations.length})`;
    const entries = violations.map(formatViolation).join('\n');
    return `${header}\n${entries}\n`;
  }

  printReport(report, elapsedMs) {
    const lines = [];
    lines.push(pc.bold('============================================================'));
    lines.push(pc.bold('📊 BEM VALIDATION REPORT'));
    lines.push(pc.bold('============================================================'));

    if (report.scss.violations.length) {
      lines.push('');
      lines.push(
        this.summarize('🎨 SCSS: Unnested Elements/Modifiers', report.scss.violations)
      );
    }

    if (report.html.violations.length) {
      lines.push('');
      lines.push(this.summarize('📝 HTML: BEM Issues', report.html.violations));
    }

    if (report.scripts.violations.length) {
      lines.push('');
      lines.push(this.summarize('🔧 Scripts: Class References', report.scripts.violations));
    }

    const total = report.totalViolations;
    const fixed = report.autoFixed;
    const footerLines = [
      pc.bold('============================================================'),
      `Total violations: ${total}`,
      fixed ? `Auto-fixed: ${fixed}` : 'Auto-fixed: 0',
      `Elapsed: ${elapsedMs.toFixed(0)}ms`,
      pc.bold('============================================================')
    ];

    lines.push(...footerLines);

    console.log(lines.filter(Boolean).join('\n'));
  }

  buildReport(results) {
    const totalViolations =
      results.scss.violations.length +
      results.html.violations.length +
      results.scripts.violations.length;
    const autoFixed =
      results.scss.violations.filter(v => v.fixApplied).length +
      results.html.violations.filter(v => v.fixApplied).length +
      results.scripts.violations.filter(v => v.fixApplied).length;

    return {
      ...results,
      totalViolations,
      autoFixed
    };
  }

  async validate(targetPaths) {
    const start = Date.now();
    const files = await this.collectFiles(targetPaths);
    const scssFiles = files.filter(file => file.endsWith('.scss'));
    const htmlFiles = files.filter(file => /\.(html?|svg)$/i.test(file));
    const scriptFiles = files.filter(file => /\.(ts|tsx|js|jsx)$/i.test(file));

    if (this.verbose) {
      console.log(pc.dim(`Found ${files.length} files to validate.`));
    }

    const scss = await validateSCSSFiles(scssFiles, {
      config: this.config,
      autoFix: this.autoFix
    });
    const html = this.validateHTMLFiles(htmlFiles);
    const scripts = this.validateScriptFiles(scriptFiles);

    const report = this.buildReport({ scss, html, scripts });
    const elapsed = Date.now() - start;
    this.printReport(report, elapsed);

    return report;
  }

  async watch(targetPaths) {
    const absolutePaths = targetPaths.map(p => path.resolve(this.cwd, p));
    const watcher = chokidar.watch(absolutePaths, {
      ignored: this.config.ignore || [],
      ignoreInitial: true
    });

    console.log(pc.cyan('👀 Watching for changes...'));
    await this.validate(targetPaths);

    watcher.on('all', async (event, changedPath) => {
      if (!['add', 'change'].includes(event)) return;
      if (!DEFAULT_EXTENSIONS.some(ext => changedPath.endsWith(`.${ext}`))) return;
      console.log(pc.cyan(`\nDetected ${event} in ${path.relative(this.cwd, changedPath)}`));
      await this.validate(targetPaths);
    });
  }
}

function printHelp() {
  console.log(`
Usage: node bem-validator.js [paths...] [options]

Options:
  --fix, --auto-fix     Automatically fix simple violations
  --watch               Watch files and re-run validation on change
  --verbose             Enable verbose logging
  --ignore <pattern>    Add glob pattern to ignore list
  --config <path>       Path to custom .bemrc.json file
  -h, --help            Show this help message

Examples:
  node bem-validator.js ./src
  node bem-validator.js ./src --fix
  node bem-validator.js ./src/components Button.tsx --verbose
`);
}

async function runCli() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }

    const validator = new BEMValidator({
      cwd: path.resolve(__dirname, '..'),
      autoFix: options.autoFix,
      verbose: options.verbose,
      ignore: options.ignore,
      configPath: options.configPath
    });

    console.log(pc.cyan(`🔍 Scanning ${options.paths.join(', ')} for BEM violations...\n`));

    if (options.watch) {
      await validator.watch(options.paths);
    } else {
      const report = await validator.validate(options.paths);
      if (report.totalViolations > 0 && !validator.autoFix) {
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error(pc.red(`Error: ${error.message}`));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = BEMValidator;
