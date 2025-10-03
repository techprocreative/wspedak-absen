"use client"

import * as React from "react"
import { useState, useCallback, useRef } from "react"
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
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  Settings,
  ArrowLeft,
  FileSpreadsheet,
  File,
  Database
} from "lucide-react"

// Define interfaces
interface ImportConfig {
  fileType: 'csv' | 'excel' | 'json'
  delimiter?: string
  encoding?: string
  hasHeader?: boolean
  fieldMapping?: FieldMapping[]
}

interface FieldMapping {
  sourceField: string
  targetField: string
  required: boolean
}

interface ImportResult {
  success: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  errors: string[]
  warnings: string[]
}

interface ImportProgress {
  current: number
  total: number
  percentage: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

// Mock data for available fields
const availableFields = {
  employees: [
    { name: 'name', required: true },
    { name: 'email', required: true },
    { name: 'employeeId', required: true },
    { name: 'department', required: true },
    { name: 'role', required: true },
    { name: 'phone', required: false },
    { name: 'address', required: false },
    { name: 'startDate', required: false },
    { name: 'salary', required: false },
    { name: 'manager', required: false },
    { name: 'status', required: false }
  ],
  attendance: [
    { name: 'employeeId', required: true },
    { name: 'date', required: true },
    { name: 'type', required: true },
    { name: 'timestamp', required: true },
    { name: 'location', required: false },
    { name: 'notes', required: false },
    { name: 'approvedBy', required: false },
    { name: 'status', required: false }
  ],
  schedules: [
    { name: 'employeeId', required: true },
    { name: 'startDate', required: true },
    { name: 'endDate', required: true },
    { name: 'shiftType', required: true },
    { name: 'location', required: false },
    { name: 'notes', required: false },
    { name: 'approvedBy', required: false },
    { name: 'status', required: false }
  ]
}

export function DataImport() {
  const [activeTab, setActiveTab] = useState("upload")
  const [importType, setImportType] = useState("employees")
  const [file, setFile] = useState<File | null>(null)
  const [config, setConfig] = useState<ImportConfig>({
    fileType: 'csv',
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true
  })
  const [fieldMapping, setFieldMapping] = useState<FieldMapping[]>([])
  const [sourceFields, setSourceFields] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      // Determine file type
      const extension = selectedFile.name.split('.').pop()?.toLowerCase()
      if (extension) {
        const fileType = extension === 'csv' ? 'csv' : 
                        extension === 'json' ? 'json' : 'excel'
        setConfig(prev => ({ ...prev, fileType: fileType as any }))
      }
      
      // Reset state
      setImportResult(null)
      setImportProgress(null)
      setPreviewData([])
      setSourceFields([])
      setFieldMapping([])
    }
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      
      // Determine file type
      const extension = droppedFile.name.split('.').pop()?.toLowerCase()
      if (extension) {
        const fileType = extension === 'csv' ? 'csv' : 
                        extension === 'json' ? 'json' : 'excel'
        setConfig(prev => ({ ...prev, fileType: fileType as any }))
      }
      
      // Reset state
      setImportResult(null)
      setImportProgress(null)
      setPreviewData([])
      setSourceFields([])
      setFieldMapping([])
    }
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  // Preview file
  const handlePreview = useCallback(async () => {
    if (!file) return
    
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('importType', importType)
      formData.append('config', JSON.stringify(config))
      
      // Mock API call
      // In a real implementation, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock preview data
      const mockPreviewData = [
        { name: 'John Doe', email: 'john@example.com', employeeId: 'EMP001' },
        { name: 'Jane Smith', email: 'jane@example.com', employeeId: 'EMP002' },
        { name: 'Bob Johnson', email: 'bob@example.com', employeeId: 'EMP003' }
      ]
      
      setPreviewData(mockPreviewData)
      
      // Extract source fields
      if (mockPreviewData.length > 0) {
        const fields = Object.keys(mockPreviewData[0])
        setSourceFields(fields)
        
        // Create default field mapping
        const targetFields = availableFields[importType as keyof typeof availableFields]
        const defaultMapping: FieldMapping[] = fields.map(sourceField => {
          // Try to find a matching target field
          const matchingTarget = targetFields.find(target => 
            target.name.toLowerCase() === sourceField.toLowerCase()
          )
          
          return {
            sourceField,
            targetField: matchingTarget?.name || sourceField,
            required: matchingTarget?.required || false
          }
        })
        
        setFieldMapping(defaultMapping)
      }
      
      setActiveTab("mapping")
    } catch (error) {
      console.error('Preview error:', error)
    }
  }, [file, importType, config])

  // Start import
  const handleImport = useCallback(async () => {
    if (!file) return
    
    setIsImporting(true)
    setImportProgress({ current: 0, total: 100, percentage: 0, status: 'processing' })
    
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('importType', importType)
      formData.append('config', JSON.stringify({ ...config, fieldMapping }))
      
      // Mock API call with progress
      // In a real implementation, this would call the actual API
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setImportProgress({
          current: i,
          total: 100,
          percentage: i,
          status: i === 100 ? 'completed' : 'processing',
          message: i === 100 ? 'Import completed' : `Importing... ${i}%`
        })
      }
      
      // Mock result
      const mockResult: ImportResult = {
        success: true,
        totalRows: 150,
        validRows: 145,
        invalidRows: 5,
        errors: [],
        warnings: ['Row 25: Invalid email format', 'Row 47: Missing required field']
      }
      
      setImportResult(mockResult)
      setActiveTab("results")
    } catch (error) {
      console.error('Import error:', error)
      setImportProgress({
        current: 0,
        total: 100,
        percentage: 0,
        status: 'failed',
        message: 'Import failed'
      })
    } finally {
      setIsImporting(false)
    }
  }, [file, importType, config, fieldMapping])

  // Download template
  const handleDownloadTemplate = useCallback(async () => {
    try {
      // Mock API call
      // In a real implementation, this would call the actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create mock template
      const template = availableFields[importType as keyof typeof availableFields]
        .map(field => field.name)
        .join(',')
      
      // Create download link
      const blob = new Blob([template], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${importType}-template.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Template download error:', error)
    }
  }, [importType])

  // Update field mapping
  const updateFieldMapping = useCallback((index: number, targetField: string) => {
    setFieldMapping(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], targetField }
      return updated
    })
  }, [])

  // Get file icon
  const getFileIcon = () => {
    if (!file) return <FileText className="w-8 h-8 text-slate-400" />
    
    const extension = file.name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'csv':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-8 h-8 text-blue-400" />
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
          <h2 className="text-xl font-semibold text-white">Data Import</h2>
          <p className="text-slate-400">Import data from CSV, Excel, or JSON files</p>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadTemplate}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="upload" className="data-[state=active]:bg-slate-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="mapping" className="data-[state=active]:bg-slate-700" disabled={!file}>
            <Settings className="w-4 h-4 mr-2" />
            Field Mapping
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-slate-700" disabled={!importResult}>
            <Eye className="w-4 h-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Import Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Data Type</Label>
                <Select value={importType} onValueChange={setImportType}>
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
                <Label className="text-slate-300">File Format</Label>
                <Select 
                  value={config.fileType} 
                  onValueChange={(value: any) => setConfig(prev => ({ ...prev, fileType: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.fileType === 'csv' && (
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
                  id="hasHeader"
                  checked={config.hasHeader}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, hasHeader: checked as boolean }))}
                />
                <Label htmlFor="hasHeader" className="text-slate-300">
                  File has header row
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Upload File</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-4">
                    {getFileIcon()}
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-slate-400 text-sm">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-white font-medium">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-slate-400 text-sm">
                        Supports CSV, Excel, and JSON files
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {file && (
                <div className="flex justify-end mt-4">
                  <Button onClick={handlePreview} className="bg-emerald-600 hover:bg-emerald-700">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview & Map Fields
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="mapping" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Field Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previewData.length > 0 && (
                  <div>
                    <p className="text-slate-300 mb-2">Preview Data</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            {sourceFields.map(field => (
                              <th key={field} className="text-left p-2 text-slate-300">
                                {field}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 3).map((row, index) => (
                            <tr key={index} className="border-b border-slate-700">
                              {sourceFields.map(field => (
                                <td key={field} className="p-2 text-slate-400">
                                  {row[field]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-slate-300 mb-2">Map Fields</p>
                  <div className="space-y-2">
                    {fieldMapping.map((mapping, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-white font-medium">{mapping.sourceField}</p>
                          {mapping.required && (
                            <p className="text-red-400 text-xs">Required</p>
                          )}
                        </div>
                        <div className="w-4">
                          <ArrowLeft className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <Select
                            value={mapping.targetField}
                            onValueChange={(value) => updateFieldMapping(index, value)}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields[importType as keyof typeof availableFields].map(field => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.name} {field.required && '*'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("upload")}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              {importProgress && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Import Progress</span>
                    <span className="text-slate-300">{importProgress.percentage}%</span>
                  </div>
                  <Progress value={importProgress.percentage} className="h-2 bg-slate-700" />
                  {importProgress.message && (
                    <p className="text-slate-400 text-sm">{importProgress.message}</p>
                  )}
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <p className="text-white font-medium">
                      {importResult.success ? 'Import completed successfully' : 'Import failed'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Total Rows</p>
                      <p className="text-white font-medium">{importResult.totalRows}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Valid Rows</p>
                      <p className="text-emerald-400 font-medium">{importResult.validRows}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Invalid Rows</p>
                      <p className="text-red-400 font-medium">{importResult.invalidRows}</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div>
                      <p className="text-slate-300 mb-2">Errors</p>
                      <div className="space-y-1">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                            <p className="text-red-400 text-sm">{error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult.warnings.length > 0 && (
                    <div>
                      <p className="text-slate-300 mb-2">Warnings</p>
                      <div className="space-y-1">
                        {importResult.warnings.map((warning, index) => (
                          <div key={index} className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <p className="text-yellow-400 text-sm">{warning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => {
                    setFile(null)
                    setImportResult(null)
                    setImportProgress(null)
                    setActiveTab("upload")
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}