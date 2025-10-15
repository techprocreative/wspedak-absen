// Test file to verify import resolution works
try {
  console.log('🧪 Testing imports...');
  
  // Test direct imports
  const tabs = require('./components/ui/tabs.tsx');
  console.log('✅ tabs.tsx imported successfully');
  
  const card = require('./components/ui/card.tsx');
  console.log('✅ card.tsx imported successfully');
  
  const badge = require('./components/ui/badge.tsx');
  console.log('✅ badge.tsx imported successfully');
  
  const alertTable = require('./components/admin/alerts/AlertManagementTable.tsx');
  console.log('✅ AlertManagementTable.tsx imported successfully');
  
  console.log('🎉 All imports successful!');
} catch (error) {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
}