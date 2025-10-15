#!/usr/bin/env node
/**
 * Fix import statements where logger import was incorrectly inserted
 * Pattern: import {\nimport { logger...
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TypeScript/JavaScript files with the bad pattern
try {
  console.log('Searching for files with broken import statements...\n');
  
  const files = execSync('git ls-files "*.ts" "*.tsx" "*.js" "*.jsx"', { encoding: 'utf-8' })
    .split('\n')
    .filter(f => f.trim());

  let fixed = 0;

  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) return;

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const original = content;

      // Fix pattern: import {\nimport { logger... } from '@/lib/logger'\n  ActualImport,
      // Should be: import { logger... } from '@/lib/logger'\nimport {\n  ActualImport,
      const pattern = /import\s*\{\s*\n\s*import\s*\{\s*logger[^}]+\}\s*from\s*['"]@\/lib\/logger['"]\s*\n/g;
      
      content = content.replace(pattern, (match) => {
        // Extract the logger import line
        const loggerMatch = match.match(/import\s*\{\s*logger[^}]+\}\s*from\s*['"]@\/lib\/logger['"]/);
        if (loggerMatch) {
          const loggerImport = loggerMatch[0];
          return loggerImport + '\nimport {\n';
        }
        return match;
      });

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✓ Fixed ${file}`);
        fixed++;
      }
    } catch (error) {
      // Skip files with errors
    }
  });

  console.log(`\n✅ Fixed ${fixed} files`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
