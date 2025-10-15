#!/usr/bin/env node

/**
 * Quick Setup Admin - Non-Interactive Version
 * Edit the ADMIN_CONFIG below, then run: node scripts/quick-setup-admin.js
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

// ============================================
// 🔧 EDIT THESE VALUES BEFORE RUNNING
// ============================================
const ADMIN_CONFIG = {
  email: 'admin@yourcompany.com',           // ⚠️ CHANGE THIS
  password: 'ChangeMe123!',                 // ⚠️ CHANGE THIS  
  name: 'System Administrator',             // ⚠️ CHANGE THIS
  department: 'IT',
  position: 'System Administrator',
  employeeId: 'ADM001',
  phone: '+6281234567890'                   // Optional
}
// ============================================

// Validation
if (ADMIN_CONFIG.email === 'admin@yourcompany.com' || 
    ADMIN_CONFIG.password === 'ChangeMe123!') {
  console.error('\n❌ ERROR: Please edit ADMIN_CONFIG in this file first!')
  console.error('   Open: scripts/quick-setup-admin.js')
  console.error('   Change email and password values\n')
  process.exit(1)
}

if (!ADMIN_CONFIG.email.includes('@') || ADMIN_CONFIG.email.includes('test.com')) {
  console.error('❌ Invalid email. Use real company email.')
  process.exit(1)
}

if (ADMIN_CONFIG.password.length < 8) {
  console.error('❌ Password too short. Minimum 8 characters.')
  process.exit(1)
}

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
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function quickSetupAdmin() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 Quick Admin Setup')
  console.log('='.repeat(60))
  console.log('\n📋 Configuration:')
  console.log(`   Email:       ${ADMIN_CONFIG.email}`)
  console.log(`   Name:        ${ADMIN_CONFIG.name}`)
  console.log(`   Department:  ${ADMIN_CONFIG.department}`)
  console.log(`   Position:    ${ADMIN_CONFIG.position}`)
  console.log(`   Employee ID: ${ADMIN_CONFIG.employeeId}`)
  console.log(`   Phone:       ${ADMIN_CONFIG.phone || '(not provided)'}`)
  console.log('')

  try {
    // Step 1: Remove demo users
    console.log('🗑️  Step 1/4: Removing demo users...')
    const { data: demoUsers } = await supabase
      .from('users')
      .select('email')
      .like('email', '%@test.com')

    if (demoUsers && demoUsers.length > 0) {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .like('email', '%@test.com')

      if (deleteError) {
        console.warn('⚠️  Warning:', deleteError.message)
      } else {
        console.log(`✅ Removed ${demoUsers.length} demo users`)
      }
    } else {
      console.log('✅ No demo users found')
    }

    // Step 2: Check if user already exists
    console.log('\n🔍 Step 2/4: Checking existing users...')
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', ADMIN_CONFIG.email)
      .single()

    if (existingUser) {
      console.error(`❌ User already exists: ${ADMIN_CONFIG.email}`)
      console.log('   Choose a different email or delete existing user first.')
      process.exit(1)
    }
    console.log('✅ Email available')

    // Step 3: Create Supabase Auth user
    console.log('\n🔐 Step 3/4: Creating auth user...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_CONFIG.email,
      password: ADMIN_CONFIG.password,
      email_confirm: true,
      user_metadata: {
        name: ADMIN_CONFIG.name,
        role: 'admin',
        department: ADMIN_CONFIG.department,
        position: ADMIN_CONFIG.position
      }
    })

    if (authError) {
      console.error('❌ Auth error:', authError.message)
      process.exit(1)
    }
    console.log('✅ Auth user created:', authUser.user.id)

    // Step 4: Create database user
    console.log('\n💾 Step 4/4: Creating database user...')
    const passwordHash = await bcrypt.hash(ADMIN_CONFIG.password, 10)

    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: ADMIN_CONFIG.email,
        password_hash: passwordHash,
        name: ADMIN_CONFIG.name,
        role: 'admin',
        department: ADMIN_CONFIG.department,
        position: ADMIN_CONFIG.position,
        employee_id: ADMIN_CONFIG.employeeId,
        phone: ADMIN_CONFIG.phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('❌ Database error:', dbError.message)
      // Cleanup auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      process.exit(1)
    }
    console.log('✅ Database user created')

    // Success!
    console.log('\n' + '='.repeat(60))
    console.log('🎉 SUCCESS! Admin User Created')
    console.log('='.repeat(60))
    console.log(`\nLogin Credentials:`)
    console.log(`   Email:    ${ADMIN_CONFIG.email}`)
    console.log(`   Password: ${ADMIN_CONFIG.password}`)
    console.log(`\n🌐 Login at: http://localhost:3000/admin/login`)
    console.log('\n⚠️  Next Steps:')
    console.log('   1. Test login with the credentials above')
    console.log('   2. Change password after first login')
    console.log('   3. Remove demo credentials from README.md')
    console.log('   4. Delete this script or change the password in config')
    console.log('\n' + '='.repeat(60) + '\n')

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run
quickSetupAdmin()
