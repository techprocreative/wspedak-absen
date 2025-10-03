"use client"

export const dynamic = 'force-dynamic'

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminForm, FormField, FormSection } from "@/components/admin/AdminForm"
import { ConfirmModal, useConfirmModal } from "@/components/admin/ConfirmModal"
// Layout is provided by app/admin/layout.tsx
import { SettingsInput, settingsSchema } from "@/lib/validation-schemas"
import { Save, Building, Clock, Shield, Bell, Mail, Smartphone, Globe, Key, Users, AlertTriangle, CheckCircle } from "lucide-react"
import { z } from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Define the settings interface
interface SettingsData {
  company: {
    name: string
    logo?: string
    address?: string
    phone?: string
    email?: string
    timezone?: string
  }
  attendance: {
    checkInRadius?: number
    allowRemoteCheckIn?: boolean
    requirePhoto?: boolean
    requireLocation?: boolean
    workingHours?: {
      start: string
      end: string
      breakDuration?: number
    }
    overtimeSettings?: {
      enabled?: boolean
      maxDailyHours?: number
      requireApproval?: boolean
    }
  }
  security: {
    sessionTimeout?: number
    maxLoginAttempts?: number
    lockoutDuration?: number
    passwordPolicy?: {
      minLength?: number
      requireUppercase?: boolean
      requireLowercase?: boolean
      requireNumbers?: boolean
      requireSpecialChars?: boolean
      maxAge?: number
    }
  }
  notifications: {
    email?: {
      enabled?: boolean
      smtpHost?: string
      smtpPort?: number
      smtpUser?: string
      smtpPassword?: string
      fromEmail?: string
      fromName?: string
    }
    push?: {
      enabled?: boolean
      serverKey?: string
    }
    inApp?: {
      enabled?: boolean
      soundEnabled?: boolean
      vibrationEnabled?: boolean
    }
  }
  mobile?: {
    appVersion?: string
    forceUpdate?: boolean
    maintenanceMode?: boolean
    maintenanceMessage?: string
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { confirm, ConfirmModal } = useConfirmModal()
  
  // State management
  const [settings, setSettings] = useState<SettingsData>({
    company: {
      name: "",
      logo: "",
      address: "",
      phone: "",
      email: "",
      timezone: "Asia/Jakarta",
    },
    attendance: {
      checkInRadius: 100,
      allowRemoteCheckIn: false,
      requirePhoto: true,
      requireLocation: true,
      workingHours: {
        start: "08:00",
        end: "17:00",
        breakDuration: 60,
      },
      overtimeSettings: {
        enabled: false,
        maxDailyHours: 10,
        requireApproval: true,
      },
    },
    security: {
      sessionTimeout: 480,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
      },
    },
    notifications: {
      email: {
        enabled: true,
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPassword: "",
        fromEmail: "",
        fromName: "",
      },
      push: {
        enabled: true,
        serverKey: "",
      },
      inApp: {
        enabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
      },
    },
    mobile: {
      appVersion: "1.0.0",
      forceUpdate: false,
      maintenanceMode: false,
      maintenanceMessage: "",
    },
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("company")
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Fetch settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/settings", { credentials: 'include', cache: 'no-store' })
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.data || settings)
      } else {
        console.error("Failed to fetch settings:", data.error)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle settings update
  const handleUpdateSettings = async (section: string, sectionData: any) => {
    try {
      setSaving(true)
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          section,
          data: sectionData,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          [section]: sectionData,
        }))
        setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else {
        console.error("Failed to update settings:", data.error)
        setSaveStatus("error")
        setTimeout(() => setSaveStatus("idle"), 3000)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Handle settings reset
  const handleResetSettings = async (section: string) => {
    const confirmed = await confirm({
      title: "Reset Pengaturan",
      description: `Apakah Anda yakin ingin mereset pengaturan ${section} ke nilai default? Tindakan ini tidak dapat dibatalkan.`,
      variant: "destructive",
      confirmText: "Reset",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/settings/${section}/reset`, {
            method: "POST",
            credentials: 'include',
            cache: 'no-store',
          })
          
          const data = await response.json()
          
          if (data.success) {
            fetchSettings()
          } else {
            console.error("Failed to reset settings:", data.error)
          }
        } catch (error) {
          console.error("Error resetting settings:", error)
        }
      },
    })
  }

  // Define form fields for company settings
  const companyFormFields: FormSection[] = [
    {
      title: "Informasi Perusahaan",
      fields: [
        {
          name: "name",
          label: "Nama Perusahaan",
          type: "text",
          placeholder: "Masukkan nama perusahaan",
          required: true,
        },
        {
          name: "logo",
          label: "Logo URL",
          type: "text",
          placeholder: "Masukkan URL logo",
        },
        {
          name: "address",
          label: "Alamat",
          type: "textarea",
          placeholder: "Masukkan alamat perusahaan",
        },
        {
          name: "phone",
          label: "Telepon",
          type: "text",
          placeholder: "Masukkan nomor telepon",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          placeholder: "Masukkan email perusahaan",
        },
        {
          name: "timezone",
          label: "Zona Waktu",
          type: "select",
          options: [
            { label: "Asia/Jakarta", value: "Asia/Jakarta" },
            { label: "Asia/Makassar", value: "Asia/Makassar" },
            { label: "Asia/Jayapura", value: "Asia/Jayapura" },
            { label: "UTC", value: "UTC" },
          ],
        },
      ],
    },
  ]

  // Define form fields for attendance settings
  const attendanceFormFields: FormSection[] = [
    {
      title: "Pengaturan Absensi",
      fields: [
        {
          name: "checkInRadius",
          label: "Radius Check In (meter)",
          type: "number",
          placeholder: "Masukkan radius check in",
        },
        {
          name: "allowRemoteCheckIn",
          label: "Izinkan Check In Jarak Jauh",
          type: "checkbox",
        },
        {
          name: "requirePhoto",
          label: "Wajib Foto",
          type: "checkbox",
        },
        {
          name: "requireLocation",
          label: "Wajib Lokasi",
          type: "checkbox",
        },
      ],
    },
    {
      title: "Jam Kerja",
      fields: [
        {
          name: "workingHours.start",
          label: "Waktu Mulai",
          type: "text",
          placeholder: "08:00",
        },
        {
          name: "workingHours.end",
          label: "Waktu Selesai",
          type: "text",
          placeholder: "17:00",
        },
        {
          name: "workingHours.breakDuration",
          label: "Durasi Istirahat (menit)",
          type: "number",
          placeholder: "60",
        },
      ],
    },
    {
      title: "Pengaturan Lembur",
      fields: [
        {
          name: "overtimeSettings.enabled",
          label: "Aktifkan Lembur",
          type: "checkbox",
        },
        {
          name: "overtimeSettings.maxDailyHours",
          label: "Maksimal Jam Kerja Harian",
          type: "number",
          placeholder: "10",
        },
        {
          name: "overtimeSettings.requireApproval",
          label: "Wajib Persetujuan",
          type: "checkbox",
        },
      ],
    },
  ]

  // Define form fields for security settings
  const securityFormFields: FormSection[] = [
    {
      title: "Pengaturan Sesi",
      fields: [
        {
          name: "sessionTimeout",
          label: "Timeout Sesi (menit)",
          type: "number",
          placeholder: "480",
        },
        {
          name: "maxLoginAttempts",
          label: "Maksimal Percobaan Login",
          type: "number",
          placeholder: "5",
        },
        {
          name: "lockoutDuration",
          label: "Durasi Lockout (menit)",
          type: "number",
          placeholder: "15",
        },
      ],
    },
    {
      title: "Kebijakan Password",
      fields: [
        {
          name: "passwordPolicy.minLength",
          label: "Panjang Minimum",
          type: "number",
          placeholder: "8",
        },
        {
          name: "passwordPolicy.requireUppercase",
          label: "Wajib Huruf Besar",
          type: "checkbox",
        },
        {
          name: "passwordPolicy.requireLowercase",
          label: "Wajib Huruf Kecil",
          type: "checkbox",
        },
        {
          name: "passwordPolicy.requireNumbers",
          label: "Wajib Angka",
          type: "checkbox",
        },
        {
          name: "passwordPolicy.requireSpecialChars",
          label: "Wajib Karakter Khusus",
          type: "checkbox",
        },
        {
          name: "passwordPolicy.maxAge",
          label: "Maksimal Umur Password (hari)",
          type: "number",
          placeholder: "90",
        },
      ],
    },
  ]

  // Define form fields for notification settings
  const notificationFormFields: FormSection[] = [
    {
      title: "Email",
      fields: [
        {
          name: "email.enabled",
          label: "Aktifkan Notifikasi Email",
          type: "checkbox",
        },
        {
          name: "email.smtpHost",
          label: "SMTP Host",
          type: "text",
          placeholder: "smtp.example.com",
        },
        {
          name: "email.smtpPort",
          label: "SMTP Port",
          type: "number",
          placeholder: "587",
        },
        {
          name: "email.smtpUser",
          label: "SMTP User",
          type: "text",
          placeholder: "user@example.com",
        },
        {
          name: "email.smtpPassword",
          label: "SMTP Password",
          type: "password",
          placeholder: "Masukkan password",
        },
        {
          name: "email.fromEmail",
          label: "Email Pengirim",
          type: "email",
          placeholder: "noreply@example.com",
        },
        {
          name: "email.fromName",
          label: "Nama Pengirim",
          type: "text",
          placeholder: "Nama Perusahaan",
        },
      ],
    },
    {
      title: "Push Notification",
      fields: [
        {
          name: "push.enabled",
          label: "Aktifkan Push Notification",
          type: "checkbox",
        },
        {
          name: "push.serverKey",
          label: "Server Key",
          type: "password",
          placeholder: "Masukkan server key",
        },
      ],
    },
    {
      title: "In-App Notification",
      fields: [
        {
          name: "inApp.enabled",
          label: "Aktifkan Notifikasi In-App",
          type: "checkbox",
        },
        {
          name: "inApp.soundEnabled",
          label: "Aktifkan Suara",
          type: "checkbox",
        },
        {
          name: "inApp.vibrationEnabled",
          label: "Aktifkan Getaran",
          type: "checkbox",
        },
      ],
    },
  ]

  // Define form fields for mobile settings
  const mobileFormFields: FormSection[] = [
    {
      title: "Pengaturan Aplikasi",
      fields: [
        {
          name: "appVersion",
          label: "Versi Aplikasi",
          type: "text",
          placeholder: "1.0.0",
        },
        {
          name: "forceUpdate",
          label: "Paksa Update",
          type: "checkbox",
        },
        {
          name: "maintenanceMode",
          label: "Mode Pemeliharaan",
          type: "checkbox",
        },
        {
          name: "maintenanceMessage",
          label: "Pesan Pemeliharaan",
          type: "textarea",
          placeholder: "Masukkan pesan pemeliharaan",
        },
      ],
    },
  ]

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <div className="space-y-6">
      <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
              <p className="text-slate-400">Kelola pengaturan sistem</p>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "success" && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Berhasil disimpan</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Gagal menyimpan</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-800/50 border-slate-700 grid grid-cols-5 w-full">
              <TabsTrigger value="company" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Building className="w-4 h-4 mr-2" />
                Perusahaan
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Clock className="w-4 h-4 mr-2" />
                Absensi
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Shield className="w-4 h-4 mr-2" />
                Keamanan
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Bell className="w-4 h-4 mr-2" />
                Notifikasi
              </TabsTrigger>
              <TabsTrigger value="mobile" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile
              </TabsTrigger>
            </TabsList>

            {/* Company Tab */}
            <TabsContent value="company" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Pengaturan Perusahaan
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetSettings("company")}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Reset
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminForm
                    schema={z.object({})} // Simple schema for now
                    sections={companyFormFields}
                    onSubmit={(data) => handleUpdateSettings("company", data)}
                    initialData={settings.company}
                    submitText="Simpan Pengaturan"
                    loading={saving}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Pengaturan Absensi
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetSettings("attendance")}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Reset
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminForm
                    schema={z.object({})} // Simple schema for now
                    sections={attendanceFormFields}
                    onSubmit={(data) => handleUpdateSettings("attendance", data)}
                    initialData={settings.attendance}
                    submitText="Simpan Pengaturan"
                    loading={saving}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Pengaturan Keamanan
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetSettings("security")}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Reset
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminForm
                    schema={z.object({})} // Simple schema for now
                    sections={securityFormFields}
                    onSubmit={(data) => handleUpdateSettings("security", data)}
                    initialData={settings.security}
                    submitText="Simpan Pengaturan"
                    loading={saving}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Pengaturan Notifikasi
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetSettings("notifications")}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Reset
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminForm
                    schema={z.object({})} // Simple schema for now
                    sections={notificationFormFields}
                    onSubmit={(data) => handleUpdateSettings("notifications", data)}
                    initialData={settings.notifications}
                    submitText="Simpan Pengaturan"
                    loading={saving}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mobile Tab */}
            <TabsContent value="mobile" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5" />
                      Pengaturan Mobile
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetSettings("mobile")}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Reset
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminForm
                    schema={z.object({})} // Simple schema for now
                    sections={mobileFormFields}
                    onSubmit={(data) => handleUpdateSettings("mobile", data)}
                    initialData={settings.mobile}
                    submitText="Simpan Pengaturan"
                    loading={saving}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Confirm Modal */}
        <ConfirmModal />
        </div>
  )
}
