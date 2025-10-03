/**
 * Admin seeding endpoint (development/controlled use only)
 * Creates or updates an admin user in Supabase Auth and public.users.
 *
 * Security:
 * - Requires `SUPABASE_SERVICE_ROLE_KEY` to be set (server-side only).
 * - Requires `ADMIN_SEED_TOKEN` header to match process.env.ADMIN_SEED_TOKEN in production.
 * - In development, allows seeding if token is provided or `ALLOW_DEV_ADMIN_SEED=true`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type SeedBody = {
  email?: string
  password?: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const defaultEmail = process.env.ADMIN_EMAIL
    const defaultPassword = process.env.ADMIN_PASSWORD
    const defaultName = process.env.ADMIN_NAME || 'Administrator'
    const expectedToken = process.env.ADMIN_SEED_TOKEN
    const allowDevSeed = process.env.ALLOW_DEV_ADMIN_SEED === 'true'

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
      }, { status: 500 })
    }

    const authHeader = request.headers.get('x-admin-seed-token') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const isProd = process.env.NODE_ENV === 'production'

    if (isProd) {
      if (!expectedToken || !authHeader || authHeader !== expectedToken) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // In development, allow if token matches OR allowDevSeed is true
      if (expectedToken) {
        if (!authHeader || authHeader !== expectedToken) {
          if (!allowDevSeed) {
            return NextResponse.json({ error: 'Forbidden (dev)' }, { status: 403 })
          }
        }
      } else if (!allowDevSeed) {
        return NextResponse.json({ error: 'Forbidden (dev)' }, { status: 403 })
      }
    }

    const body = (await request.json().catch(() => ({}))) as SeedBody
    const email = (body.email || defaultEmail || '').trim().toLowerCase()
    const password = body.password || defaultPassword || ''
    const name = body.name || defaultName

    if (!email || !password) {
      return NextResponse.json({
        error: 'Missing admin email or password. Provide in body or set ADMIN_EMAIL and ADMIN_PASSWORD.'
      }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // 1) Try to create the auth user
    let userId: string | null = null
    let created = false
    const userMetadata = { role: 'admin', name }

    const createRes = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (createRes.error) {
      // If user already exists, try to find and update metadata
      if ((createRes.error as any).status === 422 || /already registered/i.test(createRes.error.message)) {
        // Search user by listing users (pagination limited, try first few pages)
        let found = null as null | { id: string }
        for (let page = 1; page <= 5 && !found; page++) {
          const list = await adminClient.auth.admin.listUsers({ page, perPage: 100 })
          if (list.error) break
          found = (list.data.users || []).find(u => u.email?.toLowerCase() === email) as any || null
          if (found) {
            userId = found.id
          }
        }

        if (!userId) {
          return NextResponse.json({ error: 'User already exists but could not be retrieved for update.' }, { status: 500 })
        }

        const upd = await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: userMetadata,
        })
        if (upd.error) {
          return NextResponse.json({ error: `Failed to update user metadata: ${upd.error.message}` }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: `Failed to create user: ${createRes.error.message}` }, { status: 500 })
      }
    } else {
      userId = createRes.data.user?.id || null
      created = true
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to determine user id.' }, { status: 500 })
    }

    // 2) Upsert into public.users to ensure role=admin
    const upsert = await adminClient.from('users').upsert({
      id: userId,
      email,
      name,
      role: 'admin',
      metadata: {},
    }, { onConflict: 'id' }).select('id')

    if (upsert.error) {
      return NextResponse.json({ error: `Failed to upsert public.users: ${upsert.error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created,
      userId,
      email,
      name,
      // Do not return the raw password; indicate where it came from
      passwordSource: body.password ? 'request' : (defaultPassword ? 'env' : 'unknown'),
      message: created ? 'Admin user created and seeded.' : 'Admin user ensured/updated.',
    })
  } catch (error: any) {
    console.error('Admin seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

