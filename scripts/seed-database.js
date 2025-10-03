#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the database with test users
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

// Hash password (admin123)
const PASSWORD_HASH = '$2a$10$YPZ3V3qGQXKnFCZYvWqGXeqp1N.zK8Oq0p7LmQv7HvQqP0UmqLqYe'

const seedUsers = [
  {
    email: 'admin@test.com',
    password_hash: PASSWORD_HASH,
    name: 'System Administrator',
    role: 'admin',
    department: 'IT',
    position: 'System Administrator',
    employee_id: 'ADM001',
    phone: '+62123456789',
    is_active: true
  },
  {
    email: 'hr@test.com',
    password_hash: PASSWORD_HASH,
    name: 'HR Manager',
    role: 'hr',
    department: 'Human Resources',
    position: 'HR Manager',
    employee_id: 'HR001',
    phone: '+62123456788',
    is_active: true
  },
  {
    email: 'manager@test.com',
    password_hash: PASSWORD_HASH,
    name: 'Department Manager',
    role: 'manager',
    department: 'Engineering',
    position: 'Engineering Manager',
    employee_id: 'MGR001',
    phone: '+62123456787',
    is_active: true
  },
  {
    email: 'employee@test.com',
    password_hash: PASSWORD_HASH,
    name: 'Test Employee',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Developer',
    employee_id: 'EMP001',
    phone: '+62123456786',
    is_active: true
  }
]

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Check connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('❌ Database connection failed:', testError.message)
      process.exit(1)
    }

    console.log('✅ Database connected successfully\n')

    // Seed users
    let successCount = 0
    let skipCount = 0

    for (const user of seedUsers) {
      // Check if user exists
      const { data: existing } = await supabase
        .from('users')
        .select('email')
        .eq('email', user.email)
        .maybeSingle()

      if (existing) {
        console.log(`⏭️  Skipped: ${user.email} (already exists)`)
        skipCount++
        continue
      }

      // Insert user
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()

      if (error) {
        console.error(`❌ Failed to create ${user.email}:`, error.message)
      } else {
        console.log(`✅ Created: ${user.email} (${user.role})`)
        successCount++
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Seeding Summary:')
    console.log(`   ✅ Created: ${successCount} users`)
    console.log(`   ⏭️  Skipped: ${skipCount} users`)
    console.log('='.repeat(50))

    // Display credentials
    if (successCount > 0) {
      console.log('\n📝 Test Credentials:')
      console.log('   Email: admin@test.com')
      console.log('   Password: admin123')
      console.log('\n   Other test accounts:')
      console.log('   - hr@test.com / admin123')
      console.log('   - manager@test.com / admin123')
      console.log('   - employee@test.com / admin123')
    }

    console.log('\n🎉 Database seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run seeding
seedDatabase()
