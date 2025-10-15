#!/usr/bin/env node
/**
 * Script to automatically replace console.log statements with logger
 * Usage: node scripts/replace-console-logs.js [directory]
 */

const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '__tests__',
  '__mocks__',
  'e2e',
  '.git',
];

const IGNORED_FILES = [
  'check-console-logs.js',
  'replace-console-logs.js',
  'logger.ts',
  'structured-logger.ts',
];

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

let totalReplacements = 0;
let filesModified = 0;

function shouldIgnore(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  for (const dir of IGNORED_DIRS) {
    if (relativePath.includes(dir + path.sep) || relativePath.startsWith(dir + path.sep)) {
      return true;
    }
  }
  
  const fileName = path.basename(filePath);
  if (IGNORED_FILES.includes(fileName)) {
    return true;
  }
  
  return false;
}

function replaceInFile(filePath) {
  if (shouldIgnore(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let replacements = 0;
    let needsLoggerImport = false;

    // Check if file has console statements
    if (!content.match(/\bconsole\.(log|error|warn|info|debug)\s*\(/)) {
      return;
    }

    // Check if logger is already imported
    const hasLoggerImport = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');

    // Replace patterns
    const patterns = [
      // console.error('message:', error) -> logger.error('message', error)
      {
        pattern: /console\.error\(\s*['"`]([^'"`]+):\s*['"`],\s*(\w+)\s*\)/g,
        replacement: "logger.error('$1', $2 as Error)"
      },
      // console.error('message', error) -> logger.error('message', error)
      {
        pattern: /console\.error\(\s*['"`]([^'"`]+)['"`],\s*(\w+)\s*\)/g,
        replacement: "logger.error('$1', $2 as Error)"
      },
      // console.error(`Template ${var}`) -> logger.error('Template', { var })
      {
        pattern: /console\.error\(\s*`([^`]*)\$\{([^}]+)\}([^`]*)`\s*\)/g,
        replacement: (match, before, variable, after) => {
          const message = (before + after).trim();
          return `logger.error('${message}', new Error(), { value: ${variable} })`;
        }
      },
      // console.error('message') -> logger.error('message', new Error())
      {
        pattern: /console\.error\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        replacement: "logger.error('$1', new Error())"
      },
      // console.log('message:', var) -> logger.info('message', { var })
      {
        pattern: /console\.log\(\s*['"`]([^'"`]+):\s*['"`],\s*(\w+)\s*\)/g,
        replacement: "logger.info('$1', { $2 })"
      },
      // console.log('message', var) -> logger.info('message', { var })
      {
        pattern: /console\.log\(\s*['"`]([^'"`]+)['"`],\s*(\w+)\s*\)/g,
        replacement: "logger.info('$1', { $2 })"
      },
      // console.log('message') -> logger.info('message')
      {
        pattern: /console\.log\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        replacement: "logger.info('$1')"
      },
      // console.warn -> logger.warn
      {
        pattern: /console\.warn\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        replacement: "logger.warn('$1')"
      },
      // console.info -> logger.info
      {
        pattern: /console\.info\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        replacement: "logger.info('$1')"
      },
      // console.debug -> logger.debug
      {
        pattern: /console\.debug\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
        replacement: "logger.debug('$1')"
      },
    ];

    patterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        const matches = content.match(pattern);
        if (matches) {
          replacements += matches.length;
          needsLoggerImport = true;
        }
        content = newContent;
      }
    });

    // Add logger import if needed and not present
    if (needsLoggerImport && !hasLoggerImport) {
      // Check if there are other imports
      const importMatch = content.match(/^import\s+/m);
      if (importMatch) {
        // Add after the first import block
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            insertIndex = i + 1;
            // Continue to find the end of import block
            while (insertIndex < lines.length && 
                   (lines[insertIndex].trim().startsWith('import ') || 
                    lines[insertIndex].trim() === '')) {
              insertIndex++;
            }
            break;
          }
        }
        lines.splice(insertIndex, 0, "import { logger, logApiError, logApiRequest } from '@/lib/logger'");
        content = lines.join('\n');
      } else {
        // No imports, add at the top
        content = "import { logger, logApiError, logApiRequest } from '@/lib/logger'\n\n" + content;
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      filesModified++;
      totalReplacements += replacements;
      console.log(`✓ ${path.relative(process.cwd(), filePath)} - ${replacements} replacements`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!shouldIgnore(fullPath)) {
          processDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (FILE_EXTENSIONS.includes(ext)) {
          replaceInFile(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

// Main execution
const targetDir = process.argv[2] || process.cwd();
console.log(`🔄 Replacing console statements in ${targetDir}...\n`);

processDirectory(targetDir);

console.log(`\n✅ Replacement complete!`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${totalReplacements}\n`);

if (totalReplacements > 0) {
  console.log('💡 Tip: Run "npm run check:console" to verify no console statements remain');
  console.log('💡 Test your changes: npm run build && npm test\n');
}
