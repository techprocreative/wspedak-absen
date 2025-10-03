#!/usr/bin/env node

/**
 * Register Users to Supabase Auth
 * Creates auth users and links them to users table
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

const testUsers = [
  {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin',
    department: 'IT',
    position: 'System Administrator',
    employee_id: 'ADM001'
  },
  {
    email: 'hr@test.com',
    password: 'admin123',
    name: 'HR Manager',
    role: 'hr',
    department: 'Human Resources',
    position: 'HR Manager',
    employee_id: 'HR001'
  },
  {
    email: 'manager@test.com',
    password: 'admin123',
    name: 'Department Manager',
    role: 'manager',
    department: 'Engineering',
    position: 'Engineering Manager',
    employee_id: 'MGR001'
  },
  {
    email: 'employee@test.com',
    password: 'admin123',
    name: 'Test Employee',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Developer',
    employee_id: 'EMP001'
  }
]

async function registerAuthUsers() {
  console.log('🔐 Registering users to Supabase Auth...\n')

  try {
    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const user of testUsers) {
      console.log(`Processing: ${user.email}...`)

      // Check if auth user already exists
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error(`❌ Error checking auth users:`, listError.message)
        continue
      }

      const existingAuthUser = existingUsers.users?.find(u => u.email === user.email)

      if (existingAuthUser) {
        console.log(`⏭️  Skipped: ${user.email} (auth user already exists)`)
        skipCount++
        
        // Update user metadata if needed
        try {
          await supabase.auth.admin.updateUserById(existingAuthUser.id, {
            user_metadata: {
              name: user.name,
              role: user.role
            }
          })
          console.log(`   ↳ Updated metadata for ${user.email}`)
        } catch (updateError) {
          console.log(`   ↳ Could not update metadata (may already be set)`)
        }
        
        continue
      }

      // Create auth user
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: user.name,
            role: user.role
          }
        })

        if (authError) {
          console.error(`❌ Failed to create auth user ${user.email}:`, authError.message)
          errorCount++
          continue
        }

        console.log(`✅ Created auth user: ${user.email}`)

        // Check if user exists in users table
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()

        if (!dbUser) {
          // Create user in users table with the same ID
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: authData.user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              department: user.department,
              position: user.position,
              employee_id: user.employee_id,
              is_active: true
            }])

          if (insertError) {
            console.error(`   ⚠️  Warning: Could not create user in users table:`, insertError.message)
          } else {
            console.log(`   ↳ Created user in users table`)
          }
        } else {
          // Update existing user in users table with auth ID
          const { error: updateError } = await supabase
            .from('users')
            .update({ id: authData.user.id })
            .eq('email', user.email)

          if (updateError) {
            console.log(`   ↳ User already exists in users table with different ID`)
          } else {
            console.log(`   ↳ Updated user ID in users table`)
          }
        }

        successCount++
      } catch (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message)
        errorCount++
      }

      console.log('')
    }

    // Summary
    console.log('='.repeat(60))
    console.log('📊 Registration Summary:')
    console.log(`   ✅ Created: ${successCount} users`)
    console.log(`   ⏭️  Skipped: ${skipCount} users (already exist)`)
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} users`)
    }
    console.log('='.repeat(60))

    if (successCount > 0 || skipCount > 0) {
      console.log('\n✅ Users are now registered in Supabase Auth!')
      console.log('\n📝 You can now login with these credentials:')
      console.log('   Email: admin@test.com')
      console.log('   Password: admin123')
      console.log('\n   Other accounts:')
      console.log('   - hr@test.com / admin123')
      console.log('   - manager@test.com / admin123')
      console.log('   - employee@test.com / admin123')
      console.log('\n💡 Tip: You can view auth users in Supabase Dashboard → Authentication → Users')
    }

    console.log('\n🎉 Auth registration completed!')
  } catch (error) {
    console.error('❌ Registration failed:', error)
    process.exit(1)
  }
}

// Run registration
registerAuthUsers()
