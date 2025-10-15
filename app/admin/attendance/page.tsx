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
import { AttendanceRecordInput, AttendanceUpdateInput, attendanceRecordSchema, attendanceUpdateSchema } from "@/lib/validation-schemas"
import { Plus, Edit, Trash2, Eye, Clock, Calendar, MapPin, Camera, Users, TrendingUp, AlertCircle } from "lucide-react"
import { z } from "zod"

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Define the attendance record interface for the table
interface AttendanceRecordWithId {
  id: string
  userId: string
  timestamp: string
  type: 'check-in' | 'check-out' | 'break-start' | 'break-end'
  // Support both structured coordinates and plain text location from server
  location?: {
    latitude: number
    longitude: number
    accuracy?: number
  } | string
  photo?: string
  notes?: string
  status?: 'present' | 'absent' | 'late' | 'early_leave' | 'on_leave'
  user?: {
    id: string
    name: string
    email: string
    role: string
    department: string
  }
  department?: string // Added to include department directly
  createdAt?: string
  updatedAt?: string
}

export default function AttendancePage() {
  const router = useRouter()
  const { confirm, ConfirmModal } = useConfirmModal()
  
  // State management
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [sorting, setSorting] = useState({
    field: "timestamp" as keyof AttendanceRecordWithId,
    order: "desc" as "asc" | "desc",
  })
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordWithId | null>(null)
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])

  // Fetch attendance records from API
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        sortBy: sorting.field.toString(),
        sortOrder: sorting.order,
        ...filters,
      })
      
      if (searchQuery) {
        params.set("search", searchQuery)
      }
      
      const response = await fetch(`/api/admin/attendance?${params}`, { credentials: 'include', cache: 'no-store' })
      const data = await response.json()
      
      if (data.success) {
        setAttendanceRecords(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
        }))
      } else {
        logger.error('Failed to fetch attendance records', new Error(data.error))
      }
    } catch (error) {
      logger.error('Error fetching attendance records', error as Error)
    } finally {
      setLoading(false)
    }
  }

  // Handle attendance record creation
  const handleCreateRecord = async (recordData: AttendanceRecordInput) => {
    try {
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ records: [recordData] }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateModalOpen(false)
        fetchAttendanceRecords()
      } else {
        logger.error('Failed to create attendance record:', new Error(data.error))
        throw new Error(data.error)
      }
    } catch (error) {
      logger.error('Error creating attendance record', error as Error)
      throw error
    }
  }

  // Handle attendance record update
  const handleUpdateRecord = async (recordData: AttendanceUpdateInput) => {
    if (!selectedRecord) return
    
    try {
      const response = await fetch("/api/admin/attendance", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          updates: recordData,
          ids: [selectedRecord.id]
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEditModalOpen(false)
        setSelectedRecord(null)
        fetchAttendanceRecords()
      } else {
        logger.error('Failed to update attendance record:', new Error(data.error))
        throw new Error(data.error)
      }
    } catch (error) {
      logger.error('Error updating attendance record', error as Error)
      throw error
    }
  }

  // Handle attendance record deletion
  const handleDeleteRecord = async (record: AttendanceRecordWithId) => {
    const confirmed = await confirm({
      title: "Hapus Record Absensi",
      description: `Apakah Anda yakin ingin menghapus record absensi ini? Tindakan ini tidak dapat dibatalkan.`,
      variant: "destructive",
      confirmText: "Hapus",
      onConfirm: async () => {
        const response = await fetch("/api/admin/attendance", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ ids: [record.id] }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          fetchAttendanceRecords()
        } else {
          logger.error('Failed to delete attendance record:', new Error(data.error))
        }
      },
    })
  }

  // Handle bulk deletion
  const handleBulkDelete = async (recordIds: string[]) => {
    const confirmed = await confirm({
      title: "Hapus Record Absensi",
      description: `Apakah Anda yakin ingin menghapus ${recordIds.length} record absensi? Tindakan ini tidak dapat dibatalkan.`,
      variant: "destructive",
      confirmText: "Hapus",
      onConfirm: async () => {
        const response = await fetch("/api/admin/attendance", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ ids: recordIds }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          fetchAttendanceRecords()
          setSelectedRecords([])
        } else {
          logger.error('Failed to delete attendance records:', new Error(data.error))
        }
      },
    })
  }

  // Handle bulk update
  const handleBulkUpdate = async (updates: AttendanceUpdateInput) => {
    try {
      const response = await fetch("/api/admin/attendance", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          updates,
          ids: selectedRecords
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsBulkEditModalOpen(false)
        setSelectedRecords([])
        fetchAttendanceRecords()
      } else {
        logger.error('Failed to update attendance records:', new Error(data.error))
        throw new Error(data.error)
      }
    } catch (error) {
      logger.error('Error updating attendance records', error as Error)
      throw error
    }
  }

  // Handle export
  const handleExport = async (format: string, exportFilters: any) => {
    try {
      const params = new URLSearchParams({
        format,
        ...filters,
        ...exportFilters,
      })
      
      if (searchQuery) {
        params.set("search", searchQuery)
      }
      
      const response = await fetch(`/api/admin/attendance/export?${params}`, { credentials: 'include', cache: 'no-store' })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `attendance-records.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        logger.error('Failed to export data', new Error())
      }
    } catch (error) {
      logger.error('Error exporting data', error as Error)
    }
  }

  // Determine attendance status based on record data
  const getAttendanceStatus = (record: AttendanceRecordWithId) => {
    if (record.type === 'check-in') {
      const checkInTime = new Date(record.timestamp)
      const workStartTime = new Date(checkInTime)
      workStartTime.setHours(8, 0, 0, 0) // 8:00 AM
      const lateThreshold = 15 * 60 * 1000 // 15 minutes
      
      if (checkInTime.getTime() > workStartTime.getTime() + lateThreshold) {
        return 'late'
      }
      return 'present'
    }
    return 'unknown'
  }

  // Define table columns
  const columns: Column<AttendanceRecordWithId>[] = [
    {
      key: "user",
      title: "Karyawan",
      sortable: false,
      searchable: true,
      render: (value: any, record: AttendanceRecordWithId) => (
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
      key: "type",
      title: "Tipe",
      sortable: true,
      render: (value: any) => {
        const typeConfig = {
          'check-in': { label: 'Check In', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
          'check-out': { label: 'Check Out', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
          'break-start': { label: 'Istirahat Mulai', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
          'break-end': { label: 'Istirahat Selesai', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
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
      key: "timestamp",
      title: "Waktu",
      sortable: true,
      render: (value: any) => {
        if (!value) return "-"
        return new Date(value).toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      },
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value: any, record: AttendanceRecordWithId) => {
        const status = record.status || getAttendanceStatus(record)
        const statusConfig = {
          'present': { label: 'Hadir', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
          'late': { label: 'Terlambat', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
          'absent': { label: 'Tidak Hadir', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
          'early_leave': { label: 'Pulang Awal', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
          'on_leave': { label: 'Cuti', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        }
        
        const config = statusConfig[status as keyof typeof statusConfig] || { label: status, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        
        return (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      key: "location",
      title: "Lokasi",
      render: (value: any) => {
        if (!value) {
          return <span className="text-slate-400">-</span>
        }
        // If API returns a string like "Office"
        if (typeof value === 'string') {
          return (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">{value}</span>
            </div>
          )
        }
        // If API returns coordinates object
        const lat = (value as any)?.latitude
        const lon = (value as any)?.longitude
        if (typeof lat === 'number' && typeof lon === 'number') {
          return (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">
                {lat.toFixed(6)}, {lon.toFixed(6)}
              </span>
            </div>
          )
        }
        return <span className="text-slate-400">-</span>
      },
    },
    {
      key: "department",
      title: "Departemen",
      sortable: true,
      render: (value: any, record: AttendanceRecordWithId) => record.user?.department || "-",
    },
  ]

  // Define table actions
  const actions: Action<AttendanceRecordWithId>[] = [
    {
      key: "view",
      label: "Lihat Detail",
      icon: <Eye className="w-4 h-4" />,
      onClick: (record: AttendanceRecordWithId) => {
        setSelectedRecord(record)
        setIsViewModalOpen(true)
      },
    },
    {
      key: "edit",
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: (record: AttendanceRecordWithId) => {
        setSelectedRecord(record)
        setIsEditModalOpen(true)
      },
    },
    {
      key: "delete",
      label: "Hapus",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDeleteRecord,
      danger: true,
    },
  ]

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      key: "type",
      label: "Tipe",
      type: "select",
      options: [
        { label: "Semua", value: "all" },
        { label: "Check In", value: "check-in" },
        { label: "Check Out", value: "check-out" },
        { label: "Istirahat Mulai", value: "break-start" },
        { label: "Istirahat Selesai", value: "break-end" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Semua", value: "all" },
        { label: "Hadir", value: "present" },
        { label: "Terlambat", value: "late" },
        { label: "Tidak Hadir", value: "absent" },
        { label: "Pulang Awal", value: "early_leave" },
        { label: "Cuti", value: "on_leave" },
      ],
    },
    {
      key: "department",
      label: "Departemen",
      type: "text",
      placeholder: "Cari departemen...",
    },
    {
      key: "dateRange",
      label: "Rentang Tanggal",
      type: "daterange",
    },
  ]

  // Define export options
  const exportOptions: ExportOption[] = [
    {
      key: "json",
      label: "Export JSON",
      icon: <Camera className="w-4 h-4" />,
      format: "json",
    },
    {
      key: "csv",
      label: "Export CSV",
      icon: <Camera className="w-4 h-4" />,
      format: "csv",
    },
    {
      key: "xlsx",
      label: "Export Excel",
      icon: <Camera className="w-4 h-4" />,
      format: "xlsx",
    },
  ]

  // Define form fields for create/edit
  const formFields: FormSection[] = [
    {
      title: "Informasi Absensi",
      fields: [
        {
          name: "userId",
          label: "Karyawan",
          type: "select",
          required: true,
          options: [], // Will be populated with users from API
        },
        {
          name: "type",
          label: "Tipe",
          type: "select",
          required: true,
          options: [
            { label: "Check In", value: "check-in" },
            { label: "Check Out", value: "check-out" },
            { label: "Istirahat Mulai", value: "break-start" },
            { label: "Istirahat Selesai", value: "break-end" },
          ],
        },
        {
          name: "timestamp",
          label: "Waktu",
          type: "date",
          required: true,
        },
        {
          name: "notes",
          label: "Catatan",
          type: "textarea",
          placeholder: "Masukkan catatan (opsional)",
        },
      ],
    },
    {
      title: "Lokasi",
      fields: [
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
          name: "location.accuracy",
          label: "Akurasi (meter)",
          type: "number",
          placeholder: "Masukkan akurasi",
        },
      ],
    },
  ]

  // Update form fields for edit mode
  const editFormFields: FormSection[] = formFields.map(section => ({
    ...section,
    fields: section.fields.map(field => 
      field.name === "userId" 
        ? { ...field, required: false, disabled: true }
        : field
    ),
  }))

  // Bulk edit form fields
  const bulkEditFormFields: FormSection[] = [
    {
      title: "Update Massal",
      fields: [
        {
          name: "type",
          label: "Tipe",
          type: "select",
          options: [
            { label: "Check In", value: "check-in" },
            { label: "Check Out", value: "check-out" },
            { label: "Istirahat Mulai", value: "break-start" },
            { label: "Istirahat Selesai", value: "break-end" },
          ],
        },
        {
          name: "notes",
          label: "Catatan",
          type: "textarea",
          placeholder: "Masukkan catatan (opsional)",
        },
      ],
    },
  ]

  // Fetch attendance records on component mount and when dependencies change
  useEffect(() => {
    fetchAttendanceRecords()
  }, [pagination.current, pagination.pageSize, sorting.field, sorting.order, filters, searchQuery])

  return (
    <div className="space-y-6">
      <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Data Absensi</h1>
              <p className="text-slate-400">Kelola data absensi karyawan</p>
            </div>
            <div className="flex gap-2">
              {selectedRecords.length > 0 && (
                <>
                  <Button
                    onClick={() => setIsBulkEditModalOpen(true)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit ({selectedRecords.length})
                  </Button>
                  <Button
                    onClick={() => handleBulkDelete(selectedRecords)}
                    variant="outline"
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus ({selectedRecords.length})
                  </Button>
                </>
              )}
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Record
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Records</CardTitle>
                <Clock className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{pagination.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Hadir Hari Ini</CardTitle>
                <Users className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {attendanceRecords.filter(r => getAttendanceStatus(r) === 'present').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Terlambat</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {attendanceRecords.filter(r => getAttendanceStatus(r) === 'late').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Tingkat Kehadiran</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {attendanceRecords.length > 0 
                    ? Math.round((attendanceRecords.filter(r => getAttendanceStatus(r) === 'present').length / attendanceRecords.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <SearchFilter
            onSearch={setSearchQuery}
            onFilter={setFilters}
            onReset={() => {
              setFilters({})
              setSearchQuery("")
            }}
            searchPlaceholder="Cari record absensi..."
            filters={filterOptions}
            searchValue={searchQuery}
          />

          {/* Data Table */}
          <AdminDataTable
            data={attendanceRecords}
            columns={columns}
            actions={actions}
            loading={loading}
            pagination={{
              ...pagination,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize }))
              },
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
            }}
            sorting={{
              field: sorting.field,
              order: sorting.order,
              onChange: (field, order) => setSorting({ field, order }),
            }}
            onRefresh={fetchAttendanceRecords}
            onExport={() => {}}
            emptyText="Tidak ada data absensi"
            rowSelection={{
              selectedRowKeys: selectedRecords,
              onChange: (selectedRowKeys, selectedRows) => {
                setSelectedRecords(selectedRowKeys)
              },
            }}
          />

          {/* Export Button */}
          <div className="flex justify-end">
            <ExportButton
              onExport={handleExport}
              options={exportOptions}
              availableFields={[
                { key: "user.name", label: "Nama Karyawan" },
                { key: "type", label: "Tipe" },
                { key: "timestamp", label: "Waktu" },
                { key: "status", label: "Status" },
                { key: "location", label: "Lokasi" },
                { key: "notes", label: "Catatan" },
                { key: "department", label: "Departemen" },
              ]}
            />
          </div>
        </div>

        {/* Create Record Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={attendanceRecordSchema}
                sections={formFields}
                onSubmit={handleCreateRecord}
                onCancel={() => setIsCreateModalOpen(false)}
                title="Tambah Record Absensi Baru"
                description="Masukkan informasi record absensi baru"
              />
            </div>
          </div>
        )}

        {/* Edit Record Modal */}
        {isEditModalOpen && selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={attendanceUpdateSchema}
                sections={editFormFields}
                onSubmit={handleUpdateRecord}
                onCancel={() => {
                  setIsEditModalOpen(false)
                  setSelectedRecord(null)
                }}
                initialData={selectedRecord}
                title="Edit Record Absensi"
                description="Perbarui informasi record absensi"
                submitText="Simpan Perubahan"
              />
            </div>
          </div>
        )}

        {/* Bulk Edit Modal */}
        {isBulkEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={attendanceUpdateSchema}
                sections={bulkEditFormFields}
                onSubmit={handleBulkUpdate}
                onCancel={() => setIsBulkEditModalOpen(false)}
                title={`Edit ${selectedRecords.length} Record`}
                description="Perbarui informasi record absensi yang dipilih"
                submitText="Simpan Perubahan"
              />
            </div>
          </div>
        )}

        {/* View Record Modal */}
        {isViewModalOpen && selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">Detail Record Absensi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Nama Karyawan</p>
                      <p className="text-white">{selectedRecord.user?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Email</p>
                      <p className="text-white">{selectedRecord.user?.email || 'No email'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Tipe</p>
                      <Badge className={
                        selectedRecord.type === 'check-in' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        selectedRecord.type === 'check-out' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        selectedRecord.type === 'break-start' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      }>
                        {selectedRecord.type}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <Badge className={
                        getAttendanceStatus(selectedRecord) === 'present' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }>
                        {getAttendanceStatus(selectedRecord)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Waktu</p>
                      <p className="text-white">
                        {new Date(selectedRecord.timestamp).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Departemen</p>
                      <p className="text-white">{selectedRecord.user?.department || '-'}</p>
                    </div>
                  </div>
                  
                  {selectedRecord.location && (
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Lokasi</p>
                      <div className="bg-slate-700/30 p-3 rounded-md">
                        {typeof selectedRecord.location === 'string' ? (
                          <p className="text-white text-sm">{selectedRecord.location}</p>
                        ) : (
                          <>
                            {typeof selectedRecord.location.latitude === 'number' && typeof selectedRecord.location.longitude === 'number' ? (
                              <>
                                <p className="text-white text-sm">
                                  Latitude: {selectedRecord.location.latitude.toFixed(6)}
                                </p>
                                <p className="text-white text-sm">
                                  Longitude: {selectedRecord.location.longitude.toFixed(6)}
                                </p>
                              </>
                            ) : (
                              <p className="text-white text-sm">-</p>
                            )}
                            {typeof selectedRecord.location !== 'string' && selectedRecord.location.accuracy && (
                              <p className="text-white text-sm">
                                Akurasi: {selectedRecord.location.accuracy} meter
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedRecord.notes && (
                    <div>
                      <p className="text-sm text-slate-400">Catatan</p>
                      <p className="text-white">{selectedRecord.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsViewModalOpen(false)
                        setSelectedRecord(null)
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
