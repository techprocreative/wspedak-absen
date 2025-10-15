"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Filter,
  FileSpreadsheet,
  File,
  Database,
  Search,
  Plus,
  X
} from "lucide-react"

// Define interfaces
interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  fields: string[]
  filters: ExportFilter[]
  filename?: string
  includeHeader?: boolean
  encoding?: string
  delimiter?: string
}

interface ExportFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: any
}

interface ExportResult {
  success: boolean
  filename: string
  downloadUrl: string
  totalRecords: number
  exportedRecords: number
  fileSize: number
  errors: string[]
  warnings: string[]
}

interface ExportProgress {
  current: number
  total: number
  percentage: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

// Mock data for available fields
const availableFields = {
  employees: [
    { name: 'id', label: 'ID' },
    { name: 'name', label: 'Name' },
    { name: 'email', label: 'Email' },
    { name: 'employeeId', label: 'Employee ID' },
    { name: 'department', label: 'Department' },
    { name: 'role', label: 'Role' },
    { name: 'phone', label: 'Phone' },
    { name: 'address', label: 'Address' },
    { name: 'startDate', label: 'Start Date' },
    { name: 'salary', label: 'Salary' },
    { name: 'manager', label: 'Manager' },
    { name: 'status', label: 'Status' }
  ],
  attendance: [
    { name: 'id', label: 'ID' },
    { name: 'employeeId', label: 'Employee ID' },
    { name: 'date', label: 'Date' },
    { name: 'type', label: 'Type' },
    { name: 'timestamp', label: 'Timestamp' },
    { name: 'location', label: 'Location' },
    { name: 'notes', label: 'Notes' },
    { name: 'approvedBy', label: 'Approved By' },
    { name: 'status', label: 'Status' }
  ],
  schedules: [
    { name: 'id', label: 'ID' },
    { name: 'employeeId', label: 'Employee ID' },
    { name: 'startDate', label: 'Start Date' },
    { name: 'endDate', label: 'End Date' },
    { name: 'shiftType', label: 'Shift Type' },
    { name: 'location', label: 'Location' },
    { name: 'notes', label: 'Notes' },
    { name: 'approvedBy', label: 'Approved By' },
    { name: 'status', label: 'Status' }
  ]
}

export function DataExport() {
  const [activeTab, setActiveTab] = useState("configure")
  const [exportType, setExportType] = useState("employees")
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    fields: [],
    filters: [],
    includeHeader: true,
    encoding: 'utf-8',
    delimiter: ','
  })
  const [filters, setFilters] = useState<ExportFilter[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])

  // Initialize selected fields when export type changes
  React.useEffect(() => {
    const fields = availableFields[exportType as keyof typeof availableFields]
    setSelectedFields(fields.map(field => field.name))
    setConfig(prev => ({ ...prev, fields: fields.map(field => field.name) }))
  }, [exportType])

  // Handle field selection
  const handleFieldChange = useCallback((fieldName: string, checked: boolean) => {
    setSelectedFields(prev => {
      const updated = checked 
        ? [...prev, fieldName]
        : prev.filter(name => name !== fieldName)
      
      setConfig(prevConfig => ({ ...prevConfig, fields: updated }))
      
      return updated
    })
  }, [])

  // Handle select all fields
  const handleSelectAllFields = useCallback((checked: boolean) => {
    const fields = availableFields[exportType as keyof typeof availableFields]
    const fieldNames = fields.map(field => field.name)
    
    setSelectedFields(checked ? fieldNames : [])
    setConfig(prev => ({ ...prev, fields: checked ? fieldNames : [] }))
  }, [exportType])

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: ExportFilter = {
      field: '',
      operator: 'equals',
      value: ''
    }
    setFilters(prev => [...prev, newFilter])
  }, [])

  // Update filter
  const updateFilter = useCallback((index: number, field: keyof ExportFilter, value: any) => {
    setFilters(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Start export
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportProgress({ current: 0, total: 100, percentage: 0, status: 'processing' })
    
    try {
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setExportProgress({
          current: i,
          total: 100,
          percentage: i,
          status: i === 100 ? 'completed' : 'processing',
          message: i === 100 ? 'Export completed' : `Exporting... ${i}%`
        })
      }
      
      // Mock result
      const mockResult: ExportResult = {
        success: true,
        filename: `${exportType}-export.${config.format}`,
        downloadUrl: `/downloads/${exportType}-export.${config.format}`,
        totalRecords: 150,
        exportedRecords: 150,
        fileSize: 2.5 * 1024 * 1024, // 2.5 MB in bytes
        errors: [],
        warnings: []
      }
      
      setExportResult(mockResult)
      setActiveTab("results")
    } catch (error) {
      logger.error('Export error', error as Error)
      setExportProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Export failed'
      })
    } finally {
      setIsExporting(false)
    }
  }, [exportType, config])

  // Download file
  const handleDownload = useCallback(() => {
    if (!exportResult) return
    
    // Create download link
    const a = document.createElement('a')
    a.href = exportResult.downloadUrl
    a.download = exportResult.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [exportResult])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = () => {
    switch (config.format) {
      case 'csv':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
      case 'excel':
        return <FileSpreadsheet className="w-8 h-8 text-blue-400" />
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-400" />
      case 'json':
        return <Database className="w-8 h-8 text-orange-400" />
      default:
        return <File className="w-8 h-8 text-slate-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Data Export</h2>
          <p className="text-slate-400">Export data to CSV, Excel, PDF, or JSON</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="configure" className="data-[state=active]:bg-slate-700">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-slate-700" disabled={!exportResult}>
            <FileText className="w-4 h-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Export Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Data Type</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employees">Employees</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="schedules">Schedules</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Export Format</Label>
                <Select 
                  value={config.format} 
                  onValueChange={(value: any) => setConfig(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Filename (optional)</Label>
                <Input
                  value={config.filename || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, filename: e.target.value }))}
                  placeholder={`export-${new Date().toISOString().split('T')[0]}`}
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              {config.format === 'csv' && (
                <div>
                  <Label className="text-slate-300">Delimiter</Label>
                  <Select 
                    value={config.delimiter} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, delimiter: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Comma (,)</SelectItem>
                      <SelectItem value=";">Semicolon (;)</SelectItem>
                      <SelectItem value="\t">Tab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHeader"
                  checked={config.includeHeader}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeHeader: checked as boolean }))}
                />
                <Label htmlFor="includeHeader" className="text-slate-300">
                  Include header row
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Field Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Select Fields to Export</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectedFields.length === availableFields[exportType as keyof typeof availableFields].length}
                      onCheckedChange={handleSelectAllFields}
                    />
                    <Label htmlFor="selectAll" className="text-slate-300 text-sm">
                      Select All
                    </Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableFields[exportType as keyof typeof availableFields].map(field => (
                    <div key={field.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.name}
                        checked={selectedFields.includes(field.name)}
                        onCheckedChange={(checked) => handleFieldChange(field.name, checked as boolean)}
                      />
                      <Label htmlFor={field.name} className="text-slate-300 text-sm">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Filters</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFilter}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Filter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filters.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No filters added. Export will include all records.
                </p>
              ) : (
                <div className="space-y-3">
                  {filters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(index, 'field', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields[exportType as keyof typeof availableFields].map(field => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={filter.operator}
                        onValueChange={(value: any) => updateFilter(index, 'operator', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                          <SelectItem value="in">In</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        value={filter.value || ''}
                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="bg-slate-700 border-slate-600"
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleExport} 
              disabled={isExporting || selectedFields.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Start Export'}
            </Button>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Export Results</CardTitle>
            </CardHeader>
            <CardContent>
              {exportProgress && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Export Progress</span>
                    <span className="text-slate-300">{exportProgress.percentage}%</span>
                  </div>
                  <Progress value={exportProgress.percentage} className="h-2 bg-slate-700" />
                  {exportProgress.message && (
                    <p className="text-slate-400 text-sm">{exportProgress.message}</p>
                  )}
                </div>
              )}

              {exportResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {getFileIcon()}
                    <div>
                      <p className="text-white font-medium">{exportResult.filename}</p>
                      <p className="text-slate-400 text-sm">
                        {formatFileSize(exportResult.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Total Records</p>
                      <p className="text-white font-medium">{exportResult.totalRecords}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Exported Records</p>
                      <p className="text-emerald-400 font-medium">{exportResult.exportedRecords}</p>
                    </div>
                  </div>

                  {exportResult.errors.length > 0 && (
                    <div>
                      <p className="text-slate-300 mb-2">Errors</p>
                      <div className="space-y-1">
                        {exportResult.errors.map((error, index) => (
                          <div key={index} className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <p className="text-red-400 text-sm">{error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {exportResult.warnings.length > 0 && (
                    <div>
                      <p className="text-slate-300 mb-2">Warnings</p>
                      <div className="space-y-1">
                        {exportResult.warnings.map((warning, index) => (
                          <div key={index} className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <p className="text-yellow-400 text-sm">{warning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700">
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}