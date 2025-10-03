"use client"

export const dynamic = 'force-dynamic'

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminDataTable, Column, Action } from "@/components/admin/AdminDataTable"
import { AdminForm, FormField, FormSection } from "@/components/admin/AdminForm"
import { ConfirmModal, useConfirmModal } from "@/components/admin/ConfirmModal"
import { ExportButton, ExportOption } from "@/components/admin/ExportButton"
import { SearchFilter, FilterOption } from "@/components/admin/SearchFilter"
// Layout is provided by app/admin/layout.tsx
import { Plus, Edit, Trash2, Eye, Calendar, Clock, Users, MapPin, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { z } from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

// Define the schedule interface for the table
interface ScheduleWithId {
  id: string
  name: string
  type: 'regular' | 'overtime' | 'holiday' | 'weekend' | 'special'
  description?: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location?: {
    name: string
    address: string
    latitude: number
    longitude: number
    radius: number
  }
  assignedUsers: string[]
  assignedDepartments: string[]
  isActive: boolean
  isRecurring: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    daysOfWeek?: number[]
    dayOfMonth?: number
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Define the schedule assignment interface
interface ScheduleAssignmentWithId {
  id: string
  scheduleId: string
  userId: string
  date: string
  status: 'assigned' | 'confirmed' | 'completed' | 'absent' | 'cancelled'
  checkInTime?: string
  checkOutTime?: string
  notes?: string
  user?: {
    id: string
    name: string
    email: string
    role: string
    department: string
  }
  schedule?: {
    id: string
    name: string
    type: string
    startTime: string
    endTime: string
    location?: {
      name: string
      address: string
    }
  }
}

export default function SchedulesPage() {
  const router = useRouter()
  const { confirm, ConfirmModal } = useConfirmModal()
  
  // State management
  const [schedules, setSchedules] = useState<ScheduleWithId[]>([])
  const [scheduleAssignments, setScheduleAssignments] = useState<ScheduleAssignmentWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("schedules")
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithId | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignmentWithId | null>(null)

  // Fetch schedules from API
  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/schedules")
      const data = await response.json()
      
      if (data.success) {
        setSchedules(data.data || [])
      } else {
        console.error("Failed to fetch schedules:", data.error)
      }
    } catch (error) {
      console.error("Error fetching schedules:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch schedule assignments from API
  const fetchScheduleAssignments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/schedules/assignments")
      const data = await response.json()
      
      if (data.success) {
        setScheduleAssignments(data.data || [])
      } else {
        console.error("Failed to fetch schedule assignments:", data.error)
      }
    } catch (error) {
      console.error("Error fetching schedule assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle schedule creation
  const handleCreateSchedule = async (scheduleData: any) => {
    try {
      const response = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateModalOpen(false)
        fetchSchedules()
      } else {
        console.error("Failed to create schedule:", data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error creating schedule:", error)
      throw error
    }
  }

  // Handle schedule update
  const handleUpdateSchedule = async (scheduleData: any) => {
    if (!selectedSchedule) return
    
    try {
      const response = await fetch(`/api/admin/schedules/${selectedSchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEditModalOpen(false)
        setSelectedSchedule(null)
        fetchSchedules()
      } else {
        console.error("Failed to update schedule:", data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error updating schedule:", error)
      throw error
    }
  }

  // Handle schedule deletion
  const handleDeleteSchedule = async (schedule: ScheduleWithId) => {
    const confirmed = await confirm({
      title: "Hapus Jadwal",
      description: `Apakah Anda yakin ingin menghapus jadwal "${schedule.name}"? Tindakan ini tidak dapat dibatalkan.`,
      variant: "destructive",
      confirmText: "Hapus",
      onConfirm: async () => {
        const response = await fetch(`/api/admin/schedules/${schedule.id}`, {
          method: "DELETE",
        })
        
        const data = await response.json()
        
        if (data.success) {
          fetchSchedules()
        } else {
          console.error("Failed to delete schedule:", data.error)
        }
      },
    })
  }

  // Handle schedule assignment update
  const handleUpdateAssignment = async (assignmentData: any) => {
    if (!selectedAssignment) return
    
    try {
      const response = await fetch(`/api/admin/schedules/assignments/${selectedAssignment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignmentData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSelectedAssignment(null)
        fetchScheduleAssignments()
      } else {
        console.error("Failed to update assignment:", data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error updating assignment:", error)
      throw error
    }
  }

  // Define schedules table columns
  const scheduleColumns: Column<ScheduleWithId>[] = [
    {
      key: "name",
      title: "Nama Jadwal",
      sortable: true,
      render: (value: any, record: ScheduleWithId) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-white">{value}</p>
            <p className="text-xs text-slate-400">{record.description || 'Tidak ada deskripsi'}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "Tipe",
      sortable: true,
      render: (value: any) => {
        const typeConfig = {
          'regular': { label: 'Reguler', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
          'overtime': { label: 'Lembur', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
          'holiday': { label: 'Hari Libur', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
          'weekend': { label: 'Akhir Pekan', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
          'special': { label: 'Khusus', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
        }
        
        const config = typeConfig[value as keyof typeof typeConfig] || { label: value, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        
        return (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: "startDate",
      title: "Tanggal",
      sortable: true,
      render: (value: any, record: ScheduleWithId) => (
        <div>
          <p className="text-white">
            {new Date(value).toLocaleDateString("id-ID")} - {new Date(record.endDate).toLocaleDateString("id-ID")}
          </p>
          <p className="text-xs text-slate-400">{record.startTime} - {record.endTime}</p>
        </div>
      ),
    },
    {
      key: "location",
      title: "Lokasi",
      render: (value: any) => (
        value ? (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm">{value.name}</span>
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )
      ),
    },
    {
      key: "isActive",
      title: "Status",
      sortable: true,
      render: (value: any) => (
        <Badge className={
          value 
            ? "bg-green-500/20 text-green-400 border-green-500/30"
            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
        }>
          {value ? "Aktif" : "Tidak Aktif"}
        </Badge>
      ),
    },
    {
      key: "isRecurring",
      title: "Berulang",
      sortable: true,
      render: (value: any) => (
        <Badge className={
          value 
            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
        }>
          {value ? "Ya" : "Tidak"}
        </Badge>
      ),
    },
  ]

  // Define assignments table columns
  const assignmentColumns: Column<ScheduleAssignmentWithId>[] = [
    {
      key: "user",
      title: "Karyawan",
      sortable: false,
      render: (value: any, record: ScheduleAssignmentWithId) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {record.user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-white">{record.user?.name || 'Unknown'}</p>
            <p className="text-xs text-slate-400">{record.user?.email || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      title: "Jadwal",
      sortable: false,
      render: (value: any, record: ScheduleAssignmentWithId) => (
        <div>
          <p className="font-medium text-white">{record.schedule?.name || 'Unknown'}</p>
          <p className="text-xs text-slate-400">{record.schedule?.type}</p>
        </div>
      ),
    },
    {
      key: "date",
      title: "Tanggal",
      sortable: true,
      render: (value: any, record: ScheduleAssignmentWithId) => (
        <div>
          <p className="text-white">
            {new Date(value).toLocaleDateString("id-ID")}
          </p>
          {record.schedule && (
            <p className="text-xs text-slate-400">
              {record.schedule.startTime} - {record.schedule.endTime}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value: any) => {
        const statusConfig = {
          'assigned': { label: 'Ditugaskan', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <Clock className="w-3 h-3" /> },
          'confirmed': { label: 'Dikonfirmasi', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <CheckCircle className="w-3 h-3" /> },
          'completed': { label: 'Selesai', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
          'absent': { label: 'Tidak Hadir', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
          'cancelled': { label: 'Dibatalkan', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <XCircle className="w-3 h-3" /> },
        }
        
        const config = statusConfig[value as keyof typeof statusConfig] || { label: value, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <AlertCircle className="w-3 h-3" /> }
        
        return (
          <Badge className={config.color}>
            <div className="flex items-center gap-1">
              {config.icon}
              {config.label}
            </div>
          </Badge>
        )
      },
    },
    {
      key: "checkInTime",
      title: "Check In",
      sortable: true,
      render: (value: any) => (
        value ? (
          <span className="text-white">
            {new Date(value).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )
      ),
    },
    {
      key: "checkOutTime",
      title: "Check Out",
      sortable: true,
      render: (value: any) => (
        value ? (
          <span className="text-white">
            {new Date(value).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )
      ),
    },
  ]

  // Define table actions for schedules
  const scheduleActions: Action<ScheduleWithId>[] = [
    {
      key: "view",
      label: "Lihat Detail",
      icon: <Eye className="w-4 h-4" />,
      onClick: (schedule: ScheduleWithId) => {
        setSelectedSchedule(schedule)
        setIsViewModalOpen(true)
      },
    },
    {
      key: "assign",
      label: "Tugaskan",
      icon: <Users className="w-4 h-4" />,
      onClick: (schedule: ScheduleWithId) => {
        setSelectedSchedule(schedule)
        setIsAssignModalOpen(true)
      },
    },
    {
      key: "edit",
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: (schedule: ScheduleWithId) => {
        setSelectedSchedule(schedule)
        setIsEditModalOpen(true)
      },
    },
    {
      key: "delete",
      label: "Hapus",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDeleteSchedule,
      danger: true,
    },
  ]

  // Define table actions for assignments
  const assignmentActions: Action<ScheduleAssignmentWithId>[] = [
    {
      key: "view",
      label: "Lihat Detail",
      icon: <Eye className="w-4 h-4" />,
      onClick: (assignment: ScheduleAssignmentWithId) => {
        setSelectedAssignment(assignment)
        // Handle view assignment details
      },
    },
    {
      key: "edit",
      label: "Edit Status",
      icon: <Edit className="w-4 h-4" />,
      onClick: (assignment: ScheduleAssignmentWithId) => {
        setSelectedAssignment(assignment)
        // Handle edit assignment status
      },
    },
  ]

  // Define form fields for create/edit schedule
  const scheduleFormFields: FormSection[] = [
    {
      title: "Informasi Jadwal",
      fields: [
        {
          name: "name",
          label: "Nama Jadwal",
          type: "text",
          placeholder: "Masukkan nama jadwal",
          required: true,
        },
        {
          name: "type",
          label: "Tipe Jadwal",
          type: "select",
          required: true,
          options: [
            { label: "Reguler", value: "regular" },
            { label: "Lembur", value: "overtime" },
            { label: "Hari Libur", value: "holiday" },
            { label: "Akhir Pekan", value: "weekend" },
            { label: "Khusus", value: "special" },
          ],
        },
        {
          name: "description",
          label: "Deskripsi",
          type: "textarea",
          placeholder: "Masukkan deskripsi jadwal",
        },
      ],
    },
    {
      title: "Waktu",
      fields: [
        {
          name: "startDate",
          label: "Tanggal Mulai",
          type: "date",
          required: true,
        },
        {
          name: "endDate",
          label: "Tanggal Akhir",
          type: "date",
          required: true,
        },
        {
          name: "startTime",
          label: "Waktu Mulai",
          type: "text",
          placeholder: "08:00",
          required: true,
        },
        {
          name: "endTime",
          label: "Waktu Selesai",
          type: "text",
          placeholder: "17:00",
          required: true,
        },
      ],
    },
    {
      title: "Pengaturan",
      fields: [
        {
          name: "isActive",
          label: "Aktif",
          type: "checkbox",
        },
        {
          name: "isRecurring",
          label: "Berulang",
          type: "checkbox",
        },
      ],
    },
    {
      title: "Lokasi",
      fields: [
        {
          name: "location.name",
          label: "Nama Lokasi",
          type: "text",
          placeholder: "Masukkan nama lokasi",
        },
        {
          name: "location.address",
          label: "Alamat",
          type: "textarea",
          placeholder: "Masukkan alamat",
        },
        {
          name: "location.latitude",
          label: "Latitude",
          type: "number",
          placeholder: "Masukkan latitude",
        },
        {
          name: "location.longitude",
          label: "Longitude",
          type: "number",
          placeholder: "Masukkan longitude",
        },
        {
          name: "location.radius",
          label: "Radius (meter)",
          type: "number",
          placeholder: "Masukkan radius",
        },
      ],
    },
  ]

  // Fetch schedules and assignments on component mount
  useEffect(() => {
    if (activeTab === "schedules") {
      fetchSchedules()
    } else if (activeTab === "assignments") {
      fetchScheduleAssignments()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Jadwal Kerja</h1>
              <p className="text-slate-400">Kelola jadwal kerja dan penugasannya</p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buat Jadwal
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-800/50 border-slate-700">
              <TabsTrigger value="schedules" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Calendar className="w-4 h-4 mr-2" />
                Jadwal
              </TabsTrigger>
              <TabsTrigger value="assignments" className="data-[state=active]:bg-slate-700 text-slate-300">
                <Users className="w-4 h-4 mr-2" />
                Penugasan
              </TabsTrigger>
            </TabsList>

            {/* Schedules Tab */}
            <TabsContent value="schedules" className="space-y-4">
              <AdminDataTable
                data={schedules}
                columns={scheduleColumns}
                actions={scheduleActions}
                loading={loading}
                emptyText="Tidak ada jadwal"
              />
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              <AdminDataTable
                data={scheduleAssignments}
                columns={assignmentColumns}
                actions={assignmentActions}
                loading={loading}
                emptyText="Tidak ada penugasan"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Schedule Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={z.object({})} // Simple schema for now
                sections={scheduleFormFields}
                onSubmit={handleCreateSchedule}
                onCancel={() => setIsCreateModalOpen(false)}
                title="Buat Jadwal Baru"
                description="Masukkan informasi jadwal baru"
              />
            </div>
          </div>
        )}

        {/* Edit Schedule Modal */}
        {isEditModalOpen && selectedSchedule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={z.object({})} // Simple schema for now
                sections={scheduleFormFields}
                onSubmit={handleUpdateSchedule}
                onCancel={() => {
                  setIsEditModalOpen(false)
                  setSelectedSchedule(null)
                }}
                initialData={selectedSchedule}
                title="Edit Jadwal"
                description="Perbarui informasi jadwal"
                submitText="Simpan Perubahan"
              />
            </div>
          </div>
        )}

        {/* View Schedule Modal */}
        {isViewModalOpen && selectedSchedule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">Detail Jadwal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Nama Jadwal</p>
                      <p className="text-white">{selectedSchedule.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Tipe</p>
                      <Badge className={
                        selectedSchedule.type === 'regular' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        selectedSchedule.type === 'overtime' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                        selectedSchedule.type === 'holiday' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        selectedSchedule.type === 'weekend' ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }>
                        {selectedSchedule.type}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Deskripsi</p>
                      <p className="text-white">{selectedSchedule.description || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Tanggal</p>
                      <p className="text-white">
                        {new Date(selectedSchedule.startDate).toLocaleDateString("id-ID")} - {new Date(selectedSchedule.endDate).toLocaleDateString("id-ID")}
                      </p>
                      <p className="text-xs text-slate-400">{selectedSchedule.startTime} - {selectedSchedule.endTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <Badge className={
                        selectedSchedule.isActive 
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }>
                        {selectedSchedule.isActive ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Berulang</p>
                      <Badge className={
                        selectedSchedule.isRecurring 
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }>
                        {selectedSchedule.isRecurring ? "Ya" : "Tidak"}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedSchedule.location && (
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Lokasi</p>
                      <div className="bg-slate-700/30 p-3 rounded-md space-y-1">
                        <p className="text-white text-sm">
                          Nama: {selectedSchedule.location.name}
                        </p>
                        <p className="text-white text-sm">
                          Alamat: {selectedSchedule.location.address}
                        </p>
                        <p className="text-white text-sm">
                          Koordinat: {selectedSchedule.location.latitude.toFixed(6)}, {selectedSchedule.location.longitude.toFixed(6)}
                        </p>
                        <p className="text-white text-sm">
                          Radius: {selectedSchedule.location.radius} meter
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsViewModalOpen(false)
                        setSelectedSchedule(null)
                      }}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Tutup
                    </Button>
                    <Button
                      onClick={() => {
                        setIsViewModalOpen(false)
                        setIsEditModalOpen(true)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        <ConfirmModal />
        </div>
  )
}
