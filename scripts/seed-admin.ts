#!/usr/bin/env tsx

/**
 * Script to seed the admin user
 * Usage: npx tsx scripts/seed-admin.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.ADMIN_EMAIL || 'admin@teknologimaju.com'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
const adminName = process.env.ADMIN_NAME || 'Administrator'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

async function seedAdmin() {
  try {
    console.log('Seeding admin user...')
    console.log(`Email: ${adminEmail}`)
    console.log(`Name: ${adminName}`)
    
    const adminClient = createClient(supabaseUrl as string, serviceRoleKey as string, {
      auth: { persistSession: false },
    })

    // 1) Try to create the auth user
    let userId: string | null = null
    let created = false
    const userMetadata = { role: 'admin', name: adminName }

    const createRes = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (createRes.error) {
      // If user already exists, try to find and update metadata
      if ((createRes.error as any).status === 422 || /already registered/i.test(createRes.error.message)) {
        console.log('Admin user already exists, updating metadata...')
        
        // Search user by listing users (pagination limited, try first few pages)
        let found = null as null | { id: string }
        for (let page = 1; page <= 5 && !found; page++) {
          const list = await adminClient.auth.admin.listUsers({ page, perPage: 100 })
          if (list.error) break
          found = (list.data.users || []).find(u => u.email?.toLowerCase() === adminEmail) as any || null
          if (found) {
            userId = found.id
          }
        }

        if (!userId) {
          console.error('User already exists but could not be retrieved for update.')
          process.exit(1)
        }

        const upd = await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: userMetadata,
        })
        if (upd.error) {
          console.error(`Failed to update user metadata: ${upd.error.message}`)
          process.exit(1)
        }
        
        console.log('Admin user metadata updated successfully.')
      } else {
        console.error(`Failed to create user: ${createRes.error.message}`)
        process.exit(1)
      }
    } else {
      userId = createRes.data.user?.id || null
      created = true
      console.log('Admin user created successfully.')
    }

    if (!userId) {
      console.error('Failed to determine user id.')
      process.exit(1)
    }

    // 2) Upsert into public.users to ensure role=admin
    const upsert = await adminClient.from('users').upsert({
      id: userId,
      email: adminEmail,
      name: adminName,
      role: 'admin',
      metadata: {},
    }, { onConflict: 'id' }).select('id')

    if (upsert.error) {
      console.error(`Failed to upsert public.users: ${upsert.error.message}`)
      process.exit(1)
    }

    console.log('Admin user seeded successfully!')
    console.log(`User ID: ${userId}`)
    console.log(`Email: ${adminEmail}`)
    console.log(`Password: ${adminPassword}`)
    console.log(`Name: ${adminName}`)
    console.log(`Status: ${created ? 'Created' : 'Updated'}`)
    
  } catch (error: any) {
    console.error('Admin seed error:', error)
    process.exit(1)
  }
}

seedAdmin()