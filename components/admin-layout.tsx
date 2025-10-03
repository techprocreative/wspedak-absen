"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Shield, LayoutDashboard, Users, Clock, BarChart3, Calendar, Settings, LogOut, Menu, Bell, Database } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { APP_NAME, COMPANY_NAME } from "@/lib/app-config"
import Link from "next/link"

interface AdminLayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    current: false,
  },
  {
    name: "Kelola Karyawan",
    href: "/admin/employees",
    icon: Users,
    current: false,
  },
  {
    name: "Data Absensi",
    href: "/admin/attendance",
    icon: Clock,
    current: false,
  },
  {
    name: "Laporan",
    href: "/admin/reports",
    icon: BarChart3,
    current: false,
  },
  {
    name: "Jadwal Kerja",
    href: "/admin/schedules",
    icon: Calendar,
    current: false,
  },
  {
    name: "Data Management",
    href: "/admin/data-management",
    icon: Database,
    current: false,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    current: false,
  },
  {
    name: "Pengaturan",
    href: "/admin/settings",
    icon: Settings,
    current: false,
  },
]

// Prevent nested/double layout rendering when wrapped twice
const AdminLayoutContext = createContext<boolean>(false)

export function AdminLayout({ children }: AdminLayoutProps) {
  const isNested = useContext(AdminLayoutContext)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { authState, logout } = useAuth()

  // Prefetch admin routes to speed up first navigation clicks (especially in dev)
  useEffect(() => {
    try {
      navigation.forEach((item) => {
        // next/navigation router supports prefetch
        // Prefetch is a no-op if already cached
        router.prefetch?.(item.href)
      })
    } catch (_) {
      // Non-fatal in environments where prefetch is unsupported
    }
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  const currentNav = navigation.map((item) => ({
    ...item,
    current: pathname === item.href,
  }))

  // If already inside an AdminLayout, just render children (no chrome)
  if (isNested) {
    return <>{children}</>
  }

  return (
    <AdminLayoutContext.Provider value={true}>
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-slate-900/50 backdrop-blur-sm border-r border-slate-700">
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-700">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">{COMPANY_NAME}</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {currentNav.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={() => router.push(item.href)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.current ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              {/* Mobile sidebar trigger */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden text-slate-300 hover:bg-slate-800">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 bg-slate-900 border-slate-700">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 px-4 py-6 border-b border-slate-700">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                        <p className="text-xs text-slate-400">{COMPANY_NAME}</p>
                      </div>
                    </div>

                    <nav className="flex-1 px-4 py-6">
                      <ul className="space-y-2">
                        {currentNav.map((item) => (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              prefetch={false}
                              onClick={() => { setSidebarOpen(false); router.push(item.href) }}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                item.current
                                  ? "bg-emerald-600 text-white"
                                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              <item.icon className="w-5 h-5" />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              <div>
                <h1 className="text-xl font-bold text-white">
                  {currentNav.find((item) => item.current)?.name || "Dashboard"}
                </h1>
                <p className="text-sm text-slate-400">{APP_NAME} {COMPANY_NAME}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-slate-800 relative">
                <Bell className="w-5 h-5" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500 text-white text-xs">3</Badge>
              </Button>

              <div className="text-right">
                <p className="text-white font-medium">{authState.user?.name || authState.user?.email}</p>
                <p className="text-xs text-slate-400 capitalize">{authState.user?.role}</p>
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main key={pathname} className="p-6">{children}</main>
      </div>
    </div>
    </AdminLayoutContext.Provider>
  )
}
