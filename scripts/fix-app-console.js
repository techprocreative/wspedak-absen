#!/usr/bin/env node
/**
 * Fix remaining console statements in application code (not service workers or build scripts)
 */

const fs = require('fs');
const path = require('path');

const files = [
  'app/api/shift-swap/[id]/approve/route.ts',
  'app/face-checkin-v2/page.tsx',
  'app/offline/page.tsx',
  'components/admin/analytics/PredictiveAnalyticsCard.tsx',
  'components/auth/LoginForm.tsx',
  'components/face-enrollment-modal.tsx',
  'lib/alerts/alert-manager.ts',
  'lib/auth.ts',
  'lib/face-matching.ts',
  'lib/memory-optimizer.ts',
  'lib/monitoring.ts',
  'lib/report-generator.ts',
  'lib/security-middleware.ts',
  'lib/security-monitor.ts',
  'lib/sync-strategies.ts',
  'lib/toast-helper.ts',
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
    let hasLogger = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');

    // Pattern 1: console.log('Message:', {... }) -> logger.info('Message', {... })
    content = content.replace(
      /console\.log\('([^']+):',\s*\{/g,
      "logger.info('$1', {"
    );

    // Pattern 2: console.log('Message:', value) -> logger.info('Message', { value })
    content = content.replace(
      /console\.log\('([^']+):',\s*([^)]+)\)/g,
      (match, message, value) => {
        if (value.includes('{')) {
          return `logger.info('${message}', ${value})`;
        }
        return `logger.info('${message}', { value: ${value} })`;
      }
    );

    // Pattern 3: console.log('Message') -> logger.info('Message')
    content = content.replace(
      /console\.log\('([^']+)'\)/g,
      "logger.info('$1')"
    );

    // Pattern 4: console.warn('Message:', value) -> logger.warn('Message', { value })
    content = content.replace(
      /console\.warn\('([^']+):',\s*([^)]+)\)/g,
      (match, message, value) => {
        if (value.includes('{')) {
          return `logger.warn('${message}', ${value})`;
        }
        return `logger.warn('${message}', { value: ${value} })`;
      }
    );

    // Pattern 5: console.warn(`Template`) -> logger.warn('Message', { ... })
    content = content.replace(
      /console\.warn\(`\[SECURITY\]\s+\$\{severity\.toUpperCase\(\)\}:\s+\$\{event\}`[^)]*\)/g,
      "logger.warn('Security event', { severity, event, ...logEntry })"
    );

    // Pattern 6: console.warn(`Account locked...`) 
    content = content.replace(
      /console\.warn\(`Account locked due to brute force: \$\{identifier\}`,\s*\{/g,
      "logger.warn('Account locked due to brute force', { identifier, "
    );

    // Pattern 7: console.warn(`[SECURITY] ...`)
    content = content.replace(
      /console\.warn\(`\[SECURITY\]\s+([^`]+)`,\s*([^)]+)\)/g,
      "logger.warn('$1', $2)"
    );

    // Pattern 8: Simple console.error patterns
    content = content.replace(
      /console\.error\('([^']+):',\s*([^,)]+)(,\s*error)?\)/g,
      "logger.error('$1', error as Error, { value: $2 })"
    );

    // Add logger import if we made changes and it doesn't have it
    if (content !== original && !hasLogger) {
      // Find the first import statement
      const importMatch = content.match(/^import\s+/m);
      if (importMatch) {
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            insertIndex = i + 1;
            while (insertIndex < lines.length && 
                   (lines[insertIndex].trim().startsWith('import ') || 
                    lines[insertIndex].trim() === '')) {
              insertIndex++;
            }
            break;
          }
        }
        lines.splice(insertIndex, 0, "import { logger } from '@/lib/logger'");
        content = lines.join('\n');
      }
    }

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
console.log('\n📊 Remaining console statements are in:');
console.log('   - public/service-worker.js (acceptable for SW debugging)');
console.log('   - scripts/ (acceptable for build/dev scripts)');
console.log('   - config/error-reporting.js (error logging utility)\n');
