#!/usr/bin/env node

/**
 * Cleanup Demo Data Script
 * Quick script to remove all demo/test data from database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupDemoData() {
  console.log('\n🧹 Cleaning up demo/test data...\n')

  try {
    // 1. Check what will be deleted
    const { data: demoUsers, error: checkError } = await supabase
      .from('users')
      .select('email, name, role')
      .or('email.like.%@test.com,email.like.%demo%')

    if (checkError) {
      console.error('❌ Error checking users:', checkError.message)
      process.exit(1)
    }

    if (!demoUsers || demoUsers.length === 0) {
      console.log('✅ No demo users found. Database is clean!')
      process.exit(0)
    }

    console.log('📋 Found demo users to delete:')
    demoUsers.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email} (${user.name}) - ${user.role}`)
    })
    console.log('')

    // 2. Delete demo users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .or('email.like.%@test.com,email.like.%demo%')

    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError.message)
      process.exit(1)
    }

    console.log(`✅ Deleted ${demoUsers.length} demo users`)

    // 3. Verify deletion
    const { data: remaining } = await supabase
      .from('users')
      .select('email')

    console.log(`\n📊 Database status:`)
    console.log(`   Remaining users: ${remaining?.length || 0}`)
    
    if (remaining && remaining.length > 0) {
      console.log('\n✅ Real users in database:')
      remaining.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email}`)
      })
    } else {
      console.log('\n⚠️  No users in database. You need to create an admin user.')
      console.log('   Run: node scripts/create-real-admin.js')
    }

    console.log('\n✅ Cleanup complete!')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

cleanupDemoData()
