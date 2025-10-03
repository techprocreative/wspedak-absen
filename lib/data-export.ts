import { z } from 'zod'

// Define interfaces for data export
export interface ExportResult {
  success: boolean
  data?: any[]
  filename?: string
  downloadUrl?: string
  errors: string[]
  warnings: string[]
  totalRecords: number
  exportedRecords: number
  fileSize: number
}

export interface ExportProgress {
  current: number
  total: number
  percentage: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

export interface ExportFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: any
}

export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  fields: string[]
  filters?: ExportFilter[]
  filename?: string
  encoding?: string
  delimiter?: string
  includeHeader?: boolean
  dateFormat?: string
  timeZone?: string
  compress?: boolean
  encrypt?: boolean
}

export interface ExportSchedule {
  id: string
  name: string
  enabled: boolean
  type: 'employees' | 'attendance' | 'schedules' | 'custom'
  format: 'csv' | 'excel' | 'pdf' | 'json'
  fields: string[]
  filters: ExportFilter[]
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  recipients: string[]
  nextRun: string
  lastRun?: string
}

// Data Export class
export class DataExporter {
  private config: ExportConfig
  private progressCallback?: (progress: ExportProgress) => void

  constructor(config: ExportConfig) {
    this.config = config
  }

  // Set progress callback
  onProgress(callback: (progress: ExportProgress) => void): void {
    this.progressCallback = callback
  }

  // Update progress
  private updateProgress(current: number, total: number, status: ExportProgress['status'], message?: string): void {
    if (this.progressCallback) {
      this.progressCallback({
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        status,
        message
      })
    }
  }

  // Apply filters to data
  applyFilters(data: any[]): any[] {
    if (!this.config.filters || this.config.filters.length === 0) {
      return data
    }

    return data.filter(row => {
      return this.config.filters!.every(filter => {
        const value = row[filter.field]
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
          case 'greater_than':
            return Number(value) > Number(filter.value)
          case 'less_than':
            return Number(value) < Number(filter.value)
          case 'between':
            if (Array.isArray(filter.value) && filter.value.length === 2) {
              return Number(value) >= Number(filter.value[0]) && Number(value) <= Number(filter.value[1])
            }
            return false
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value)
          default:
            return true
        }
      })
    })
  }

  // Select fields from data
  selectFields(data: any[]): any[] {
    if (!this.config.fields || this.config.fields.length === 0) {
      return data
    }

    return data.map(row => {
      const selectedRow: any = {}
      this.config.fields!.forEach(field => {
        selectedRow[field] = row[field]
      })
      return selectedRow
    })
  }

  // Format data for export
  formatData(data: any[]): any[] {
    return data.map(row => {
      const formattedRow: any = {}
      
      Object.keys(row).forEach(key => {
        let value = row[key]
        
        // Format dates
        if (value instanceof Date) {
          const dateFormat = this.config.dateFormat || 'YYYY-MM-DD'
          formattedRow[key] = this.formatDate(value, dateFormat)
        }
        // Format null/undefined
        else if (value === null || value === undefined) {
          formattedRow[key] = ''
        }
        // Format objects
        else if (typeof value === 'object') {
          formattedRow[key] = JSON.stringify(value)
        }
        // Default
        else {
          formattedRow[key] = value
        }
      })
      
      return formattedRow
    })
  }

  // Format date
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
  }

  // Generate filename
  generateFilename(): string {
    if (this.config.filename) {
      return this.config.filename
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const extension = this.getExtension()
    return `export-${timestamp}.${extension}`
  }

  // Get file extension
  private getExtension(): string {
    switch (this.config.format) {
      case 'csv':
        return 'csv'
      case 'excel':
        return 'xlsx'
      case 'pdf':
        return 'pdf'
      case 'json':
        return 'json'
      default:
        return 'txt'
    }
  }

  // Export to CSV
  private exportToCSV(data: any[]): string {
    const delimiter = this.config.delimiter || ','
    const includeHeader = this.config.includeHeader !== false
    
    if (data.length === 0) return ''
    
    let csv = ''
    
    // Add header
    if (includeHeader && data.length > 0) {
      csv += Object.keys(data[0]).join(delimiter) + '\n'
    }
    
    // Add data rows
    data.forEach(row => {
      const values = Object.values(row).map(value => {
        // Escape quotes and wrap in quotes if contains delimiter or quotes
        const stringValue = String(value || '')
        if (stringValue.includes(delimiter) || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csv += values.join(delimiter) + '\n'
    })
    
    return csv
  }

  // Export to Excel
  private exportToExcel(data: any[]): ArrayBuffer {
    // Mock implementation
    // In a real implementation, this would use a library like xlsx
    const csv = this.exportToCSV(data)
    const encoder = new TextEncoder()
    return encoder.encode(csv).buffer
  }

  // Export to PDF
  private exportToPDF(data: any[]): ArrayBuffer {
    // Mock implementation
    // In a real implementation, this would use a library like jsPDF
    const csv = this.exportToCSV(data)
    const encoder = new TextEncoder()
    return encoder.encode(csv).buffer
  }

  // Export to JSON
  private exportToJSON(data: any[]): string {
    return JSON.stringify(data, null, 2)
  }

  // Export data with progress tracking
  async exportData(
    data: any[],
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    if (onProgress) {
      this.onProgress(onProgress)
    }

    try {
      this.updateProgress(0, 100, 'processing', 'Applying filters...')
      
      // Apply filters
      const filteredData = this.applyFilters(data)
      
      this.updateProgress(25, 100, 'processing', 'Selecting fields...')
      
      // Select fields
      const selectedData = this.selectFields(filteredData)
      
      this.updateProgress(50, 100, 'processing', 'Formatting data...')
      
      // Format data
      const formattedData = this.formatData(selectedData)
      
      this.updateProgress(75, 100, 'processing', `Exporting to ${this.config.format}...`)
      
      // Export to format
      let exportData: string | ArrayBuffer
      let fileSize = 0
      
      switch (this.config.format) {
        case 'csv':
          exportData = this.exportToCSV(formattedData)
          fileSize = new Blob([exportData]).size
          break
        case 'excel':
          exportData = this.exportToExcel(formattedData)
          fileSize = (exportData as ArrayBuffer).byteLength
          break
        case 'pdf':
          exportData = this.exportToPDF(formattedData)
          fileSize = (exportData as ArrayBuffer).byteLength
          break
        case 'json':
          exportData = this.exportToJSON(formattedData)
          fileSize = new Blob([exportData]).size
          break
        default:
          throw new Error(`Unsupported export format: ${this.config.format}`)
      }
      
      // Generate filename
      const filename = this.generateFilename()
      
      // Create download URL
      const blob = new Blob([exportData], { 
        type: this.getMimeType() 
      })
      const downloadUrl = URL.createObjectURL(blob)
      
      this.updateProgress(100, 100, 'completed', 'Export completed successfully')
      
      return {
        success: true,
        data: formattedData,
        filename,
        downloadUrl,
        errors: [],
        warnings: [],
        totalRecords: data.length,
        exportedRecords: formattedData.length,
        fileSize
      }
    } catch (error) {
      this.updateProgress(0, 100, 'failed', `Export failed: ${error}`)
      
      return {
        success: false,
        errors: [String(error)],
        warnings: [],
        totalRecords: data.length,
        exportedRecords: 0,
        fileSize: 0
      }
    }
  }

  // Get MIME type
  private getMimeType(): string {
    switch (this.config.format) {
      case 'csv':
        return 'text/csv'
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'pdf':
        return 'application/pdf'
      case 'json':
        return 'application/json'
      default:
        return 'text/plain'
    }
  }

  // Create export template
  static createTemplate(type: 'employees' | 'attendance' | 'schedules', format: 'csv' | 'excel'): string {
    let template: any[] = []
    
    switch (type) {
      case 'employees':
        template = [
          {
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
          }
        ]
        break
      case 'attendance':
        template = [
          {
            employeeId: 'EMP001',
            date: '2025-01-01',
            type: 'check-in',
            timestamp: '2025-01-01T08:00:00Z',
            location: 'Office',
            notes: '',
            approvedBy: '',
            status: 'approved'
          }
        ]
        break
      case 'schedules':
        template = [
          {
            employeeId: 'EMP001',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            shiftType: 'Regular',
            location: 'Office',
            notes: '',
            approvedBy: '',
            status: 'active'
          }
        ]
        break
    }

    const exporter = new DataExporter({
      format,
      fields: Object.keys(template[0]),
      includeHeader: true
    })

    switch (format) {
      case 'csv':
        return exporter.exportToCSV(template)
      case 'excel':
        // In a real implementation, this would return a proper Excel file
        return exporter.exportToCSV(template)
      default:
        return JSON.stringify(template, null, 2)
    }
  }

  // Schedule export
  static async scheduleExport(schedule: ExportSchedule): Promise<void> {
    // In a real implementation, this would set up a scheduled job
    console.log(`Scheduling export: ${schedule.name}`)
    console.log(`Next run: ${schedule.nextRun}`)
  }

  // Get available fields for a data type
  static getAvailableFields(type: 'employees' | 'attendance' | 'schedules'): string[] {
    switch (type) {
      case 'employees':
        return [
          'id', 'name', 'email', 'employeeId', 'department', 'role', 
          'phone', 'address', 'startDate', 'salary', 'manager', 'status'
        ]
      case 'attendance':
        return [
          'id', 'employeeId', 'date', 'type', 'timestamp', 
          'location', 'notes', 'approvedBy', 'status'
        ]
      case 'schedules':
        return [
          'id', 'employeeId', 'startDate', 'endDate', 'shiftType', 
          'location', 'notes', 'approvedBy', 'status'
        ]
      default:
        return []
    }
  }
}

// Utility functions
export const validateExportConfig = (config: ExportConfig): boolean => {
  return !!config.format && ['csv', 'excel', 'pdf', 'json'].includes(config.format)
}

export const createExportFilter = (
  field: string, 
  operator: ExportFilter['operator'], 
  value: any
): ExportFilter => {
  return { field, operator, value }
}

export const formatDateForExport = (
  date: Date, 
  format: string = 'YYYY-MM-DD'
): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}