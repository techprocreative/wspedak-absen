#!/usr/bin/env node

/**
 * Create Real Admin User Script
 * Removes demo users and creates real admin with actual company data
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const readline = require('readline')
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
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function createRealAdmin() {
  console.log('\n' + '='.repeat(60))
  console.log('🔐 Create Real Admin User')
  console.log('='.repeat(60))
  console.log('\nThis script will:')
  console.log('1. Remove all demo users (@test.com)')
  console.log('2. Create a real admin user with your data')
  console.log('3. Update authentication')
  console.log('\n⚠️  WARNING: This will delete all test users!\n')

  const confirm = await question('Continue? (yes/no): ')
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    rl.close()
    process.exit(0)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📝 Enter Admin User Information')
  console.log('='.repeat(60) + '\n')

  // Collect admin information
  const email = await question('Email (company email): ')
  if (!email || !email.includes('@') || email.includes('test.com')) {
    console.error('❌ Invalid email. Please use real company email.')
    rl.close()
    process.exit(1)
  }

  const password = await question('Password (min 8 characters): ')
  if (!password || password.length < 8) {
    console.error('❌ Password too short. Minimum 8 characters.')
    rl.close()
    process.exit(1)
  }

  const name = await question('Full Name: ')
  if (!name) {
    console.error('❌ Name is required.')
    rl.close()
    process.exit(1)
  }

  const department = await question('Department (default: IT): ') || 'IT'
  const position = await question('Position (default: System Administrator): ') || 'System Administrator'
  const employeeId = await question('Employee ID (default: ADM001): ') || 'ADM001'
  const phone = await question('Phone (optional, +62xxx): ') || ''

  console.log('\n' + '='.repeat(60))
  console.log('📋 Summary')
  console.log('='.repeat(60))
  console.log(`Email:       ${email}`)
  console.log(`Name:        ${name}`)
  console.log(`Department:  ${department}`)
  console.log(`Position:    ${position}`)
  console.log(`Employee ID: ${employeeId}`)
  console.log(`Phone:       ${phone || '(not provided)'}`)
  console.log('='.repeat(60) + '\n')

  const finalConfirm = await question('Create this admin user? (yes/no): ')
  if (finalConfirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    rl.close()
    process.exit(0)
  }

  rl.close()

  try {
    console.log('\n🗑️  Step 1: Removing demo users...')
    
    // Delete demo users from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .like('email', '%@test.com')

    if (deleteError) {
      console.warn('⚠️  Warning: Could not delete demo users:', deleteError.message)
    } else {
      console.log('✅ Demo users removed from database')
    }

    console.log('\n🔐 Step 2: Creating admin user in Supabase Auth...')

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'admin',
        department,
        position
      }
    })

    if (authError) {
      console.error('❌ Failed to create auth user:', authError.message)
      process.exit(1)
    }

    console.log('✅ Auth user created:', authUser.user.id)

    console.log('\n💾 Step 3: Creating user in database...')

    // Hash password for database
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        password_hash: passwordHash,
        name,
        role: 'admin',
        department,
        position,
        employee_id: employeeId,
        phone: phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Failed to create database user:', dbError.message)
      // Try to cleanup auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      process.exit(1)
    }

    console.log('✅ Database user created')

    console.log('\n' + '='.repeat(60))
    console.log('🎉 SUCCESS! Admin User Created')
    console.log('='.repeat(60))
    console.log(`\nUser ID:     ${authUser.user.id}`)
    console.log(`Email:       ${email}`)
    console.log(`Name:        ${name}`)
    console.log(`Role:        admin`)
    console.log(`Department:  ${department}`)
    console.log(`Employee ID: ${employeeId}`)
    console.log('\n✅ You can now login with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: [as entered]`)
    console.log('\n⚠️  Next Steps:')
    console.log('   1. Update README.md (remove demo credentials)')
    console.log('   2. Test login at: http://localhost:3000/admin/login')
    console.log('   3. Change password after first login')
    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Run
createRealAdmin()
