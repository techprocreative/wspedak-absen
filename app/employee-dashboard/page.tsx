"use client"

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the main employee dashboard
export default function EmployeeDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the full-featured employee dashboard
    router.push('/employee/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
