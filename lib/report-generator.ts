/**
 * Report Generator
 * Generates reports in various formats (PDF, Excel, CSV, JSON)
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { serverDbManager } from './server-db'

import { logger } from '@/lib/logger'
export interface ReportConfig {
  type: 'attendance' | 'performance' | 'employee' | 'department' | 'custom'
  dataSource: string
  dateRange: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
  fields: string[]
  format: 'pdf' | 'excel' | 'csv' | 'json'
  groupBy?: string
  aggregations?: {
    field: string
    function: 'sum' | 'avg' | 'count' | 'min' | 'max'
  }[]
  title?: string
  description?: string
}

export class ReportGenerator {
  /**
   * Generate report based on configuration
   */
  async generateReport(config: ReportConfig): Promise<Buffer | string> {
    logger.info('Generating report', { type: config.type, format: config.format })
    
    // Fetch data based on config
    const data = await this.fetchReportData(config)
    
    if (data.length === 0) {
      throw new Error('No data found for the specified criteria')
    }
    
    // Generate report in specified format
    switch (config.format) {
      case 'pdf':
        return this.generatePDF(data, config)
      case 'excel':
        return this.generateExcel(data, config)
      case 'csv':
        return this.generateCSV(data, config)
      case 'json':
        return this.generateJSON(data, config)
      default:
        throw new Error(`Unsupported format: ${config.format}`)
    }
  }
  
  /**
   * Fetch data based on report configuration
   */
  private async fetchReportData(config: ReportConfig): Promise<any[]> {
    switch (config.type) {
      case 'attendance':
        return this.fetchAttendanceData(config)
      case 'employee':
        return this.fetchEmployeeData(config)
      case 'department':
        return this.fetchDepartmentData(config)
      default:
        throw new Error(`Unsupported report type: ${config.type}`)
    }
  }
  
  /**
   * Fetch attendance data
   */
  private async fetchAttendanceData(config: ReportConfig): Promise<any[]> {
    const records = await serverDbManager.getAttendanceRecords({
      startDate: config.dateRange.start,
      endDate: config.dateRange.end
    })
    
    // Enrich with user details
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        const user = await serverDbManager.getUser(record.userId)
        return {
          id: record.id,
          userId: record.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'N/A',
          department: user?.department || 'N/A',
          position: user?.position || 'N/A',
          employeeId: user?.employeeId || 'N/A',
          timestamp: record.timestamp,
          date: record.timestamp.toLocaleDateString('id-ID'),
          time: record.timestamp.toLocaleTimeString('id-ID'),
          type: record.type,
          status: record.status || this.calculateStatus(record),
          location: this.formatLocation(record.location),
          notes: record.notes || '-',
          verified: record.verified ? 'Yes' : 'No'
        }
      })
    )
    
    // Apply filters
    let filteredRecords = enrichedRecords
    if (config.filters) {
      filteredRecords = filteredRecords.filter(record => {
        return Object.entries(config.filters!).every(([key, value]) => {
          if (value === 'all' || value === '' || value === undefined) return true
          return record[key] === value || record[key]?.toString().toLowerCase().includes(value.toLowerCase())
        })
      })
    }
    
    // Apply grouping and aggregations if needed
    if (config.groupBy) {
      return this.applyGrouping(filteredRecords, config)
    }
    
    return filteredRecords
  }
  
  /**
   * Fetch employee data
   */
  private async fetchEmployeeData(config: ReportConfig): Promise<any[]> {
    const users = await serverDbManager.getUsers(config.filters)
    
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'N/A',
      position: user.position || 'N/A',
      employeeId: user.employeeId || 'N/A',
      phone: user.phone || 'N/A',
      address: user.address || 'N/A',
      startDate: user.startDate?.toLocaleDateString('id-ID') || 'N/A',
      status: user.isActive ? 'Active' : 'Inactive',
      createdAt: user.createdAt.toLocaleDateString('id-ID')
    }))
  }
  
  /**
   * Fetch department data
   */
  private async fetchDepartmentData(config: ReportConfig): Promise<any[]> {
    const users = await serverDbManager.getUsers()
    
    // Group by department
    const departmentMap = new Map<string, any>()
    
    for (const user of users) {
      const dept = user.department || 'Unassigned'
      
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          totalEmployees: 0,
          admins: 0,
          managers: 0,
          employees: 0
        })
      }
      
      const deptData = departmentMap.get(dept)!
      deptData.totalEmployees++
      
      if (user.role === 'admin') deptData.admins++
      else if (user.role === 'manager') deptData.managers++
      else if (user.role === 'employee') deptData.employees++
    }
    
    // Get attendance for date range
    const attendance = await serverDbManager.getAttendanceRecords({
      startDate: config.dateRange.start,
      endDate: config.dateRange.end
    })
    
    // Add attendance stats per department
    for (const record of attendance) {
      const user = await serverDbManager.getUser(record.userId)
      const dept = user?.department || 'Unassigned'
      
      if (departmentMap.has(dept)) {
        const deptData = departmentMap.get(dept)!
        deptData.totalAttendance = (deptData.totalAttendance || 0) + 1
      }
    }
    
    return Array.from(departmentMap.values())
  }
  
  /**
   * Calculate attendance status
   */
  private calculateStatus(record: any): string {
    if (record.type !== 'check-in') return 'N/A'
    
    const time = record.timestamp.getHours() * 60 + record.timestamp.getMinutes()
    const workStart = 8 * 60 // 8:00 AM
    const lateThreshold = 15 // 15 minutes
    
    if (time > workStart + lateThreshold) {
      return 'late'
    }
    return 'present'
  }
  
  /**
   * Format location for display
   */
  private formatLocation(location: any): string {
    if (!location) return '-'
    if (typeof location === 'string') return location
    if (location.latitude && location.longitude) {
      return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    }
    return '-'
  }
  
  /**
   * Apply grouping and aggregations
   */
  private applyGrouping(data: any[], config: ReportConfig): any[] {
    if (!config.groupBy) return data
    
    const grouped = data.reduce((acc, item) => {
      const key = item[config.groupBy!] || 'Unassigned'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as Record<string, any[]>)
    
    // Apply aggregations
    if (config.aggregations) {
      return Object.entries(grouped).map(([key, items]) => {
        const result: any = { [config.groupBy!]: key }
        
        config.aggregations!.forEach(agg => {
          const values = items.map(item => {
            const val = item[agg.field]
            return typeof val === 'number' ? val : 0
          }).filter(v => v !== 0)
          
          switch (agg.function) {
            case 'count':
              result[`${agg.field}_count`] = items.length
              break
            case 'sum':
              result[`${agg.field}_sum`] = values.reduce((a, b) => a + b, 0)
              break
            case 'avg':
              result[`${agg.field}_avg`] = values.length > 0 
                ? values.reduce((a, b) => a + b, 0) / values.length 
                : 0
              break
            case 'min':
              result[`${agg.field}_min`] = values.length > 0 ? Math.min(...values) : 0
              break
            case 'max':
              result[`${agg.field}_max`] = values.length > 0 ? Math.max(...values) : 0
              break
          }
        })
        
        result.items = items
        result.count = items.length
        
        return result
      })
    }
    
    return Object.entries(grouped).map(([key, items]) => ({
      [config.groupBy!]: key,
      count: items.length,
      items
    }))
  }
  
  /**
   * Generate PDF report
   */
  private generatePDF(data: any[], config: ReportConfig): Buffer {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(config.title || `${config.type.toUpperCase()} Report`, 14, 20)
    
    // Add metadata
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 30)
    doc.text(
      `Period: ${config.dateRange.start.toLocaleDateString('id-ID')} - ${config.dateRange.end.toLocaleDateString('id-ID')}`, 
      14, 36
    )
    doc.text(`Total Records: ${data.length}`, 14, 42)
    
    if (config.description) {
      doc.text(config.description, 14, 48)
    }
    
    // Prepare table data
    const headers = config.fields.map(field => {
      // Convert camelCase to Title Case
      return field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
    })
    
    const rows = data.map(item => 
      config.fields.map(field => {
        const value = item[field]
        if (value === null || value === undefined) return '-'
        if (value instanceof Date) return value.toLocaleString('id-ID')
        if (typeof value === 'object') return JSON.stringify(value)
        return value.toString()
      })
    )
    
    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: config.description ? 54 : 48,
      theme: 'grid',
      headStyles: { 
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })
    
    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }
    
    return Buffer.from(doc.output('arraybuffer'))
  }
  
  /**
   * Generate Excel report
   */
  private generateExcel(data: any[], config: ReportConfig): Buffer {
    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Prepare data with selected fields only
    const preparedData = data.map(item => {
      const row: any = {}
      config.fields.forEach(field => {
        const value = item[field]
        if (value === null || value === undefined) {
          row[field] = '-'
        } else if (value instanceof Date) {
          row[field] = value.toLocaleString('id-ID')
        } else if (typeof value === 'object') {
          row[field] = JSON.stringify(value)
        } else {
          row[field] = value
        }
      })
      return row
    })
    
    // Create data worksheet
    const ws = XLSX.utils.json_to_sheet(preparedData)
    
    // Set column widths
    const colWidths = config.fields.map(field => ({ wch: 15 }))
    ws['!cols'] = colWidths
    
    // Create metadata worksheet
    const metadata = [
      ['Report Type', config.type],
      ['Title', config.title || config.type.toUpperCase()],
      ['Description', config.description || ''],
      ['Generated', new Date().toLocaleString('id-ID')],
      ['Start Date', config.dateRange.start.toLocaleDateString('id-ID')],
      ['End Date', config.dateRange.end.toLocaleDateString('id-ID')],
      ['Total Records', data.length],
      ['Fields', config.fields.join(', ')]
    ]
    
    if (config.filters && Object.keys(config.filters).length > 0) {
      metadata.push(['Filters', JSON.stringify(config.filters)])
    }
    
    const metaWs = XLSX.utils.aoa_to_sheet(metadata)
    
    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata')
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data')
    
    // If grouped, add summary sheet
    if (config.groupBy) {
      const summary = this.createSummary(data, config)
      const summaryWs = XLSX.utils.json_to_sheet(summary)
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
    }
    
    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return buf
  }
  
  /**
   * Generate CSV report
   */
  private generateCSV(data: any[], config: ReportConfig): string {
    // Create header row
    const headers = config.fields.map(field => 
      field.replace(/([A-Z])/g, ' $1').trim()
    ).join(',')
    
    // Create data rows
    const rows = data.map(item => 
      config.fields.map(field => {
        const value = item[field]
        if (value === null || value === undefined) return ''
        if (value instanceof Date) return `"${value.toLocaleString('id-ID')}"`
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        return value.toString()
      }).join(',')
    )
    
    // Combine with metadata header
    const metadata = [
      `"${config.title || config.type.toUpperCase()} Report"`,
      `"Generated: ${new Date().toLocaleString('id-ID')}"`,
      `"Period: ${config.dateRange.start.toLocaleDateString('id-ID')} - ${config.dateRange.end.toLocaleDateString('id-ID')}"`,
      `"Total Records: ${data.length}"`,
      '' // Empty line
    ]
    
    return [...metadata, headers, ...rows].join('\n')
  }
  
  /**
   * Generate JSON report
   */
  private generateJSON(data: any[], config: ReportConfig): string {
    const report = {
      metadata: {
        type: config.type,
        title: config.title || config.type.toUpperCase(),
        description: config.description,
        generated: new Date().toISOString(),
        dateRange: {
          start: config.dateRange.start.toISOString(),
          end: config.dateRange.end.toISOString()
        },
        totalRecords: data.length,
        filters: config.filters,
        fields: config.fields
      },
      data: data.map(item => {
        const row: any = {}
        config.fields.forEach(field => {
          row[field] = item[field]
        })
        return row
      })
    }
    
    if (config.groupBy) {
      report.summary = this.createSummary(data, config)
    }
    
    return JSON.stringify(report, null, 2)
  }
  
  /**
   * Create summary for grouped data
   */
  private createSummary(data: any[], config: ReportConfig): any[] {
    if (!config.groupBy) return []
    
    const grouped = data.reduce((acc, item) => {
      const key = item[config.groupBy!] || 'Unassigned'
      if (!acc[key]) {
        acc[key] = {
          [config.groupBy!]: key,
          count: 0
        }
      }
      acc[key].count++
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(grouped)
  }
}

// Export singleton instance
export const reportGenerator = new ReportGenerator()
