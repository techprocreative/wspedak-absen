const fs = require('fs');
const path = require('path');

console.log('🔍 DEBUG: Build environment investigation');
console.log('📁 Current working directory:', process.cwd());
console.log('🔧 Node version:', process.version);
console.log('📦 Platform:', process.platform);

// Check if components directory exists
const componentsDir = path.join(process.cwd(), 'components');
console.log('📂 Components directory exists:', fs.existsSync(componentsDir));

if (fs.existsSync(componentsDir)) {
  const uiDir = path.join(componentsDir, 'ui');
  console.log('📂 UI directory exists:', fs.existsSync(uiDir));
  
  if (fs.existsSync(uiDir)) {
    const uiFiles = fs.readdirSync(uiDir);
    console.log('📄 UI files:', uiFiles);
    
    // Check specific files that are missing
    const missingFiles = ['tabs.tsx', 'card.tsx', 'badge.tsx'];
    missingFiles.forEach(file => {
      const filePath = path.join(uiDir, file);
      console.log(`📄 ${file} exists:`, fs.existsSync(filePath));
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   📏 Size: ${stats.size} bytes`);
        console.log(`   🕒 Modified: ${stats.mtime}`);
      }
    });
  }
  
  const adminDir = path.join(componentsDir, 'admin', 'alerts');
  console.log('📂 Admin/alerts directory exists:', fs.existsSync(adminDir));
  
  if (fs.existsSync(adminDir)) {
    const adminFiles = fs.readdirSync(adminDir);
    console.log('📄 Admin/alerts files:', adminFiles);
    
    const alertTablePath = path.join(adminDir, 'AlertManagementTable.tsx');
    console.log('📄 AlertManagementTable.tsx exists:', fs.existsSync(alertTablePath));
  }
}

// Check tsconfig.json paths
console.log('🔍 Checking tsconfig.json...');
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  console.log('📋 tsconfig paths:', tsconfig.compilerOptions?.paths);
}

console.log('🏁 DEBUG: End of investigation');