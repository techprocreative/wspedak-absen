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
import { UserCreateInput, UserUpdateInput, userCreateSchema, userUpdateSchema } from "@/lib/validation-schemas"
import { Plus, Edit, Trash2, Eye, Users, UserCheck, UserX, Settings, Camera } from "lucide-react"
import { FaceEnrollmentModal } from "@/components/admin/FaceEnrollmentModal"
import { z } from "zod"

// Define the user interface for the table
interface UserWithId {
  id: string
  name: string
  email: string
  role: string
  department?: string
  position?: string
  employeeId?: string
  phone?: string
  address?: string
  startDate?: string
  createdAt?: Date
  updatedAt?: Date
}

export default function EmployeesPage() {
  const router = useRouter()
  const { confirm, ConfirmModal } = useConfirmModal()
  
  // State management
  const [users, setUsers] = useState<UserWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [sorting, setSorting] = useState({
    field: "name" as keyof UserWithId,
    order: "asc" as "asc" | "desc",
  })
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null)

  // Fetch users from API
  const fetchUsers = async () => {
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
      
      const response = await fetch(`/api/admin/employees?${params}` , { credentials: 'include', cache: 'no-store' })
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
        }))
      } else {
        console.error("Failed to fetch users:", data.error)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle user creation
  const handleCreateUser = async (userData: UserCreateInput) => {
    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(userData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsCreateModalOpen(false)
        fetchUsers()
      } else {
        console.error("Failed to create user:", data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error creating user:", error)
      throw error
    }
  }

  // Handle user update
  const handleUpdateUser = async (userData: UserUpdateInput) => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/admin/employees/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(userData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEditModalOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        console.error("Failed to update user:", data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("Error updating user:", error)
      throw error
    }
  }

  // Handle user deletion
  const handleDeleteUser = async (user: UserWithId) => {
    const confirmed = await confirm({
      title: "Hapus Karyawan",
      description: `Apakah Anda yakin ingin menghapus ${user.name}? Tindakan ini tidak dapat dibatalkan.`,
      variant: "destructive",
      confirmText: "Hapus",
      onConfirm: async () => {
        const response = await fetch(`/api/admin/employees/${user.id}`, {
          method: "DELETE",
          credentials: 'include',
          cache: 'no-store',
        })
        
        const data = await response.json()
        
        if (data.success) {
          fetchUsers()
        } else {
          console.error("Failed to delete user:", data.error)
        }
      },
    })
  }

  // Handle bulk deletion
  const handleBulkDelete = async (userIds: string[]) => {
    const confirmed = await confirm({
      title: "Hapus Karyawan",
      description: `Apakah Anda yakin ingin menghapus ${userIds.length} karyawan? Tindakan ini tidak dapat dibatalkan.`,
      variant: "destructive",
      confirmText: "Hapus",
      onConfirm: async () => {
        const response = await fetch("/api/admin/employees", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ ids: userIds }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          fetchUsers()
        } else {
          console.error("Failed to delete users:", data.error)
        }
      },
    })
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
      
      const response = await fetch(`/api/admin/employees/export?${params}`, { credentials: 'include', cache: 'no-store' })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `employees.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error("Failed to export data")
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  // Define table columns
  const columns: Column<UserWithId>[] = [
    {
      key: "name",
      title: "Nama",
      sortable: true,
      searchable: true,
      render: (value: any, record: UserWithId) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {value.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-white">{value}</p>
            <p className="text-xs text-slate-400">{record.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      title: "Role",
      sortable: true,
      render: (value: any) => (
        <Badge
          className={
            value === "admin"
              ? "bg-red-500/20 text-red-400 border-red-500/30"
              : value === "hr"
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : value === "manager"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-green-500/20 text-green-400 border-green-500/30"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "department",
      title: "Departemen",
      sortable: true,
      render: (value: any) => value || "-",
    },
    {
      key: "position",
      title: "Posisi",
      render: (value: any) => value || "-",
    },
    {
      key: "createdAt",
      title: "Tanggal Dibuat",
      sortable: true,
      render: (value: any) => {
        if (!value) return "-"
        return new Date(value).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      },
    },
  ]

  // Define table actions
  const actions: Action<UserWithId>[] = [
    {
      key: "view",
      label: "Lihat Detail",
      icon: <Eye className="w-4 h-4" />,
      onClick: (user: UserWithId) => {
        setSelectedUser(user)
        setIsViewModalOpen(true)
      },
    },
    {
      key: "enroll",
      label: "Enroll Face",
      icon: <Camera className="w-4 h-4" />,
      onClick: (user: UserWithId) => {
        setSelectedUser(user)
        setIsEnrollModalOpen(true)
      },
    },
    {
      key: "edit",
      label: "Edit",
      icon: <Edit className="w-4 h-4" />,
      onClick: (user: UserWithId) => {
        setSelectedUser(user)
        setIsEditModalOpen(true)
      },
    },
    {
      key: "delete",
      label: "Hapus",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDeleteUser,
      danger: true,
    },
  ]

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { label: "Semua", value: "all" },
        { label: "Admin", value: "admin" },
        { label: "HR", value: "hr" },
        { label: "Manager", value: "manager" },
        { label: "Employee", value: "employee" },
      ],
    },
    {
      key: "department",
      label: "Departemen",
      type: "text",
      placeholder: "Cari departemen...",
    },
  ]

  // Define export options
  const exportOptions: ExportOption[] = [
    {
      key: "json",
      label: "Export JSON",
      icon: <Settings className="w-4 h-4" />,
      format: "json",
    },
    {
      key: "csv",
      label: "Export CSV",
      icon: <Settings className="w-4 h-4" />,
      format: "csv",
    },
  ]

  // Define form fields for create/edit
  const formFields: FormSection[] = [
    {
      title: "Informasi Pribadi",
      fields: [
        {
          name: "name",
          label: "Nama Lengkap",
          type: "text",
          placeholder: "Masukkan nama lengkap",
          required: true,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          placeholder: "Masukkan email",
          required: true,
        },
        {
          name: "phone",
          label: "Nomor Telepon",
          type: "text",
          placeholder: "Masukkan nomor telepon",
        },
        {
          name: "address",
          label: "Alamat",
          type: "textarea",
          placeholder: "Masukkan alamat",
        },
      ],
    },
    {
      title: "Informasi Pekerjaan",
      fields: [
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          options: [
            { label: "Admin", value: "admin" },
            { label: "HR", value: "hr" },
            { label: "Manager", value: "manager" },
            { label: "Employee", value: "employee" },
          ],
        },
        {
          name: "department",
          label: "Departemen",
          type: "text",
          placeholder: "Masukkan departemen",
        },
        {
          name: "position",
          label: "Posisi",
          type: "text",
          placeholder: "Masukkan posisi",
        },
        {
          name: "employeeId",
          label: "ID Karyawan",
          type: "text",
          placeholder: "Masukkan ID karyawan",
        },
        {
          name: "startDate",
          label: "Tanggal Mulai",
          type: "date",
        },
      ],
    },
    {
      title: "Keamanan",
      fields: [
        {
          name: "password",
          label: "Password",
          type: "password",
          placeholder: "Masukkan password",
          required: true,
          validation: z.string().min(8, "Password minimal 8 karakter"),
        },
      ],
    },
  ]

  // Update form fields for edit mode (remove password requirement)
  const editFormFields: FormSection[] = formFields.map(section => ({
    ...section,
    fields: section.fields.map(field => 
      field.name === "password" 
        ? { ...field, required: false, placeholder: "Kosongkan jika tidak ingin mengubah" }
        : field
    ),
  }))

  // Fetch users on component mount and when dependencies change
  useEffect(() => {
    fetchUsers()
  }, [pagination.current, pagination.pageSize, sorting.field, sorting.order, filters, searchQuery])

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Kelola Karyawan</h1>
              <p className="text-slate-400">Kelola data karyawan dan informasi mereka</p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Karyawan
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Karyawan</CardTitle>
                <Users className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{pagination.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Admin</CardTitle>
                <UserCheck className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === "admin").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">HR</CardTitle>
                <UserCheck className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === "hr").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Employee</CardTitle>
                <UserX className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === "employee").length}
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
            searchPlaceholder="Cari karyawan..."
            filters={filterOptions}
            searchValue={searchQuery}
          />

          {/* Data Table */}
          <AdminDataTable
            data={users}
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
            onRefresh={fetchUsers}
            onExport={() => {}}
            emptyText="Tidak ada data karyawan"
          />

          {/* Export Button */}
          <div className="flex justify-end">
            <ExportButton
              onExport={handleExport}
              options={exportOptions}
              availableFields={[
                { key: "name", label: "Nama" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                { key: "department", label: "Departemen" },
                { key: "position", label: "Posisi" },
                { key: "phone", label: "Telepon" },
                { key: "address", label: "Alamat" },
                { key: "employeeId", label: "ID Karyawan" },
                { key: "startDate", label: "Tanggal Mulai" },
              ]}
            />
          </div>

        {/* Create User Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={userCreateSchema}
                sections={formFields}
                onSubmit={handleCreateUser}
                onCancel={() => setIsCreateModalOpen(false)}
                title="Tambah Karyawan Baru"
                description="Masukkan informasi karyawan baru"
              />
            </div>
          </div>
        )}

        {/* Enroll Face Modal */}
        {isEnrollModalOpen && selectedUser && (
          <FaceEnrollmentModal
            userId={selectedUser.id}
            userName={selectedUser.name}
            onClose={() => {
              setIsEnrollModalOpen(false)
              setSelectedUser(null)
            }}
            targetSamples={3}
          />
        )}

        {/* Edit User Modal */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <AdminForm
                schema={userUpdateSchema}
                sections={editFormFields}
                onSubmit={handleUpdateUser}
                onCancel={() => {
                  setIsEditModalOpen(false)
                  setSelectedUser(null)
                }}
                initialData={selectedUser}
                title="Edit Karyawan"
                description="Perbarui informasi karyawan"
                submitText="Simpan Perubahan"
              />
            </div>
          </div>
        )}

        {/* View User Modal */}
        {isViewModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">Detail Karyawan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Nama</p>
                      <p className="text-white">{selectedUser.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Email</p>
                      <p className="text-white">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Role</p>
                      <Badge
                        className={
                          selectedUser.role === "admin"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : selectedUser.role === "hr"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : selectedUser.role === "manager"
                                ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                : "bg-green-500/20 text-green-400 border-green-500/30"
                        }
                      >
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Departemen</p>
                      <p className="text-white">{selectedUser.department || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Posisi</p>
                      <p className="text-white">{selectedUser.position || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">ID Karyawan</p>
                      <p className="text-white">{selectedUser.employeeId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Telepon</p>
                      <p className="text-white">{selectedUser.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Tanggal Mulai</p>
                      <p className="text-white">
                        {selectedUser.startDate
                          ? new Date(selectedUser.startDate).toLocaleDateString("id-ID")
                          : "-"}
                      </p>
                    </div>
                  </div>
                  {selectedUser.address && (
                    <div>
                      <p className="text-sm text-slate-400">Alamat</p>
                      <p className="text-white">{selectedUser.address}</p>
                    </div>
                  )}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsViewModalOpen(false)
                          setSelectedUser(null)
                        }}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Tutup
                      </Button>
                      <Button
                        onClick={() => {
                          setIsViewModalOpen(false)
                          setIsEnrollModalOpen(true)
                        }}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Enroll Face
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
