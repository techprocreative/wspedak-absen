/**
 * Run Database Migration Script
 * Executes the dynamic attendance system migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}
loadEnv();

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('✓ Environment variables loaded');
  console.log(`✓ Supabase URL: ${supabaseUrl}\n`);

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✓ Supabase client initialized\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20240115_dynamic_attendance_system.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: Migration file not found at ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✓ Migration file loaded');
  console.log(`  File: ${migrationPath}`);
  console.log(`  Size: ${migrationSQL.length} bytes\n`);

  // Split SQL into individual statements
  // Supabase RPC can only execute one statement at a time
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const statementNum = i + 1;
    
    // Get first line of statement for display
    const firstLine = statement.split('\n')[0].substring(0, 80);
    
    console.log(`[${statementNum}/${statements.length}] ${firstLine}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });

      if (error) {
        // If exec_sql doesn't exist, try direct query
        if (error.message.includes('function') || error.message.includes('not found')) {
          console.log('  ⚠️  exec_sql function not available, using direct query...');
          
          // For Supabase, we need to use the REST API directly
          // Let's try a different approach
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ sql_query: statement + ';' })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        } else {
          throw error;
        }
      }

      console.log('  ✓ Success\n');
      successCount++;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}\n`);
      errorCount++;
      
      // Continue with other statements
      // Some errors might be "already exists" which is ok
      if (!err.message.includes('already exists')) {
        console.error(`  Statement: ${statement.substring(0, 200)}...\n`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total statements: ${statements.length}`);
  console.log(`✓ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('='.repeat(60) + '\n');

  if (errorCount === 0) {
    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } else if (successCount > 0) {
    console.log('⚠️  Migration completed with some errors.');
    console.log('   Check errors above to see if they are critical.\n');
    process.exit(0);
  } else {
    console.log('❌ Migration failed!\n');
    process.exit(1);
  }
}

// Run migration
runMigration().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
