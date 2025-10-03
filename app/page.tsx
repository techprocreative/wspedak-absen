"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Camera, User, Shield, Settings, BarChart3, UserCheck, CheckCircle2, ArrowRight, Zap, MapPin } from "lucide-react"
import Link from "next/link"
import { APP_NAME, COMPANY_NAME, APP_DESCRIPTION, OFFICE_INFO } from "@/lib/app-config"
import { useClientTime } from "@/hooks/use-client-time"

export default function LandingPage() {
  const { currentTime, formatDate, formatTime, isClient } = useClientTime()
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{APP_NAME}</h1>
                <p className="text-sm text-slate-400">{COMPANY_NAME}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-emerald-500 text-emerald-400 hidden sm:flex">
                <Shield className="w-3 h-3 mr-1" />
                AI-Powered & Secure
              </Badge>
              <Link href="/admin/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <Zap className="w-3 h-3 mr-1" />
            AI Face Recognition Technology
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Smart Attendance System
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Contactless check-in with facial recognition. Fast, secure, and accurate.
          </p>
          
          {/* Current Time Display */}
          <Card className="bg-slate-800/50 border-slate-700 max-w-md mx-auto mb-8">
            <CardContent className="text-center py-6">
              <div className="text-sm text-slate-400 mb-2">
                {isClient ? formatDate(currentTime) : "Loading..."}
              </div>
              <div className="text-5xl font-mono font-bold text-emerald-400 mb-2">
                {isClient ? formatTime(currentTime) : "--:--:--"}
              </div>
              <div className="text-sm text-slate-400">
                {OFFICE_INFO.timezoneLabel}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          {/* Face Check-in Card */}
          <Link href="/face-checkin">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group h-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-2xl">
                  <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  Face Check-in
                </CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  Use AI-powered facial recognition for instant attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Contactless and hygienic</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Less than 2 seconds</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>99.8% accuracy</span>
                  </div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Start Face Check-in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Employee Dashboard Card */}
          <Link href="/employee-dashboard">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer group h-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-2xl">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  My Dashboard
                </CardTitle>
                <CardDescription className="text-slate-300 text-base">
                  View your attendance history and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Real-time attendance records</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Monthly statistics</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Download reports</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10">
                  View Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            Why Choose Our System?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <CardTitle className="text-white">Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  Check-in takes less than 2 seconds with our optimized AI face recognition engine.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">Highly Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  Your face data is encrypted with 128-dimensional vectors. No photos stored.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Location Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300">
                  GPS-based verification ensures attendance is recorded from office location.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Office Info Section */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                Office Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Work Hours</div>
                  <div className="text-white font-medium">{OFFICE_INFO.workStart} - {OFFICE_INFO.workEnd}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Break Time</div>
                  <div className="text-white font-medium">{OFFICE_INFO.breakStart} - {OFFICE_INFO.breakEnd}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm text-slate-400 mb-1">Location</div>
                  <div className="text-white font-medium">{OFFICE_INFO.name}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <h4 className="text-white font-semibold mb-3">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/face-checkin" className="text-slate-400 hover:text-emerald-400 transition-colors">
                      Face Check-in
                    </Link>
                  </li>
                  <li>
                    <Link href="/employee-dashboard" className="text-slate-400 hover:text-emerald-400 transition-colors">
                      My Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/login" className="text-slate-400 hover:text-emerald-400 transition-colors">
                      Admin Login
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3">Support</h4>
                <ul className="space-y-2">
                  <li className="text-slate-400">IT Support: ext. 1234</li>
                  <li className="text-slate-400">HR Department: ext. 5678</li>
                  <li className="text-slate-400">Email: support@company.com</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3">System Info</h4>
                <ul className="space-y-2">
                  <li className="text-slate-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>All systems operational</span>
                  </li>
                  <li className="text-slate-400">Version: 1.0.0</li>
                  <li className="text-slate-400">Updated: Dec 2024</li>
                </ul>
              </div>
            </div>
            <div className="text-center text-slate-400 text-sm pt-8 border-t border-slate-700">
              <p>&copy; {currentYear} {COMPANY_NAME}. {APP_NAME} - {APP_DESCRIPTION}</p>
              <p className="mt-2">Powered by AI Face Recognition Technology</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
