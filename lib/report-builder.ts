
import { z } from 'zod'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Define interfaces for report builder
export interface ReportConfig {
  id: string
  name: string
  description: string
  dataSource: 'employees' | 'attendance' | 'schedules'
  fields: ReportField[]
  filters: ReportFilter[]
  groupBy?: string[]
  sortBy?: ReportSort[]
  aggregations?: ReportAggregation[]
  chartType?: ChartType
  chartOptions?: ChartOptions
  exportFormat?: 'pdf' | 'excel' | 'csv'
  schedule?: ReportSchedule
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ReportField {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean'
  format?: string
  visible: boolean
  order: number
}

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in' | 'not_in'
  value: any
  label?: string
}

export interface ReportSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface ReportAggregation {
  field: string
  function: 'sum' | 'avg' | 'min' | 'max' | 'count'
  label: string
}

export interface ChartOptions {
  title?: string
  xAxis?: {
    label: string
    type: 'category' | 'value' | 'time'
  }
  yAxis?: {
    label: string
    min?: number
    max?: number
  }
  colors?: string[]
  legend?: {
    position: 'top' | 'bottom' | 'left' | 'right'
  }
}

export interface ReportSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  recipients: string[]
  nextRun: string
}

export interface ReportData {
  headers: string[]
  rows: any[][]
  summary?: Record<string, any>
  chartData?: ChartData
}

export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
}

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter'

// Report Builder class
export class ReportBuilder {
  private config: ReportConfig

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      id: config.id || this.generateId(),
      name: config.name || 'Untitled Report',
      description: config.description || '',
      dataSource: config.dataSource || 'employees',
      fields: config.fields || [],
      filters: config.filters || [],
      groupBy: config.groupBy || [],
      sortBy: config.sortBy || [],
      aggregations: config.aggregations || [],
      chartType: config.chartType || 'bar',
      chartOptions: config.chartOptions || {},
      exportFormat: config.exportFormat || 'pdf',
      schedule: config.schedule,
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: config.updatedAt || new Date().toISOString(),
      createdBy: config.createdBy || 'System'
    }
  }

  // Set report name
  setName(name: string): ReportBuilder {
    this.config.name = name
    return this
  }

  // Set report description
  setDescription(description: string): ReportBuilder {
    this.config.description = description
    return this
  }

  // Set data source
  setDataSource(dataSource: 'employees' | 'attendance' | 'schedules'): ReportBuilder {
    this.config.dataSource = dataSource
    return this
  }

  // Add field
  addField(field: Omit<ReportField, 'order'>): ReportBuilder {
    const order = this.config.fields.length
    this.config.fields.push({ ...field, order })
    return this
  }

  // Remove field
  removeField(fieldName: string): ReportBuilder {
    this.config.fields = this.config.fields.filter(field => field.name !== fieldName)
    return this
  }

  // Update field
  updateField(fieldName: string, updates: Partial<ReportField>): ReportBuilder {
    const index = this.config.fields.findIndex(field => field.name === fieldName)
    if (index !== -1) {
      this.config.fields[index] = { ...this.config.fields[index], ...updates }
    }
    return this
  }

  // Add filter
  addFilter(filter: ReportFilter): ReportBuilder {
    this.config.filters.push(filter)
    return this
  }

  // Remove filter
  removeFilter(index: number): ReportBuilder {
    this.config.filters.splice(index, 1)
    return this
  }

  // Update filter
  updateFilter(index: number, updates: Partial<ReportFilter>): ReportBuilder {
    if (index >= 0 && index < this.config.filters.length) {
      this.config.filters[index] = { ...this.config.filters[index], ...updates }
    }
    return this
  }

  // Set group by
  setGroupBy(fields: string[]): ReportBuilder {
    this.config.groupBy = fields
    return this
  }

  // Add sort
  addSort(sort: ReportSort): ReportBuilder {
    if (!this.config.sortBy) {
      this.config.sortBy = []
    }
    this.config.sortBy.push(sort)
    return this
  }

  // Remove sort
  removeSort(field: string): ReportBuilder {
    if (this.config.sortBy) {
      this.config.sortBy = this.config.sortBy.filter(sort => sort.field !== field)
    }
    return this
  }

  // Add aggregation
  addAggregation(aggregation: ReportAggregation): ReportBuilder {
    if (!this.config.aggregations) {
      this.config.aggregations = []
    }
    this.config.aggregations.push(aggregation)
    return this
  }

  // Remove aggregation
  removeAggregation(field: string): ReportBuilder {
    if (this.config.aggregations) {
      this.config.aggregations = this.config.aggregations.filter(
        agg => agg.field !== field
      )
    }
    return this
  }

  // Set chart type
  setChartType(chartType: ChartType): ReportBuilder {
    this.config.chartType = chartType
    return this
  }

  // Set chart options
  setChartOptions(options: ChartOptions): ReportBuilder {
    this.config.chartOptions = { ...this.config.chartOptions, ...options }
    return this
  }

  // Set export format
  setExportFormat(format: 'pdf' | 'excel' | 'csv'): ReportBuilder {
    this.config.exportFormat = format
    return this
  }

  // Set schedule
  setSchedule(schedule: ReportSchedule): ReportBuilder {
    this.config.schedule = schedule
    return this
  }

  // Get config
  getConfig(): ReportConfig {
    return { ...this.config }
  }

  // Build report
  async build(): Promise<ReportData> {
    // Mock implementation
    // In a real implementation, this would query the database and build the report
    const { dataSource, fields, filters, groupBy, sortBy, aggregations, chartType } = this.config
    
    // Get mock data based on data source
    let mockData: any[] = []
    switch (dataSource) {
      case 'employees':
        mockData = getMockEmployeeData()
        break
      case 'attendance':
        mockData = getMockAttendanceData()
        break
      case 'schedules':
        mockData = getMockScheduleData()
        break
    }
    
    // Apply filters
    let filteredData = mockData
    for (const filter of filters) {
      filteredData = applyFilter(filteredData, filter)
    }
    
    // Apply group by
    if (groupBy && groupBy.length > 0) {
      filteredData = applyGroupBy(filteredData, groupBy, aggregations || [])
    }
    
    // Apply sort
    if (sortBy) {
      for (const sort of sortBy) {
        filteredData = applySort(filteredData, sort)
      }
    }
    
    // Build report data
    const headers = fields
      .filter(field => field.visible)
      .sort((a, b) => a.order - b.order)
      .map(field => field.label)
    
    const rows = filteredData.map(row => {
      return fields
        .filter(field => field.visible)
        .sort((a, b) => a.order - b.order)
        .map(field => {
          let value = row[field.name]
          
          // Apply formatting
          if (field.format && value !== undefined && value !== null) {
            switch (field.type) {
              case 'date':
                value = formatDate(value, field.format)
                break
              case 'number':
                value = formatNumber(value, field.format)
                break
              default:
                break
            }
          }
          
          return value
        })
    })
    
    // Generate chart data if chart type is specified
    let chartData: ChartData | undefined
    if (chartType && groupBy && groupBy.length > 0) {
      chartData = generateChartData(filteredData, groupBy, aggregations || [], chartType)
    }
    
    // Generate summary
    let summary: Record<string, any> | undefined
    if (aggregations && aggregations.length > 0) {
      summary = {}
      for (const agg of aggregations) {
        summary[agg.label] = calculateAggregation(filteredData, agg)
      }
    }
    
    return {
      headers,
      rows,
      summary,
      chartData
    }
  }

  // Export report
  async export(format?: 'pdf' | 'excel' | 'csv'): Promise<Blob> {
    const exportFormat = format || this.config.exportFormat
    const reportData = await this.build()
    
    // Mock implementation
    // In a real implementation, this would generate and return the actual file
    switch (exportFormat) {
      case 'pdf':
        return new Blob(['PDF content'], { type: 'application/pdf' })
      case 'excel':
        return new Blob(['Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      case 'csv':
        return new Blob(['CSV content'], { type: 'text/csv' })
      default:
        return new Blob(['Report content'], { type: 'text/plain' })
    }
  }

  // Save report
  async save(): Promise<ReportConfig> {
    // Mock implementation
    // In a real implementation, this would save to database
    this.config.updatedAt = new Date().toISOString()
    return this.config
  }

  // Load report
  static async load(id: string): Promise<ReportBuilder> {
    // Mock implementation
    // In a real implementation, this would load from database
    const mockConfig: ReportConfig = {
      id,
      name: 'Sample Report',
      description: 'A sample report',
      dataSource: 'employees',
      fields: [
        { name: 'name', label: 'Name', type: 'string', visible: true, order: 0 },
        { name: 'department', label: 'Department', type: 'string', visible: true, order: 1 },
        { name: 'salary', label: 'Salary', type: 'number', visible: true, order: 2 }
      ],
      filters: [],
      groupBy: ['department'],
      sortBy: [{ field: 'name', direction: 'asc' }],
      aggregations: [
        { field: 'salary', function: 'avg', label: 'Average Salary' }
      ],
      chartType: 'bar',
      chartOptions: {
        title: 'Employee Report',
        xAxis: { label: 'Department', type: 'category' },
        yAxis: { label: 'Salary' }
      },
      exportFormat: 'pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'System'
    }
    
    return new ReportBuilder(mockConfig)
  }

  // Get available fields for data source
  static getAvailableFields(dataSource: string): ReportField[] {
    switch (dataSource) {
      case 'employees':
        return [
          { name: 'id', label: 'ID', type: 'string', visible: false, order: 0 },
          { name: 'name', label: 'Name', type: 'string', visible: true, order: 1 },
          { name: 'email', label: 'Email', type: 'string', visible: true, order: 2 },
          { name: 'employeeId', label: 'Employee ID', type: 'string', visible: true, order: 3 },
          { name: 'department', label: 'Department', type: 'string', visible: true, order: 4 },
          { name: 'role', label: 'Role', type: 'string', visible: true, order: 5 },
          { name: 'phone', label: 'Phone', type: 'string', visible: false, order: 6 },
          { name: 'address', label: 'Address', type: 'string', visible: false, order: 7 },
          { name: 'startDate', label: 'Start Date', type: 'date', visible: true, order: 8 },
          { name: 'salary', label: 'Salary', type: 'number', visible: true, order: 9 },
          { name: 'manager', label: 'Manager', type: 'string', visible: false, order: 10 },
          { name: 'status', label: 'Status', type: 'string', visible: true, order: 11 }
        ]
      case 'attendance':
        return [
          { name: 'id', label: 'ID', type: 'string', visible: false, order: 0 },
          { name: 'employeeId', label: 'Employee ID', type: 'string', visible: true, order: 1 },
          { name: 'date', label: 'Date', type: 'date', visible: true, order: 2 },
          { name: 'type', label: 'Type', type: 'string', visible: true, order: 3 },
          { name: 'timestamp', label: 'Timestamp', type: 'date', visible: true, order: 4 },
          { name: 'location', label: 'Location', type: 'string', visible: false, order: 5 },
          { name: 'notes', label: 'Notes', type: 'string', visible: false, order: 6 },
          { name: 'approvedBy', label: 'Approved By', type: 'string', visible: false, order: 7 },
          { name: 'status', label: 'Status', type: 'string', visible: true, order: 8 }
        ]
      case 'schedules':
        return [
          { name: 'id', label: 'ID', type: 'string', visible: false, order: 0 },
          { name: 'employeeId', label: 'Employee ID', type: 'string', visible: true, order: 1 },
          { name: 'startDate', label: 'Start Date', type: 'date', visible: true, order: 2 },
          { name: 'endDate', label: 'End Date', type: 'date', visible: true, order: 3 },
          { name: 'shiftType', label: 'Shift Type', type: 'string', visible: true, order: 4 },
          { name: 'location', label: 'Location', type: 'string', visible: false, order: 5 },
          { name: 'notes', label: 'Notes', type: 'string', visible: false, order: 6 },
          { name: 'approvedBy', label: 'Approved By', type: 'string', visible: false, order: 7 },
          { name: 'status', label: 'Status', type: 'string', visible: true, order: 8 }
        ]
      default:
        return []
    }
  }

  // Get all reports
  static async getAll(): Promise<ReportConfig[]> {
    // Mock implementation
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'report-1',
        name: 'Employee Department Report',
        description: 'Report showing employees by department',
        dataSource: 'employees',
        fields: [
          { name: 'name', label: 'Name', type: 'string', visible: true, order: 0 },
          { name: 'department', label: 'Department', type: 'string', visible: true, order: 1 },
          { name: 'role', label: 'Role', type: 'string', visible: true, order: 2 }
        ],
        filters: [],
        groupBy: ['department'],
        sortBy: [{ field: 'name', direction: 'asc' }],
        aggregations: [
          { field: 'id', function: 'count', label: 'Employee Count' }
        ],
        chartType: 'bar',
        chartOptions: {
          title: 'Employees by Department',
          xAxis: { label: 'Department', type: 'category' },
          yAxis: { label: 'Count' }
        },
        exportFormat: 'pdf',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Admin'
      },
      {
        id: 'report-2',
        name: 'Attendance Summary',
        description: 'Summary of attendance records',
        dataSource: 'attendance',
        fields: [
          { name: 'employeeId', label: 'Employee ID', type: 'string', visible: true, order: 0 },
          { name: 'date', label: 'Date', type: 'date', visible: true, order: 1 },
          { name: 'type', label: 'Type', type: 'string', visible: true, order: 2 }
        ],
        filters: [
          { field: 'date', operator: 'greater_than', value: '2025-01-01' }
        ],
        groupBy: ['type'],
        sortBy: [{ field: 'date', direction: 'desc' }],
        aggregations: [
          { field: 'id', function: 'count', label: 'Total Records' }
        ],
        chartType: 'pie',
        chartOptions: {
          title: 'Attendance Types',
          legend: { position: 'bottom' }
        },
        exportFormat: 'excel',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Admin'
      }
    ]
  }

  // Delete report
  static async delete(id: string): Promise<boolean> {
    // Mock implementation
    // In a real implementation, this would delete from database
    logger.info('Deleting report: ${id}')
    return true
  }

  // Generate ID
  private generateId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Helper functions
function applyFilter(data: any[], filter: ReportFilter): any[] {
  const { field, operator, value } = filter
  
  return data.filter(item => {
    const itemValue = item[field]
    
    switch (operator) {
      case 'equals':
        return itemValue === value
      case 'not_equals':
        return itemValue !== value
      case 'greater_than':
        return itemValue > value
      case 'less_than':
        return itemValue < value
      case 'between':
        return itemValue >= value[0] && itemValue <= value[1]
      case 'contains':
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
      case 'in':
        return value.includes(itemValue)
      case 'not_in':
        return !value.includes(itemValue)
      default:
        return true
    }
  })
}

function applyGroupBy(data: any[], groupBy: string[], aggregations: ReportAggregation[]): any[] {
  // Mock implementation
  // In a real implementation, this would properly group the data
  return data
}

function applySort(data: any[], sort: ReportSort): any[] {
  return [...data].sort((a, b) => {
    const aValue = a[sort.field]
    const bValue = b[sort.field]
    
    if (aValue < bValue) {
      return sort.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sort.direction === 'asc' ? 1 : -1
    }
    return 0
  })
}

function generateChartData(data: any[], groupBy: string[], aggregations: ReportAggregation[], chartType: ChartType): ChartData {
  // Mock implementation
  // In a real implementation, this would generate proper chart data
  return {
    labels: ['Group 1', 'Group 2', 'Group 3'],
    datasets: [
      {
        label: 'Dataset 1',
        data: [10, 20, 30],
        backgroundColor: ['#8884d8', '#82ca9d', '#ffc658']
      }
    ]
  }
}

function calculateAggregation(data: any[], aggregation: ReportAggregation): any {
  // Mock implementation
  // In a real implementation, this would calculate the actual aggregation
  switch (aggregation.function) {
    case 'sum':
      return 100
    case 'avg':
      return 50
    case 'min':
      return 10
    case 'max':
      return 90
    case 'count':
      return data.length
    default:
      return null
  }
}

function formatDate(date: string, format: string): string {
  // Mock implementation
  // In a real implementation, this would properly format dates
  return new Date(date).toLocaleDateString()
}

function formatNumber(number: number, format: string): string {
  // Mock implementation
  // In a real implementation, this would properly format numbers
  return number.toLocaleString()
}

// Mock data functions
function getMockEmployeeData(): any[] {
  return [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      employeeId: 'EMP001',
      department: 'IT',
      role: 'Developer',
      phone: '+1234567890',
      address: '123 Main St',
      startDate: '2023-01-01',
      salary: 75000,
      manager: 'Jane Smith',
      status: 'active'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      employeeId: 'EMP002',
      department: 'HR',
      role: 'Manager',
      phone: '+1234567891',
      address: '456 Oak Ave',
      startDate: '2022-06-15',
      salary: 85000,
      manager: '',
      status: 'active'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      employeeId: 'EMP003',
      department: 'Finance',
      role: 'Accountant',
      phone: '+1234567892',
      address: '789 Pine Rd',
      startDate: '2023-03-10',
      salary: 70000,
      manager: 'Jane Smith',
      status: 'active'
    }
  ]
}

function getMockAttendanceData(): any[] {
  return [
    {
      id: '1',
      employeeId: 'EMP001',
      date: '2025-01-01',
      type: 'check-in',
      timestamp: '2025-01-01T08:00:00Z',
      location: 'Office',
      notes: '',
      approvedBy: '',
      status: 'approved'
    },
    {
      id: '2',
      employeeId: 'EMP001',
      date: '2025-01-01',
      type: 'check-out',
      timestamp: '2025-01-01T17:00:00Z',
      location: 'Office',
      notes: '',
      approvedBy: '',
      status: 'approved'
    },
    {
      id: '3',
      employeeId: 'EMP002',
      date: '2025-01-01',
      type: 'check-in',
      timestamp: '2025-01-01T08:30:00Z',
      location: 'Office',
      notes: '',
      approvedBy: '',
      status: 'approved'
    }
  ]
}

function getMockScheduleData(): any[] {
  return [
    {
      id: '1',
      employeeId: 'EMP001',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      shiftType: 'Regular',
      location: 'Office',
      notes: '',
      approvedBy: '',
      status: 'active'
    },
    {
      id: '2',
      employeeId: 'EMP002',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      shiftType: 'Regular',
      location: 'Office',
      notes: '',
      approvedBy: '',
      status: 'active'
    },
    {
      id: '3',
      employeeId: 'EMP003',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      shiftType: 'Night',
      location: 'Remote',
      notes: 'Night shift for January',
      approvedBy: 'Jane Smith',
      status: 'active'
    }
  ]
}