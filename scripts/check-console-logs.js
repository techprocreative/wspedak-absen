#!/usr/bin/env node
/**
 * Script to detect console.log statements in source code
 * Usage: node scripts/check-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  'logger.ts',
  'structured-logger.ts',
];

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

let totalConsoleStatements = 0;
let filesWithConsole = [];

function shouldIgnore(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check if path contains any ignored directory
  for (const dir of IGNORED_DIRS) {
    if (relativePath.includes(dir + path.sep) || relativePath.startsWith(dir + path.sep)) {
      return true;
    }
  }
  
  // Check if file is in ignored list
  const fileName = path.basename(filePath);
  if (IGNORED_FILES.includes(fileName)) {
    return true;
  }
  
  return false;
}

function checkFile(filePath) {
  if (shouldIgnore(filePath)) {
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches = [];

    lines.forEach((line, index) => {
      // Match console.log, console.error, console.warn, console.info, console.debug
      // But not commented lines
      if (line.match(/(?<!\/\/.*)\bconsole\.(log|error|warn|info|debug)\s*\(/)) {
        matches.push({
          line: index + 1,
          content: line.trim(),
        });
      }
    });

    if (matches.length > 0) {
      totalConsoleStatements += matches.length;
      filesWithConsole.push({
        file: path.relative(process.cwd(), filePath),
        matches,
      });
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!shouldIgnore(fullPath)) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (FILE_EXTENSIONS.includes(ext)) {
          checkFile(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

// Main execution
console.log('🔍 Scanning for console.log statements...\n');

const rootDir = process.cwd();
scanDirectory(rootDir);

// Filter out acceptable files (scripts, service-worker, config)
const appCodeFiles = filesWithConsole.filter(({ file }) => {
  return !file.startsWith('scripts' + path.sep) && 
         !file.startsWith('public' + path.sep + 'service-worker') &&
         !file.startsWith('config' + path.sep);
});

const appCodeStatements = appCodeFiles.reduce((sum, { matches }) => sum + matches.length, 0);

// Print results
if (totalConsoleStatements === 0) {
  console.log('✅ No console statements found! Code is production-ready.\n');
  process.exit(0);
} else if (appCodeStatements === 0) {
  console.log('✅ Application code is clean!\n');
  console.log(`ℹ️  Found ${totalConsoleStatements} console statement(s) in ${filesWithConsole.length} file(s):`);
  console.log('   - Scripts/ (dev tools) - acceptable');
  console.log('   - Service worker (PWA) - acceptable');
  console.log('   - Config utilities - acceptable\n');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${appCodeStatements} console statement(s) in ${appCodeFiles.length} application file(s):\n`);

  appCodeFiles.forEach(({ file, matches }) => {
    console.log(`📄 ${file}`);
    matches.forEach(({ line, content }) => {
      console.log(`   Line ${line}: ${content}`);
    });
    console.log('');
  });

  console.log('❌ Please replace console statements with proper logging:');
  console.log('   import { logger } from "@/lib/logger";');
  console.log('   logger.info("message", { context });');
  console.log('   logger.error("message", error, { context });\n');

  process.exit(1);
}
