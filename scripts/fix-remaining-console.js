#!/usr/bin/env node
/**
 * Script to fix remaining console statements that the automatic replacer missed
 */

const fs = require('fs');
const path = require('path');

const files = [
  'app/admin/attendance/page.tsx',
  'app/admin/employees/page.tsx',
  'app/admin/schedules/page.tsx',
  'app/admin/settings/page.tsx',
  'app/api/face/action/route.ts',
  'app/api/shift-swap/[id]/approve/route.ts',
  'app/error.tsx',
  'app/face-checkin/page.tsx',
];

let totalFixed = 0;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Pattern 1: console.error("Failed...", data.error) -> logger.error('Failed...', new Error(data.error))
    content = content.replace(
      /console\.error\("(Failed[^"]+)",\s*data\.error\)/g,
      "logger.error('$1', new Error(data.error))"
    );

    // Pattern 2: console.error("Failed...", error.message) -> logger.error('Failed...', error)
    content = content.replace(
      /console\.error\("(Failed[^"]+)",\s*error\.message\)/g,
      "logger.error('$1', error as Error)"
    );

    // Pattern 3: console.error('Failed...', ...) already with single quotes
    content = content.replace(
      /console\.error\('(Failed[^']+)',\s*data\.error\)/g,
      "logger.error('$1', new Error(data.error))"
    );

    // Pattern 4: console.error(error) -> logger.error('Error occurred', error as Error)
    content = content.replace(
      /console\.error\(error\)/g,
      "logger.error('Error occurred', error as Error)"
    );

    // Pattern 5: console.log with complex objects/multiline
    content = content.replace(
      /console\.log\('(Late excuse submitted|Executing shift swap|User identified|Face detected with confidence):',\s*\{/g,
      "logger.info('$1', {"
    );

    // Pattern 6: console.log('...', response.data) or similar
    content = content.replace(
      /console\.log\('([^']+)',\s*([^)]+)\)/g,
      "logger.info('$1', { data: $2 })"
    );

    // Pattern 7: console.warn(...) -> logger.warn(...)
    content = content.replace(
      /console\.warn\('([^']+):',\s*([^)]+)\)/g,
      "logger.warn('$1', { error: $2 })"
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      const changes = (original.match(/console\./g) || []).length - (content.match(/console\./g) || []).length;
      console.log(`✓ Fixed ${file} - ${changes} replacements`);
      totalFixed += changes;
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
});

console.log(`\n✅ Total fixed: ${totalFixed} console statements`);
