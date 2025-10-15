const fs = require('fs');
const path = require('path');

console.log('🔧 FIX: Attempting to fix import paths...');

const filesToFix = [
  'app/admin/alerts/page.tsx',
  'app/admin/analytics/page.tsx'
];

const importReplacements = {
  '@/components/ui/tabs': '../../../components/ui/tabs',
  '@/components/ui/card': '../../../components/ui/card', 
  '@/components/ui/badge': '../../../components/ui/badge',
  '@/components/admin/alerts/AlertManagementTable': '../../../components/admin/alerts/AlertManagementTable'
};

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`📝 Processing ${filePath}...`);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    Object.entries(importReplacements).forEach(([oldImport, newImport]) => {
      if (content.includes(oldImport)) {
        content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
        modified = true;
        console.log(`   ✅ Replaced ${oldImport} -> ${newImport}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(fullPath, content);
      console.log(`   💾 Saved changes to ${filePath}`);
    } else {
      console.log(`   ⚪ No changes needed for ${filePath}`);
    }
  } else {
    console.log(`   ❌ File not found: ${filePath}`);
  }
});

console.log('🏁 FIX: Import path fixing completed');