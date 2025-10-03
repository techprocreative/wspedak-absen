#!/usr/bin/env node

/**
 * User Verification Script
 * Checks if test users exist in database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
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
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyUsers() {
  console.log('🔍 Verifying users in database...\n')

  try {
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, department, employee_id, is_active')
      .order('role', { ascending: false })

    if (error) {
      console.error('❌ Query failed:', error.message)
      process.exit(1)
    }

    console.log('✅ Database query successful\n')

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in database!')
      console.log('\n💡 Run this command to seed users:')
      console.log('   node scripts/seed-database.js')
      process.exit(0)
    }

    console.log('═'.repeat(80))
    console.log('                           USERS IN DATABASE')
    console.log('═'.repeat(80))
    console.log('')

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`)
      console.log(`   Email:       ${user.email}`)
      console.log(`   Role:        ${user.role}`)
      console.log(`   Department:  ${user.department}`)
      console.log(`   Employee ID: ${user.employee_id}`)
      console.log(`   Status:      ${user.is_active ? '✅ Active' : '❌ Inactive'}`)
      console.log(`   User ID:     ${user.id}`)
      console.log('')
    })

    console.log('═'.repeat(80))
    console.log(`\n📊 Total users: ${users.length}`)
    
    // Count by role
    const roleCounts = {}
    users.forEach(user => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1
    })
    
    console.log('\n📈 Users by role:')
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`)
    })

    // Show test credentials
    console.log('\n🔑 Test Credentials:')
    console.log('   Password for all test accounts: admin123')
    console.log('')
    console.log('   admin@test.com      - Full system access')
    console.log('   hr@test.com         - HR management')
    console.log('   manager@test.com    - Team management')
    console.log('   employee@test.com   - Employee self-service')

    console.log('\n✅ Verification complete!')
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  }
}

// Run verification
verifyUsers()
