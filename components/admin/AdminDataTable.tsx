"use client"

import * as React from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface Column<T = any> {
  key: keyof T
  title: string
  sortable?: boolean
  searchable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

export interface Action<T = any> {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: (record: T, index: number) => void
  danger?: boolean
  disabled?: boolean
}

interface AdminDataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    showSizeChanger?: boolean
    pageSizeOptions?: number[]
    onChange: (page: number, pageSize: number) => void
  }
  actions?: Action<T>[]
  rowSelection?: {
    selectedRowKeys: string[]
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void
  }
  filters?: {
    searchable?: boolean
    placeholder?: string
    onSearch: (value: string) => void
  }
  sorting?: {
    field?: keyof T
    order?: 'asc' | 'desc'
    onChange: (field: keyof T, order: 'asc' | 'desc') => void
  }
  onRefresh?: () => void
  onExport?: () => void
  className?: string
  emptyText?: string
  rowKey?: keyof T | ((record: T) => string)
}

export function AdminDataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  actions = [],
  rowSelection,
  filters,
  sorting,
  onRefresh,
  onExport,
  className,
  emptyText = "Tidak ada data",
  rowKey = "id",
}: AdminDataTableProps<T>) {
  const [searchValue, setSearchValue] = React.useState("")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())

  // Initialize selected rows from props
  React.useEffect(() => {
    if (rowSelection?.selectedRowKeys) {
      setSelectedRows(new Set(rowSelection.selectedRowKeys))
    }
  }, [rowSelection?.selectedRowKeys])

  const handleSearch = (value: string) => {
    setSearchValue(value)
    filters?.onSearch(value)
  }

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !sorting) return

    const currentField = sorting.field
    const currentOrder = sorting.order

    let newOrder: 'asc' | 'desc' = 'asc'
    if (currentField === column.key) {
      newOrder = currentOrder === 'asc' ? 'desc' : 'asc'
    }

    sorting.onChange(column.key, newOrder)
  }

  const handleRowSelect = (record: T, checked: boolean) => {
    const key = typeof rowKey === 'function' ? rowKey(record) : record[rowKey]
    const newSelectedRows = new Set(selectedRows)

    if (checked) {
      newSelectedRows.add(key)
    } else {
      newSelectedRows.delete(key)
    }

    setSelectedRows(newSelectedRows)
    
    if (rowSelection) {
      const selectedData = data.filter(item => {
        const itemKey = typeof rowKey === 'function' ? rowKey(item) : item[rowKey]
        return newSelectedRows.has(itemKey)
      })
      rowSelection.onChange(Array.from(newSelectedRows), selectedData)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows = checked ? new Set(data.map(item => {
      const key = typeof rowKey === 'function' ? rowKey(item) : item[rowKey]
      return String(key)
    })) : new Set<string>()

    setSelectedRows(newSelectedRows)
    
    if (rowSelection) {
      rowSelection.onChange(Array.from(newSelectedRows), checked ? [...data] : [])
    }
  }

  const isAllSelected = data.length > 0 && selectedRows.size === data.length
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length

  const renderCell = (column: Column<T>, record: T, index: number) => {
    const value = record[column.key]
    
    if (column.render) {
      return column.render(value, record, index)
    }

    // Default rendering for common types
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Ya" : "Tidak"}
        </Badge>
      )
    }

    if (value && typeof value === 'object' && 'toISOString' in value) {
      return (value as Date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    return value || "-"
  }

  return (
    <Card className={cn("bg-slate-800/50 border-slate-700", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Data Table</CardTitle>
          <div className="flex items-center gap-2">
            {filters?.searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={filters.placeholder || "Cari..."}
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 w-64"
                />
              </div>
            )}
            
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            )}
            
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                {rowSelection && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                  </TableHead>
                )}
                
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={cn(
                      "text-slate-300 font-medium",
                      column.sortable && "cursor-pointer hover:text-white",
                      column.className
                    )}
                    style={{ width: column.width }}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-2">
                      {column.title}
                      {column.sortable && sorting?.field === column.key && (
                        <span className="text-emerald-400">
                          {sorting.order === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
                
                {actions.length > 0 && (
                  <TableHead className="w-12 text-slate-300 font-medium">
                    Aksi
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (rowSelection ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="ml-2 text-slate-400">Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (rowSelection ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                    <div className="text-center py-8 text-slate-400">
                      {emptyText}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((record, index) => {
                  const key = typeof rowKey === 'function' ? rowKey(record) : record[rowKey]
                  const isSelected = selectedRows.has(key)
                  
                  return (
                    <TableRow
                      key={key}
                      className={cn(
                        "border-slate-700 hover:bg-slate-700/30",
                        isSelected && "bg-slate-700/50"
                      )}
                    >
                      {rowSelection && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleRowSelect(record, e.target.checked)}
                            className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                          />
                        </TableCell>
                      )}
                      
                      {columns.map((column) => (
                        <TableCell
                          key={String(column.key)}
                          className={cn("text-slate-300", column.className)}
                          style={{ width: column.width }}
                        >
                          {renderCell(column, record, index)}
                        </TableCell>
                      ))}
                      
                      {actions.length > 0 && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              {actions.map((action) => (
                                <DropdownMenuItem
                                  key={action.key}
                                  onClick={() => action.onClick(record, index)}
                                  disabled={action.disabled}
                                  className={cn(
                                    "text-slate-300 hover:bg-slate-700 hover:text-white",
                                    action.danger && "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  )}
                                >
                                  {action.icon && <span className="mr-2">{action.icon}</span>}
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {pagination && (
          <div className="flex items-center justify-between p-4 border-t border-slate-700">
            <div className="text-sm text-slate-400">
              Menampilkan {((pagination.current - 1) * pagination.pageSize) + 1} - {Math.min(pagination.current * pagination.pageSize, pagination.total)} dari {pagination.total} data
            </div>
            
            <div className="flex items-center gap-2">
              {pagination.showSizeChanger && (
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(value) => pagination.onChange(1, parseInt(value))}
                >
                  <SelectTrigger className="w-20 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {pagination.pageSizeOptions?.map(size => (
                      <SelectItem key={size} value={size.toString()} className="text-slate-300">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.onChange(1, pagination.pageSize)}
                  disabled={pagination.current === 1}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                  disabled={pagination.current === 1}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm text-slate-300 bg-slate-700 rounded">
                  {pagination.current}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pagination.onChange(Math.ceil(pagination.total / pagination.pageSize), pagination.pageSize)}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}