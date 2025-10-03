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
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
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
  RotateCcw
} from "lucide-react"
// Layout is provided by app/admin/layout.tsx

// Define interfaces for data import
interface ImportTemplate {
  id: string
  name: string
  description: string
  type: "employees" | "attendance" | "schedules"
  requiredFields: string[]
  optionalFields: string[]
  sampleData: any[]
  downloadUrl: string
}

interface ImportJob {
  id: string
  filename: string
  type: "employees" | "attendance" | "schedules"
  status: "pending" | "processing" | "completed" | "failed" | "paused"
  progress: number
  totalRecords: number
  processedRecords: number
  errors: string[]
  warnings: string[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
}

interface ImportPreview {
  headers: string[]
  data: any[]
  totalRows: number
  sampleRows: any[]
  mapping: { [key: string]: string }
  validation: {
    validRows: number
    invalidRows: number
    errors: string[]
  }
}

export default function DataImportPage() {
  const router = useRouter()
  
  // State management
  const [activeTab, setActiveTab] = useState("upload")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<"employees" | "attendance" | "schedules">("employees")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null)
  const [importHistory, setImportHistory] = useState<ImportJob[]>([])
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Import templates
  const importTemplates: ImportTemplate[] = [
    {
      id: "employees",
      name: "Employee Data",
      description: "Import employee information including personal details and employment data",
      type: "employees",
      requiredFields: ["name", "email", "employeeId", "department", "role"],
      optionalFields: ["phone", "address", "startDate", "salary", "manager"],
      sampleData: [
        { name: "John Doe", email: "john@example.com", employeeId: "EMP001", department: "IT", role: "Developer" },
        { name: "Jane Smith", email: "jane@example.com", employeeId: "EMP002", department: "HR", role: "Manager" }
      ],
      downloadUrl: "/templates/employees-template.csv"
    },
    {
      id: "attendance",
      name: "Attendance Records",
      description: "Import attendance data including check-in and check-out records",
      type: "attendance",
      requiredFields: ["employeeId", "date", "type", "timestamp"],
      optionalFields: ["location", "notes", "approvedBy"],
      sampleData: [
        { employeeId: "EMP001", date: "2025-01-01", type: "check-in", timestamp: "2025-01-01T08:00:00Z" },
        { employeeId: "EMP001", date: "2025-01-01", type: "check-out", timestamp: "2025-01-01T17:00:00Z" }
      ],
      downloadUrl: "/templates/attendance-template.csv"
    },
    {
      id: "schedules",
      name: "Work Schedules",
      description: "Import work schedules and shift assignments",
      type: "schedules",
      requiredFields: ["employeeId", "startDate", "endDate", "shiftType"],
      optionalFields: ["location", "notes", "approvedBy"],
      sampleData: [
        { employeeId: "EMP001", startDate: "2025-01-01", endDate: "2025-01-31", shiftType: "Regular" },
        { employeeId: "EMP002", startDate: "2025-01-01", endDate: "2025-01-31", shiftType: "Night" }
      ],
      downloadUrl: "/templates/schedules-template.csv"
    }
  ]

  // Mock import history
  const mockImportHistory: ImportJob[] = [
    {
      id: "1",
      filename: "employees_january.csv",
      type: "employees",
      status: "completed",
      progress: 100,
      totalRecords: 150,
      processedRecords: 150,
      errors: [],
      warnings: ["2 employees had missing phone numbers"],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      createdBy: "Admin"
    },
    {
      id: "2",
      filename: "attendance_records.csv",
      type: "attendance",
      status: "failed",
      progress: 45,
      totalRecords: 500,
      processedRecords: 225,
      errors: ["Invalid date format in row 226", "Missing employee ID in row 227"],
      warnings: [],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      createdBy: "HR Manager"
    },
    {
      id: "3",
      filename: "schedules_february.csv",
      type: "schedules",
      status: "processing",
      progress: 65,
      totalRecords: 75,
      processedRecords: 49,
      errors: [],
      warnings: ["1 schedule has conflicting dates"],
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      createdBy: "Admin"
    }
  ]

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setTemplates(importTemplates)
      setImportHistory(mockImportHistory)
    } catch (error) {
      console.error("Error fetching import data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setPreview(null)
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Simulate file processing
      setTimeout(() => {
        clearInterval(interval)
        setUploadProgress(100)
        
        // Generate preview
        const mockPreview: ImportPreview = {
          headers: ["name", "email", "employeeId", "department", "role"],
          data: [
            { name: "John Doe", email: "john@example.com", employeeId: "EMP001", department: "IT", role: "Developer" },
            { name: "Jane Smith", email: "jane@example.com", employeeId: "EMP002", department: "HR", role: "Manager" }
          ],
          totalRows: 25,
          sampleRows: [
            { name: "John Doe", email: "john@example.com", employeeId: "EMP001", department: "IT", role: "Developer" }
          ],
          mapping: {
            "name": "name",
            "email": "email",
            "employeeId": "employeeId",
            "department": "department",
            "role": "role"
          },
          validation: {
            validRows: 23,
            invalidRows: 2,
            errors: ["Row 15: Invalid email format", "Row 22: Missing required field: department"]
          }
        }
        
        setPreview(mockPreview)
        setIsUploading(false)
        setActiveTab("preview")
      }, 2000)
    } catch (error) {
      console.error("Error uploading file:", error)
      setIsUploading(false)
    }
  }

  // Start import process
  const startImport = async () => {
    if (!preview) return

    const newJob: ImportJob = {
      id: Date.now().toString(),
      filename: selectedFile?.name || "unknown.csv",
      type: importType,
      status: "processing",
      progress: 0,
      totalRecords: preview.totalRows,
      processedRecords: 0,
      errors: [],
      warnings: preview.validation.errors.length > 0 ? ["Some records have validation warnings"] : [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: "Admin"
    }

    setCurrentJob(newJob)
    setActiveTab("progress")

    // Simulate import progress
    const interval = setInterval(() => {
      setCurrentJob(prev => {
        if (!prev) return null
        
        const newProgress = Math.min(prev.progress + 5, 100)
        const newProcessedRecords = Math.floor((newProgress / 100) * prev.totalRecords)
        
        if (newProgress >= 100) {
          clearInterval(interval)
          return {
            ...prev,
            progress: 100,
            processedRecords: prev.totalRecords,
            status: "completed",
            completedAt: new Date().toISOString()
          }
        }
        
        return {
          ...prev,
          progress: newProgress,
          processedRecords: newProcessedRecords
        }
      })
    }, 500)
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
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-400" />
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
      case "paused":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Data Import</h1>
              <p className="text-slate-400">Import data from CSV, Excel, or JSON files</p>
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

          {/* Import Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-slate-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-slate-700" disabled={!preview}>
                <Eye className="w-4 h-4 mr-2" />
                Preview & Map
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-slate-700" disabled={!currentJob}>
                <Play className="w-4 h-4 mr-2" />
                Import Progress
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
                <Clock className="w-4 h-4 mr-2" />
                Import History
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              {/* Import Type Selection */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Select Import Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {importTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          importType === template.type
                            ? "bg-emerald-500/20 border-emerald-500/30"
                            : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                        }`}
                        onClick={() => setImportType(template.type)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {template.type === "employees" && <Users className="w-5 h-5 text-emerald-400" />}
                          {template.type === "attendance" && <Calendar className="w-5 h-5 text-blue-400" />}
                          {template.type === "schedules" && <Settings className="w-5 h-5 text-purple-400" />}
                          <h3 className="font-medium text-white">{template.name}</h3>
                        </div>
                        <p className="text-sm text-slate-400">{template.description}</p>
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-400 hover:text-emerald-300 p-0 h-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Download template
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download Template
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Upload File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white mb-2">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-slate-400 text-sm mb-4">
                      Supports CSV, Excel (.xlsx), and JSON files
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.json"
                      onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" className="cursor-pointer">
                        Select File
                      </Button>
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-emerald-400" />
                          <div>
                            <p className="text-white font-medium">{selectedFile.name}</p>
                            <p className="text-slate-400 text-sm">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Uploading...</span>
                        <span className="text-sm text-slate-300">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2 bg-slate-700" />
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || isUploading}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Preview Data
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              {preview && (
                <>
                  {/* Validation Summary */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Validation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{preview.totalRows}</p>
                          <p className="text-sm text-slate-400">Total Records</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">{preview.validation.validRows}</p>
                          <p className="text-sm text-slate-400">Valid Records</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-400">{preview.validation.invalidRows}</p>
                          <p className="text-sm text-slate-400">Invalid Records</p>
                        </div>
                      </div>

                      {preview.validation.errors.length > 0 && (
                        <Alert className="mt-4 bg-red-500/10 border-red-500/30">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <AlertDescription className="text-red-400">
                            <div className="space-y-1">
                              {preview.validation.errors.map((error, index) => (
                                <p key={index} className="text-sm">{error}</p>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Field Mapping */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Field Mapping</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(preview.mapping).map(([source, target]) => (
                          <div key={source} className="flex items-center justify-between">
                            <span className="text-slate-300">{source}</span>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                            <span className="text-white">{target}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sample Data */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Sample Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              {preview.headers.map((header) => (
                                <th key={header} className="text-left p-2 text-slate-300">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.sampleRows.map((row, index) => (
                              <tr key={index} className="border-b border-slate-700">
                                {preview.headers.map((header) => (
                                  <td key={header} className="p-2 text-white">
                                    {row[header] || "-"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("upload")}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Upload
                    </Button>
                    <Button
                      onClick={startImport}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Import
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              {currentJob && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      {getStatusIcon(currentJob.status)}
                      Import Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-300">
                            Processing {currentJob.filename}
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

                      {currentJob.warnings.length > 0 && (
                        <Alert className="bg-yellow-500/10 border-yellow-500/30">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <AlertDescription className="text-yellow-400">
                            <div className="space-y-1">
                              {currentJob.warnings.map((warning, index) => (
                                <p key={index} className="text-sm">{warning}</p>
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
                  <CardTitle className="text-white">Import History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {importHistory.map((job) => (
                      <div key={job.id} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(job.status)}
                            <div>
                              <p className="text-white font-medium">{job.filename}</p>
                              <p className="text-slate-400 text-sm">
                                {job.type} • {job.processedRecords}/{job.totalRecords} records
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
                          {job.status === "processing" && (
                            <div className="flex items-center gap-2">
                              <Progress value={job.progress} className="w-20 h-2 bg-slate-600" />
                              <span className="text-slate-300">{job.progress}%</span>
                            </div>
                          )}
                        </div>

                        {(job.errors.length > 0 || job.warnings.length > 0) && (
                          <div className="mt-2 space-y-1">
                            {job.errors.map((error, index) => (
                              <p key={index} className="text-xs text-red-400">• {error}</p>
                            ))}
                            {job.warnings.map((warning, index) => (
                              <p key={index} className="text-xs text-yellow-400">• {warning}</p>
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
