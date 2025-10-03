"use client"

export const dynamic = 'force-dynamic'

import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"
import { Shield } from "lucide-react"
import { APP_NAME, COMPANY_NAME } from "@/lib/app-config"

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-slate-400">{APP_NAME} {COMPANY_NAME}</p>
        </div>

        {/* Login Form */}
        <LoginForm
          title="Masuk sebagai Admin"
          description="Masukkan kredensial admin untuk mengakses dashboard"
          redirectTo="/admin/dashboard"
          showDemoCredentials={false}
        />

        {/* Back to Main */}
        <div className="text-center mt-6">
          <Link href="/" className="text-slate-400 hover:text-emerald-400 text-sm transition-colors">
            ← Kembali ke Halaman Absensi
          </Link>
        </div>
      </div>
    </div>
  )
}
