"use client"

export const dynamic = 'force-dynamic'

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Layout is provided by app/admin/layout.tsx
import {
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  FileArchive,
  Users,
  Calendar,
  Settings,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Filter,
  Search,
  CalendarDays,
  Mail,
  Save,
  FolderOpen
} from "lucide-react"

// Define interfaces for data export
interface ExportTemplate {
  id: string
  name: string
  description: string
  type: "employees" | "attendance" | "schedules" | "custom"
  format: "csv" | "excel" | "pdf" | "json"
  fields: string[]
  filters: ExportFilter[]
  schedule?: ExportSchedule
}

interface ExportFilter {
  field: string
  operator: "equals" | "contains" | "greater_than" | "less_than" | "between" | "in"
  value: any
}

interface ExportSchedule {
  enabled: boolean
  frequency: "daily" | "weekly" | "monthly"
  time: string
  recipients: string[]
  nextRun: string
}

interface ExportJob {
  id: string
  name: string
  type: "employees" | "attendance" | "schedules" | "custom"
  format: "csv" | "excel" | "pdf" | "json"
  status: "pending" | "processing" | "completed" | "failed" | "scheduled"
  progress: number
  totalRecords: number
  processedRecords: number
  fileSize: number
  downloadUrl?: string
  errors: string[]
  warnings: string[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
  filters: ExportFilter[]
  scheduledFor?: string
}

interface FieldDefinition {
  key: string
  label: string
  type: "string" | "number" | "date" | "boolean"
  required: boolean
  description?: string
}

export default function DataExportPage() {
  const router = useRouter()
  
  // State management
  const [activeTab, setActiveTab] = useState("create")
  const [exportType, setExportType] = useState<"employees" | "attendance" | "schedules">("employees")
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf" | "json">("csv")
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [filters, setFilters] = useState<ExportFilter[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null)
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([])
  const [templates, setTemplates] = useState<ExportTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedule, setSchedule] = useState<ExportSchedule>({
    enabled: false,
    frequency: "weekly",
    time: "09:00",
    recipients: [],
    nextRun: ""
  })
  const [loading, setLoading] = useState(true)

  // Field definitions for different export types
  const fieldDefinitions: { [key: string]: FieldDefinition[] } = {
    employees: [
      { key: "id", label: "ID", type: "string", required: true },
      { key: "name", label: "Name", type: "string", required: true },
      { key: "email", label: "Email", type: "string", required: true },
      { key: "employeeId", label: "Employee ID", type: "string", required: true },
      { key: "department", label: "Department", type: "string", required: true },
      { key: "role", label: "Role", type: "string", required: true },
      { key: "phone", label: "Phone", type: "string", required: false },
      { key: "address", label: "Address", type: "string", required: false },
      { key: "startDate", label: "Start Date", type: "date", required: false },
      { key: "salary", label: "Salary", type: "number", required: false },
      { key: "manager", label: "Manager", type: "string", required: false },
      { key: "status", label: "Status", type: "string", required: false }
    ],
    attendance: [
      { key: "id", label: "ID", type: "string", required: true },
      { key: "employeeId", label: "Employee ID", type: "string", required: true },
      { key: "employeeName", label: "Employee Name", type: "string", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "type", label: "Type", type: "string", required: true },
      { key: "timestamp", label: "Timestamp", type: "date", required: true },
      { key: "location", label: "Location", type: "string", required: false },
      { key: "notes", label: "Notes", type: "string", required: false },
      { key: "approvedBy", label: "Approved By", type: "string", required: false },
      { key: "status", label: "Status", type: "string", required: false }
    ],
    schedules: [
      { key: "id", label: "ID", type: "string", required: true },
      { key: "employeeId", label: "Employee ID", type: "string", required: true },
      { key: "employeeName", label: "Employee Name", type: "string", required: true },
      { key: "startDate", label: "Start Date", type: "date", required: true },
      { key: "endDate", label: "End Date", type: "date", required: true },
      { key: "shiftType", label: "Shift Type", type: "string", required: true },
      { key: "location", label: "Location", type: "string", required: false },
      { key: "notes", label: "Notes", type: "string", required: false },
      { key: "approvedBy", label: "Approved By", type: "string", required: false },
      { key: "status", label: "Status", type: "string", required: false }
    ]
  }

  // Export templates
  const exportTemplates: ExportTemplate[] = [
    {
      id: "employee-basic",
      name: "Employee Basic Info",
      description: "Basic employee information",
      type: "employees",
      format: "csv",
      fields: ["id", "name", "email", "employeeId", "department", "role"],
      filters: []
    },
    {
      id: "attendance-monthly",
      name: "Monthly Attendance Report",
      description: "Complete attendance data for a month",
      type: "attendance",
      format: "excel",
      fields: ["id", "employeeId", "employeeName", "date", "type", "timestamp", "status"],
      filters: [
        { field: "date", operator: "between", value: { start: "2025-01-01", end: "2025-01-31" } }
      ]
    },
    {
      id: "schedule-weekly",
      name: "Weekly Schedule",
      description: "Work schedules for the current week",
      type: "schedules",
      format: "pdf",
      fields: ["employeeId", "employeeName", "startDate", "endDate", "shiftType", "location"],
      filters: [
        { field: "startDate", operator: "between", value: { start: "2025-01-20", end: "2025-01-26" } }
      ]
    }
  ]

  // Mock export history
  const mockExportHistory: ExportJob[] = [
    {
      id: "1",
      name: "Employee Directory - January 2025",
      type: "employees",
      format: "excel",
      status: "completed",
      progress: 100,
      totalRecords: 150,
      processedRecords: 150,
      fileSize: 2.5,
      downloadUrl: "/downloads/employees-jan-2025.xlsx",
      errors: [],
      warnings: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      createdBy: "Admin",
      filters: []
    },
    {
      id: "2",
      name: "Attendance Report - Q4 2024",
      type: "attendance",
      format: "pdf",
      status: "failed",
      progress: 75,
      totalRecords: 5000,
      processedRecords: 3750,
      fileSize: 0,
      errors: ["PDF generation failed: Memory limit exceeded"],
      warnings: [],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      createdBy: "HR Manager",
      filters: [
        { field: "date", operator: "between", value: { start: "2024-10-01", end: "2024-12-31" } }
      ]
    },
    {
      id: "3",
      name: "Weekly Schedule - Auto Export",
      type: "schedules",
      format: "csv",
      status: "scheduled",
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      fileSize: 0,
      errors: [],
      warnings: [],
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      createdBy: "System",
      filters: [],
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setTemplates(exportTemplates)
      setExportHistory(mockExportHistory)
      
      // Set default fields for selected export type
      const defaultFields = fieldDefinitions[exportType]
        .filter(field => field.required)
        .map(field => field.key)
      setSelectedFields(defaultFields)
    } catch (error) {
      console.error("Error fetching export data:", error)
    } finally {
      setLoading(false)
    }
  }, [exportType])

  // Handle field selection
  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  // Add filter
  const addFilter = () => {
    const newFilter: ExportFilter = {
      field: "",
      operator: "equals",
      value: ""
    }
    setFilters(prev => [...prev, newFilter])
  }

  // Update filter
  const updateFilter = (index: number, updates: Partial<ExportFilter>) => {
    setFilters(prev => 
      prev.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    )
  }

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index))
  }

  // Start export
  const startExport = async () => {
    if (selectedFields.length === 0) return

    setIsExporting(true)
    setExportProgress(0)

    const newJob: ExportJob = {
      id: Date.now().toString(),
      name: `${exportType} Export - ${new Date().toLocaleDateString()}`,
      type: exportType,
      format: exportFormat,
      status: "processing",
      progress: 0,
      totalRecords: Math.floor(Math.random() * 1000) + 100,
      processedRecords: 0,
      fileSize: 0,
      errors: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: "Admin",
      filters: filters
    }

    setCurrentJob(newJob)
    setActiveTab("progress")

    // Simulate export progress
    const interval = setInterval(() => {
      setCurrentJob(prev => {
        if (!prev) return null
        
        const newProgress = Math.min(prev.progress + 5, 100)
        const newProcessedRecords = Math.floor((newProgress / 100) * prev.totalRecords)
        
        if (newProgress >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          return {
            ...prev,
            progress: 100,
            processedRecords: prev.totalRecords,
            status: "completed",
            completedAt: new Date().toISOString(),
            fileSize: Math.random() * 5 + 0.5,
            downloadUrl: `/downloads/export-${prev.id}.${exportFormat}`
          }
        }
        
        return {
          ...prev,
          progress: newProgress,
          processedRecords: newProcessedRecords
        }
      })
    }, 200)
  }

  // Save as template
  const saveAsTemplate = () => {
    const newTemplate: ExportTemplate = {
      id: Date.now().toString(),
      name: `${exportType} Custom Template`,
      description: "Custom export template",
      type: exportType,
      format: exportFormat,
      fields: selectedFields,
      filters: filters,
      schedule: showSchedule ? schedule : undefined
    }
    
    setTemplates(prev => [...prev, newTemplate])
    alert("Template saved successfully!")
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "processing":
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case "scheduled":
        return <Clock className="w-4 h-4 text-yellow-400" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "scheduled":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Get format icon
  const getFormatIcon = (format: string) => {
    switch (format) {
      case "csv":
        return <FileSpreadsheet className="w-4 h-4" />
      case "excel":
        return <FileSpreadsheet className="w-4 h-4" />
      case "pdf":
        return <FileText className="w-4 h-4" />
      case "json":
        return <FileJson className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Update selected fields when export type changes
  useEffect(() => {
    const defaultFields = fieldDefinitions[exportType]
      .filter(field => field.required)
      .map(field => field.key)
    setSelectedFields(defaultFields)
  }, [exportType])

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Data Export</h1>
              <p className="text-slate-400">Export data in various formats with custom filters</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/data-management")}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Data Management
              </Button>
            </div>
        </div>

          {/* Export Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="create" className="data-[state=active]:bg-slate-700">
                <FileText className="w-4 h-4 mr-2" />
                Create Export
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-slate-700">
                <FolderOpen className="w-4 h-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-slate-700" disabled={!currentJob}>
                <Play className="w-4 h-4 mr-2" />
                Export Progress
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
                <Clock className="w-4 h-4 mr-2" />
                Export History
              </TabsTrigger>
            </TabsList>

            {/* Create Export Tab */}
            <TabsContent value="create" className="space-y-6">
              {/* Export Type Selection */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Export Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Export Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Export Type</Label>
                      <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
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
                      <Label className="text-slate-300">Format</Label>
                      <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
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
                      <Label className="text-slate-300">Export Name</Label>
                      <Input
                        placeholder="Enter export name"
                        className="bg-slate-700 border-slate-600"
                        defaultValue={`${exportType} Export - ${new Date().toLocaleDateString()}`}
                      />
                    </div>
                  </div>

                  {/* Field Selection */}
                  <div>
                    <Label className="text-slate-300 mb-3 block">Select Fields</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {fieldDefinitions[exportType].map((field) => (
                        <div key={field.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.key}
                            checked={selectedFields.includes(field.key)}
                            onCheckedChange={() => handleFieldToggle(field.key)}
                          />
                          <Label htmlFor={field.key} className="text-sm text-slate-300">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filters */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-slate-300">Filters</Label>
                      <Button variant="outline" size="sm" onClick={addFilter}>
                        <Filter className="w-4 h-4 mr-2" />
                        Add Filter
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                          <Select
                            value={filter.field}
                            onValueChange={(value) => updateFilter(index, { field: value })}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldDefinitions[exportType].map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={filter.operator}
                            onValueChange={(value: any) => updateFilter(index, { operator: value })}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500">
                              <SelectValue />
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
                            placeholder="Value"
                            className="bg-slate-600 border-slate-500"
                            value={filter.value || ""}
                            onChange={(e) => updateFilter(index, { value: e.target.value })}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilter(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-slate-300">Schedule Export</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSchedule(!showSchedule)}
                      >
                        {showSchedule ? "Hide" : "Show"} Schedule
                      </Button>
                    </div>

                    {showSchedule && (
                      <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="schedule-enabled"
                            checked={schedule.enabled}
                            onCheckedChange={(checked) => 
                              setSchedule(prev => ({ ...prev, enabled: checked as boolean }))
                            }
                          />
                          <Label htmlFor="schedule-enabled" className="text-slate-300">
                            Enable scheduled export
                          </Label>
                        </div>

                        {schedule.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-slate-300">Frequency</Label>
                              <Select
                                value={schedule.frequency}
                                onValueChange={(value: any) => 
                                  setSchedule(prev => ({ ...prev, frequency: value }))
                                }
                              >
                                <SelectTrigger className="bg-slate-600 border-slate-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-slate-300">Time</Label>
                              <Input
                                type="time"
                                value={schedule.time}
                                onChange={(e) => 
                                  setSchedule(prev => ({ ...prev, time: e.target.value }))
                                }
                                className="bg-slate-600 border-slate-500"
                              />
                            </div>

                            <div>
                              <Label className="text-slate-300">Recipients</Label>
                              <Input
                                placeholder="email@example.com"
                                className="bg-slate-600 border-slate-500"
                                value={schedule.recipients.join(", ")}
                                onChange={(e) => 
                                  setSchedule(prev => ({ 
                                    ...prev, 
                                    recipients: e.target.value.split(",").map(r => r.trim())
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={saveAsTemplate}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>
                    <Button
                      onClick={startExport}
                      disabled={selectedFields.length === 0 || isExporting}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Start Export
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Export Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div key={template.id} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getFormatIcon(template.format)}
                            <div>
                              <p className="text-white font-medium">{template.name}</p>
                              <p className="text-slate-400 text-sm">{template.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-slate-600 text-slate-300">
                              {template.type}
                            </Badge>
                            <Badge className="bg-slate-600 text-slate-300">
                              {template.format.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-400">
                            {template.fields.length} fields selected
                            {template.filters.length > 0 && ` • ${template.filters.length} filters`}
                            {template.schedule?.enabled && " • Scheduled"}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              {currentJob && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      {getStatusIcon(currentJob.status)}
                      Export Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-300">
                            Processing {currentJob.name}
                          </span>
                          <span className="text-sm text-slate-300">
                            {currentJob.processedRecords} / {currentJob.totalRecords} records
                          </span>
                        </div>
                        <Progress value={currentJob.progress} className="h-2 bg-slate-700" />
                        <p className="text-center text-white mt-2">{currentJob.progress}%</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Started</p>
                          <p className="text-white">
                            {currentJob.startedAt && new Date(currentJob.startedAt).toLocaleString()}
                          </p>
                        </div>
                        {currentJob.completedAt && (
                          <div>
                            <p className="text-slate-400">Completed</p>
                            <p className="text-white">
                              {new Date(currentJob.completedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {currentJob.status === "completed" && currentJob.downloadUrl && (
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <div>
                            <p className="text-emerald-400 font-medium">Export completed!</p>
                            <p className="text-slate-400 text-sm">
                              File size: {currentJob.fileSize.toFixed(2)} MB
                            </p>
                          </div>
                          <Button>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      )}

                      {currentJob.errors.length > 0 && (
                        <Alert className="bg-red-500/10 border-red-500/30">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <AlertDescription className="text-red-400">
                            <div className="space-y-1">
                              {currentJob.errors.map((error, index) => (
                                <p key={index} className="text-sm">{error}</p>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Export History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {exportHistory.map((job) => (
                      <div key={job.id} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getFormatIcon(job.format)}
                            {getStatusIcon(job.status)}
                            <div>
                              <p className="text-white font-medium">{job.name}</p>
                              <p className="text-slate-400 text-sm">
                                {job.type} • {job.processedRecords}/{job.totalRecords} records
                                {job.fileSize > 0 && ` • ${job.fileSize.toFixed(2)} MB`}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <p className="text-slate-400">
                            Created by {job.createdBy} • {new Date(job.createdAt).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2">
                            {job.status === "processing" && (
                              <div className="flex items-center gap-2">
                                <Progress value={job.progress} className="w-20 h-2 bg-slate-600" />
                                <span className="text-slate-300">{job.progress}%</span>
                              </div>
                            )}
                            {job.status === "completed" && job.downloadUrl && (
                              <Button size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>

                        {job.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {job.errors.map((error, index) => (
                              <p key={index} className="text-xs text-red-400">• {error}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
  )
}
