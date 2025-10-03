# Admin System Implementation Guide

## Quick Start Implementation

This guide provides practical implementation examples and best practices for building the comprehensive admin system specified in the main specification document.

## 1. Project Structure Setup

### Directory Organization
```
app/
├── admin/
│   ├── dashboard/
│   │   └── page.tsx ✅ (exists)
│   ├── employees/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── create/
│   │       └── page.tsx
│   ├── attendance/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── correct/
│   │       └── page.tsx
│   ├── reports/
│   │   ├── page.tsx
│   │   ├── generate/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── schedules/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── create/
│   │       └── page.tsx
│   ├── settings/
│   │   ├── page.tsx
│   │   ├── company/
│   │   │   └── page.tsx
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   └── security/
│   │       └── page.tsx
│   ├── monitoring/
│   │   └── page.tsx
│   ├── audit/
│   │   └── page.tsx
│   ├── backup/
│   │   └── page.tsx
│   ├── notifications/
│   │   └── page.tsx
│   ├── api/
│   │   └── page.tsx
│   └── security/
│       └── page.tsx
└── api/
    └── admin/
        ├── employees/
        ├── attendance/
        ├── reports/
        ├── schedules/
        ├── settings/
        ├── monitoring/
        ├── audit/
        ├── backup/
        ├── notifications/
        └── security/

components/
├── admin/
│   ├── data-table.tsx
│   ├── forms/
│   │   ├── user-form.tsx
│   │   ├── attendance-form.tsx
│   │   ├── schedule-form.tsx
│   │   └── settings-form.tsx
│   ├── modals/
│   │   ├── confirm-modal.tsx
│   │   ├── form-modal.tsx
│   │   ├── view-modal.tsx
│   │   └── import-modal.tsx
│   ├── data-transfer/
│   │   ├── export-dialog.tsx
│   │   ├── import-wizard.tsx
│   │   └── data-preview.tsx
│   ├── filters/
│   │   ├── search-bar.tsx
│   │   ├── filter-panel.tsx
│   │   └── date-range-picker.tsx
│   └── charts/
│       ├── attendance-chart.tsx
│       ├── stats-card.tsx
│       └── trend-chart.tsx
└── ui/ ✅ (exists)
```

## 2. Core Component Implementation

### 2.1 Reusable Data Table Component

```typescript
// components/admin/data-table.tsx
"use client"

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Download,
  Filter,
} from "lucide-react"

interface ColumnConfig<T> {
  key: keyof T
  title: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnConfig<T>[]
  loading?: boolean
  searchable?: boolean
  filterable?: boolean
  selectable?: boolean
  paginated?: boolean
  exportable?: boolean
  onRowClick?: (row: T) => void
  onSelectionChange?: (selectedRows: T[]) => void
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void
  pageSize?: number
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  filterable = true,
  selectable = true,
  paginated = true,
  exportable = true,
  onRowClick,
  onSelectionChange,
  onExport,
  pageSize = 20,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set())

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection])

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData
    
    const startIndex = (currentPage - 1) * pageSize
    return filteredData.slice(startIndex, startIndex + pageSize)
  }, [filteredData, currentPage, pageSize, paginated])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedData.map(row => row.id))
      setSelectedRows(allIds)
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (id: string | number, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedRows(newSelected)
    onSelectionChange?.(paginatedData.filter(row => newSelected.has(row.id)))
  }

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    onExport?.(format)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          )}
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          )}
        </div>
        
        {exportable && (
          <div className="flex items-center space-x-2">
            <Select onValueChange={handleExport}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Data table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  width={column.width}
                  className={column.sortable ? 'cursor-pointer' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2.2 Employee Management Page Implementation

```typescript
// app/admin/employees/page.tsx
"use client"

import { useState, useEffect } from 'react'
import { AdminAuthGuard } from "@/components/admin-auth-guard"
import { AdminLayout } from "@/components/admin-layout"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { UserCreateInput, UserQueryInput } from "@/lib/validation-schemas"
import { User } from "@/lib/db"
import { useRouter } from "next/navigation"

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployees, setSelectedEmployees] = useState<User[]>([])

  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value: string, row: User) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm">
            {value.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'email',
      title: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === 'admin' ? 'destructive' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'department',
      title: 'Department',
      sortable: true,
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: User) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/employees/${row.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/employees/${row.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/employees')
      const data = await response.json()
      if (data.success) {
        setEmployees(data.data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id))
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const response = await fetch(`/api/admin/employees/export?format=${format}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employees.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting employees:', error)
    }
  }

  return (
    <AdminAuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Employee Management</h1>
              <p className="text-muted-foreground">Manage employee accounts and information</p>
            </div>
            <Button onClick={() => router.push('/admin/employees/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>

          <DataTable
            data={employees}
            columns={columns}
            loading={loading}
            selectable={true}
            exportable={true}
            onSelectionChange={setSelectedEmployees}
            onExport={handleExport}
          />
        </div>
      </AdminLayout>
    </AdminAuthGuard>
  )
}
```

### 2.3 API Route Implementation

```typescript
// app/api/admin/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { userQuerySchema, userCreateSchema } from '@/lib/validation-schemas'
import { verifyToken, requireRole } from '@/lib/auth-middleware'

// GET /api/admin/employees - List employees
export const GET = withValidation(
  userQuerySchema,
  async (request: NextRequest, context, validatedData) => {
    try {
      // Verify authentication and authorization
      const authCheck = await requireRole(['admin', 'hr'])(request)
      if (authCheck) return authCheck

      // Build query
      let query = supabase
        .from('users')
        .select('*')
        .in('role', ['employee', 'admin', 'hr', 'manager'])

      // Apply filters
      if (validatedData.role) {
        query = query.eq('role', validatedData.role)
      }
      
      if (validatedData.department) {
        query = query.eq('department', validatedData.department)
      }
      
      if (validatedData.search) {
        query = query.or(`name.ilike.%${validatedData.search}%,email.ilike.%${validatedData.search}%`)
      }

      // Apply pagination
      const page = validatedData.page || 1
      const limit = validatedData.limit || 20
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      // Apply sorting
      const sortBy = validatedData.sortBy || 'name'
      const sortOrder = validatedData.sortOrder || 'asc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data, error, count } = await query

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  },
  'query'
)

// POST /api/admin/employees - Create employee
export const POST = withValidation(
  userCreateSchema,
  async (request: NextRequest, context, validatedData) => {
    try {
      // Verify authentication and authorization
      const authCheck = await requireRole(['admin', 'hr'])(request)
      if (authCheck) return authCheck

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        email_confirm: true,
        user_metadata: {
          name: validatedData.name,
          role: validatedData.role,
          department: validatedData.department,
        }
      })

      if (authError) {
        return NextResponse.json(
          { success: false, error: authError.message },
          { status: 400 }
        )
      }

      // Create user profile in database
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: validatedData.email,
          name: validatedData.name,
          role: validatedData.role,
          department: validatedData.department,
          position: validatedData.position,
          manager_id: validatedData.managerId,
          employee_id: validatedData.employeeId,
          phone: validatedData.phone,
          address: validatedData.address,
          start_date: validatedData.startDate,
        })
        .select()
        .single()

      if (profileError) {
        // Rollback auth user creation if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { success: false, error: profileError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: profileData
      }, { status: 201 })
    } catch (error) {
      console.error('Error creating employee:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
)
```

### 2.4 Form Component Implementation

```typescript
// components/admin/forms/user-form.tsx
"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserCreateInput, UserUpdateInput } from '@/lib/validation-schemas'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

interface UserFormProps {
  initialData?: Partial<UserCreateInput | UserUpdateInput>
  onSubmit: (data: UserCreateInput | UserUpdateInput) => Promise<void>
  loading?: boolean
  isEdit?: boolean
}

export function UserForm({ initialData, onSubmit, loading = false, isEdit = false }: UserFormProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(isEdit ? userCreateSchema.omit({ email: true, password: true }) : userCreateSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      password: '',
      confirmPassword: '',
      role: initialData?.role || 'employee',
      department: initialData?.department || '',
      position: initialData?.position || '',
      managerId: initialData?.managerId || '',
      employeeId: initialData?.employeeId || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      startDate: initialData?.startDate || '',
    }
  })

  const handleSubmit = async (data: UserCreateInput | UserUpdateInput) => {
    try {
      setError(null)
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Employee' : 'Create New Employee'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!isEdit && (
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Work Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Work Information</h3>
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter department" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
```

## 3. Best Practices and Guidelines

### 3.1 Error Handling
- Implement consistent error boundaries
- Use toast notifications for user feedback
- Log errors for debugging and monitoring
- Provide meaningful error messages

### 3.2 Performance Optimization
- Implement virtual scrolling for large datasets
- Use React.memo for expensive components
- Implement proper caching strategies
- Optimize database queries with proper indexes

### 3.3 Security Considerations
- Validate all inputs on both client and server
- Implement proper authentication and authorization
- Use HTTPS for all API calls
- Sanitize user inputs to prevent XSS

### 3.4 Accessibility
- Use semantic HTML elements
- Implement proper ARIA labels
- Ensure keyboard navigation support
- Test with screen readers

### 3.5 Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for UI components
- End-to-end tests for critical user flows

## 4. Deployment Considerations

### 4.1 Environment Configuration
- Use environment variables for sensitive data
- Implement proper logging and monitoring
- Set up database backups
- Configure SSL certificates

### 4.2 Scaling Considerations
- Implement horizontal scaling for API servers
- Use database connection pooling
- Implement caching layers
- Consider CDN for static assets

### 4.3 Monitoring and Maintenance
- Set up application performance monitoring
- Implement health checks
- Configure alerting for critical issues
- Regular security audits and updates

This implementation guide provides practical examples and best practices for building the comprehensive admin system. The code examples demonstrate the implementation patterns that should be followed across all admin components and pages.