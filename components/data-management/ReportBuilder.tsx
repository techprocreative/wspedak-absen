"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  ReportBuilder, 
  ReportConfig, 
  ReportField, 
  ReportFilter, 
  ReportSort, 
  ReportAggregation,
  ChartType 
} from "@/lib/report-builder"
import {
  BarChart,
  BarChart3,
  LineChart,
  PieChart,
  FileText,
  Download,
  Save,
  Play,
  Settings,
  Filter,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Eye,
  Edit,
  Copy
} from "lucide-react"

export function ReportBuilderComponent() {
  const [activeTab, setActiveTab] = useState("builder")
  const [activeBuilderTab, setActiveBuilderTab] = useState("fields")
  const [reports, setReports] = useState<ReportConfig[]>([])
  const [currentReport, setCurrentReport] = useState<ReportConfig | null>(null)
  const [reportBuilder, setReportBuilder] = useState<ReportBuilder | null>(null)
  const [selectedFields, setSelectedFields] = useState<ReportField[]>([])
  const [filters, setFilters] = useState<ReportFilter[]>([])
  const [sortBy, setSortBy] = useState<ReportSort[]>([])
  const [aggregations, setAggregations] = useState<ReportAggregation[]>([])
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [isBuilding, setIsBuilding] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [reportName, setReportName] = useState("")
  const [reportDescription, setReportDescription] = useState("")
  const [reportDataSource, setReportDataSource] = useState("employees")
  const [availableFields, setAvailableFields] = useState<ReportField[]>([])

  // Initialize report builder
  useEffect(() => {
    const builder = new ReportBuilder()
    setReportBuilder(builder)
    
    // Load available fields
    const fields = ReportBuilder.getAvailableFields(reportDataSource)
    setAvailableFields(fields)
    
    // Load reports
    loadReports()
  }, [reportDataSource])

  // Load reports
  const loadReports = useCallback(async () => {
    try {
      const reportsList = await ReportBuilder.getAll()
      setReports(reportsList)
    } catch (error) {
      logger.error('Failed to load reports', error as Error)
    }
  }, [])

  // Handle data source change
  const handleDataSourceChange = useCallback((dataSource: string) => {
    setReportDataSource(dataSource)
    const fields = ReportBuilder.getAvailableFields(dataSource)
    setAvailableFields(fields)
    
    // Reset state
    setSelectedFields([])
    setFilters([])
    setSortBy([])
    setAggregations([])
    setReportData(null)
  }, [])

  // Handle field selection
  const handleFieldToggle = useCallback((field: ReportField) => {
    const isSelected = selectedFields.some(f => f.name === field.name)
    
    if (isSelected) {
      setSelectedFields(prev => prev.filter(f => f.name !== field.name))
    } else {
      setSelectedFields(prev => [...prev, { ...field, visible: true, order: prev.length }])
    }
  }, [selectedFields])

  // Handle select all fields
  const handleSelectAllFields = useCallback(() => {
    if (selectedFields.length === availableFields.length) {
      setSelectedFields([])
    } else {
      setSelectedFields(availableFields.map(field => ({ ...field, visible: true, order: 0 })))
    }
  }, [selectedFields, availableFields])

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: ReportFilter = {
      field: '',
      operator: 'equals',
      value: ''
    }
    setFilters(prev => [...prev, newFilter])
  }, [])

  // Update filter
  const updateFilter = useCallback((index: number, field: keyof ReportFilter, value: any) => {
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

  // Add sort
  const addSort = useCallback(() => {
    const newSort: ReportSort = {
      field: '',
      direction: 'asc'
    }
    setSortBy(prev => [...prev, newSort])
  }, [])

  // Update sort
  const updateSort = useCallback((index: number, field: keyof ReportSort, value: any) => {
    setSortBy(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  // Remove sort
  const removeSort = useCallback((index: number) => {
    setSortBy(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Add aggregation
  const addAggregation = useCallback(() => {
    const newAggregation: ReportAggregation = {
      field: '',
      function: 'count',
      label: ''
    }
    setAggregations(prev => [...prev, newAggregation])
  }, [])

  // Update aggregation
  const updateAggregation = useCallback((index: number, field: keyof ReportAggregation, value: any) => {
    setAggregations(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  // Remove aggregation
  const removeAggregation = useCallback((index: number) => {
    setAggregations(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Build report
  const handleBuildReport = useCallback(async () => {
    if (!reportBuilder) return
    
    setIsBuilding(true)
    
    try {
      // Configure report builder
      reportBuilder
        .setName(reportName || 'Untitled Report')
        .setDescription(reportDescription || '')
        .setDataSource(reportDataSource as any)
      
      // Add fields
      reportBuilder.getConfig().fields = []
      selectedFields.forEach(field => {
        reportBuilder.addField(field)
      })
      
      // Add filters
      reportBuilder.getConfig().filters = []
      filters.forEach(filter => {
        if (filter.field) {
          reportBuilder.addFilter(filter)
        }
      })
      
      // Add sort
      reportBuilder.getConfig().sortBy = []
      sortBy.forEach(sort => {
        if (sort.field) {
          reportBuilder.addSort(sort)
        }
      })
      
      // Add aggregations
      reportBuilder.getConfig().aggregations = []
      aggregations.forEach(agg => {
        if (agg.field) {
          reportBuilder.addAggregation(agg)
        }
      })
      
      // Set chart type
      reportBuilder.setChartType(chartType)
      
      // Build report
      const data = await reportBuilder.build()
      setReportData(data)
      setActiveTab("preview")
    } catch (error) {
      logger.error('Failed to build report', error as Error)
    } finally {
      setIsBuilding(false)
    }
  }, [reportBuilder, reportName, reportDescription, reportDataSource, selectedFields, filters, sortBy, aggregations, chartType])

  // Save report
  const handleSaveReport = useCallback(async () => {
    if (!reportBuilder || !reportName) return
    
    try {
      // Configure report builder
      reportBuilder
        .setName(reportName)
        .setDescription(reportDescription)
        .setDataSource(reportDataSource as any)
      
      // Add fields
      reportBuilder.getConfig().fields = []
      selectedFields.forEach(field => {
        reportBuilder.addField(field)
      })
      
      // Add filters
      reportBuilder.getConfig().filters = []
      filters.forEach(filter => {
        if (filter.field) {
          reportBuilder.addFilter(filter)
        }
      })
      
      // Add sort
      reportBuilder.getConfig().sortBy = []
      sortBy.forEach(sort => {
        if (sort.field) {
          reportBuilder.addSort(sort)
        }
      })
      
      // Add aggregations
      reportBuilder.getConfig().aggregations = []
      aggregations.forEach(agg => {
        if (agg.field) {
          reportBuilder.addAggregation(agg)
        }
      })
      
      // Set chart type
      reportBuilder.setChartType(chartType)
      
      // Save report
      await reportBuilder.save()
      
      // Reload reports
      await loadReports()
      
      setShowSaveDialog(false)
    } catch (error) {
      logger.error('Failed to save report', error as Error)
    }
  }, [reportBuilder, reportName, reportDescription, reportDataSource, selectedFields, filters, sortBy, aggregations, chartType, loadReports])

  // Load report
  const handleLoadReport = useCallback(async (reportId: string) => {
    try {
      const builder = await ReportBuilder.load(reportId)
      const config = builder.getConfig()
      
      setReportBuilder(builder)
      setCurrentReport(config)
      setReportName(config.name)
      setReportDescription(config.description)
      setReportDataSource(config.dataSource)
      setSelectedFields(config.fields)
      setFilters(config.filters)
      setSortBy(config.sortBy || [])
      setAggregations(config.aggregations || [])
      setChartType(config.chartType || 'bar')
      
      // Load available fields
      const fields = ReportBuilder.getAvailableFields(config.dataSource)
      setAvailableFields(fields)
      
      setActiveTab("builder")
    } catch (error) {
      logger.error('Failed to load report', error as Error)
    }
  }, [])

  // Delete report
  const handleDeleteReport = useCallback(async (reportId: string) => {
    try {
      await ReportBuilder.delete(reportId)
      await loadReports()
    } catch (error) {
      logger.error('Failed to delete report', error as Error)
    }
  }, [loadReports])

  // Export report
  const handleExportReport = useCallback(async (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportBuilder) return
    
    try {
      const blob = await reportBuilder.export(format)
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportName || 'report'}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('Failed to export report', error as Error)
    }
  }, [reportBuilder, reportName])

  // Duplicate report
  const handleDuplicateReport = useCallback(async (reportId: string) => {
    try {
      const builder = await ReportBuilder.load(reportId)
      const config = builder.getConfig()
      
      // Create a new report with the same configuration
      const newBuilder = new ReportBuilder({
        ...config,
        id: undefined,
        name: `${config.name} (Copy)`,
        createdAt: undefined,
        updatedAt: undefined
      })
      
      await newBuilder.save()
      await loadReports()
    } catch (error) {
      logger.error('Failed to duplicate report', error as Error)
    }
  }, [loadReports])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Report Builder</h2>
          <p className="text-slate-400">Create custom reports with charts and aggregations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="builder" className="data-[state=active]:bg-slate-700">
            <Settings className="w-4 h-4 mr-2" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="preview" className="data-[state=active]:bg-slate-700" disabled={!reportData}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="saved" className="data-[state=active]:bg-slate-700">
            <FileText className="w-4 h-4 mr-2" />
            Saved Reports
          </TabsTrigger>
        </TabsList>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Data Source</Label>
                <Select value={reportDataSource} onValueChange={handleDataSourceChange}>
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
                <Label className="text-slate-300">Report Name</Label>
                <Input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                  className="bg-slate-700 border-slate-600"
                />
              </div>

              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Enter report description"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeBuilderTab} onValueChange={setActiveBuilderTab} className="space-y-6">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="fields" className="data-[state=active]:bg-slate-700">
                Fields
              </TabsTrigger>
              <TabsTrigger value="filters" className="data-[state=active]:bg-slate-700">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="sort" className="data-[state=active]:bg-slate-700">
                Sort
              </TabsTrigger>
              <TabsTrigger value="aggregations" className="data-[state=active]:bg-slate-700">
                Aggregations
              </TabsTrigger>
              <TabsTrigger value="chart" className="data-[state=active]:bg-slate-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Chart
              </TabsTrigger>
            </TabsList>

            {/* Fields Tab */}
            <TabsContent value="fields" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Select Fields</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllFields}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableFields.map(field => (
                      <div key={field.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.name}
                          checked={selectedFields.some(f => f.name === field.name)}
                          onCheckedChange={() => handleFieldToggle(field)}
                        />
                        <Label htmlFor={field.name} className="text-slate-300 text-sm">
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-6">
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
                      No filters added. Click "Add Filter" to add a filter.
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
                              {availableFields.map(field => (
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
                              <SelectItem value="not_equals">Not Equals</SelectItem>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                              <SelectItem value="between">Between</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="in">In</SelectItem>
                              <SelectItem value="not_in">Not In</SelectItem>
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
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sort Tab */}
            <TabsContent value="sort" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Sort By</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addSort}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Sort
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sortBy.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">
                      No sort criteria added. Click "Add Sort" to add a sort criterion.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sortBy.map((sort, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={sort.field}
                            onValueChange={(value) => updateSort(index, 'field', value)}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map(field => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={sort.direction}
                            onValueChange={(value: any) => updateSort(index, 'direction', value)}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeSort(index)}
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aggregations Tab */}
            <TabsContent value="aggregations" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Aggregations</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addAggregation}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Aggregation
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aggregations.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">
                      No aggregations added. Click "Add Aggregation" to add an aggregation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {aggregations.map((agg, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={agg.field}
                            onValueChange={(value) => updateAggregation(index, 'field', value)}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map(field => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={agg.function}
                            onValueChange={(value: any) => updateAggregation(index, 'function', value)}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sum">Sum</SelectItem>
                              <SelectItem value="avg">Average</SelectItem>
                              <SelectItem value="min">Minimum</SelectItem>
                              <SelectItem value="max">Maximum</SelectItem>
                              <SelectItem value="count">Count</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Input
                            value={agg.label || ''}
                            onChange={(e) => updateAggregation(index, 'label', e.target.value)}
                            placeholder="Label"
                            className="bg-slate-700 border-slate-600"
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAggregation(index)}
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chart Tab */}
            <TabsContent value="chart" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Chart Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Chart Type</Label>
                    <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                        <SelectItem value="radar">Radar Chart</SelectItem>
                        <SelectItem value="polarArea">Polar Area Chart</SelectItem>
                        <SelectItem value="scatter">Scatter Plot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              onClick={handleBuildReport}
              disabled={isBuilding || selectedFields.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {isBuilding ? 'Building...' : 'Build Report'}
            </Button>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          {reportData && (
            <>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Report Preview</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportReport('pdf')}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportReport('excel')}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportReport('csv')}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.summary && (
                    <div className="mb-6">
                      <h3 className="text-white font-medium mb-3">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(reportData.summary).map(([key, value]) => (
                          <div key={key} className="p-3 bg-slate-700/30 rounded">
                            <p className="text-slate-400 text-sm">{key}</p>
                            <p className="text-white font-medium">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reportData.chartData && (
                    <div className="mb-6">
                      <h3 className="text-white font-medium mb-3">Chart</h3>
                      <div className="p-4 bg-slate-700/30 rounded">
                        <div className="h-64 flex items-center justify-center text-slate-400">
                          Chart visualization would be displayed here
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-white font-medium mb-3">Data</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            {reportData.headers.map((header: string, index: number) => (
                              <th key={index} className="text-left p-2 text-slate-300">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.rows.slice(0, 10).map((row: any[], index: number) => (
                            <tr key={index} className="border-b border-slate-700">
                              {row.map((cell: any, cellIndex: number) => (
                                <td key={cellIndex} className="p-2 text-slate-400">
                                  {String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.rows.length > 10 && (
                        <p className="text-slate-400 text-sm mt-2">
                          Showing 10 of {reportData.rows.length} rows
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Saved Reports Tab */}
        <TabsContent value="saved" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No saved reports found.
                  </p>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{report.name}</h3>
                          <p className="text-slate-400 text-sm">{report.description}</p>
                          <p className="text-slate-400 text-sm">
                            Created on {new Date(report.createdAt).toLocaleDateString()} by {report.createdBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {report.dataSource}
                          </Badge>
                          {report.chartType && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {report.chartType}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadReport(report.id)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateReport(report.id)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Report Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Save Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Report Name</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Enter report description"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReport}
                disabled={!reportName}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}