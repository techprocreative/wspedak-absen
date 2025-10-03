"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"

interface AdminAuthGuardProps {
  children: React.ReactNode
}

// Minimal guard: only checks whether user is logged in.
// Middleware enforces roles on the server; no need to double-check here.
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter()
  const { authState } = useAuth()

  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.replace("/admin/login")
    }
  }, [authState.isLoading, authState.isAuthenticated, router])

  // Do not block rendering with a spinner; keep UI responsive.
  // If unauthenticated after load, the effect will redirect; render nothing.
  if (!authState.isLoading && !authState.isAuthenticated) {
    return null
  }

  return <>{children}</>
}
