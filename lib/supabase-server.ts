import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create Supabase client for server-side operations
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

// Create Supabase client with user session
export async function createServerSupabaseClientWithAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')
  const refreshToken = cookieStore.get('sb-refresh-token')
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken.value}`
      } : {}
    }
  })
  
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value
    })
  }
  
  return supabase
}

// Get current user session
export async function getServerSession() {
  const supabase = await createServerSupabaseClientWithAuth()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }
  
  return session
}

// Check if user is authenticated and is admin
export async function checkAdminAuth() {
  const session = await getServerSession()
  
  if (!session) {
    return { authenticated: false, isAdmin: false, userId: null }
  }
  
  const supabase = createServerSupabaseClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, email, name')
    .eq('id', session.user.id)
    .single()
  
  if (error || !user) {
    return { authenticated: true, isAdmin: false, userId: session.user.id }
  }
  
  const isAdmin = ['admin', 'hr'].includes(user.role)
  
  return {
    authenticated: true,
    isAdmin,
    userId: user.id,
    userRole: user.role,
    userEmail: user.email,
    userName: user.name
  }
}
