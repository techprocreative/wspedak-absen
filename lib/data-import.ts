import { z } from 'zod'

// Mock implementations for external libraries
// In a real implementation, these would be installed as dependencies
const parseCSV = (text: string, options: any, callback: (err: any, records: any) => void) => {
  try {
    const lines = text.split('\n')
    const delimiter = options.delimiter || ','
    const hasHeader = options.columns !== false
    
    let headers: string[] = []
    const records: any[] = []
    
    lines.forEach((line, index) => {
      if (line.trim() === '') return
      
      const values = line.split(delimiter)
      
      if (index === 0 && hasHeader) {
        headers = values
      } else {
        const record: any = {}
        values.forEach((value, i) => {
          const key = hasHeader ? headers[i] || `col${i}` : `col${i}`
          record[key] = value
        })
        records.push(record)
      }
    })
    
    callback(null, records)
  } catch (err) {
    callback(err, [])
  }
}

const stringifyCSV = (data: any[], options: any) => {
  const delimiter = options.delimiter || ','
  const hasHeader = options.header !== false
  
  if (data.length === 0) return ''
  
  let csv = ''
  
  if (hasHeader) {
    csv += Object.keys(data[0]).join(delimiter) + '\n'
  }
  
  data.forEach(row => {
    csv += Object.values(row).join(delimiter) + '\n'
  })
  
  return csv
}

// Mock XLSX implementation
const XLSX = {
  read: (buffer: ArrayBuffer, options: any) => {
    // Mock implementation
    return {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    }
  },
  utils: {
    sheet_to_json: (worksheet: any, options: any) => {
      // Mock implementation
      return [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' }
      ]
    },
    json_to_sheet: (data: any[]) => {
      // Mock implementation
      return {}
    },
    book_new: () => {
      // Mock implementation
      return {}
    },
    book_append_sheet: (workbook: any, worksheet: any, name: string) => {
      // Mock implementation
    }
  },
  write: (workbook: any, options: any) => {
    // Mock implementation
    return { buffer: new ArrayBuffer(0) }
  }
}

// Define interfaces for data import
export interface ImportResult {
  success: boolean
  data: any[]
  errors: string[]
  warnings: string[]
  totalRows: number
  validRows: number
  invalidRows: number
}

export interface ImportProgress {
  current: number
  total: number
  percentage: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  required: boolean
  transform?: (value: any) => any
}

export interface ImportConfig {
  fileType: 'csv' | 'excel' | 'json'
  delimiter?: string
  encoding?: string
  hasHeader?: boolean
  fieldMapping?: FieldMapping[]
  validation?: ImportValidation
  batchSize?: number
  skipEmptyRows?: boolean
}

export interface ImportValidation {
  rules: ValidationRule[]
  strictMode?: boolean
  stopOnError?: boolean
}

export interface ValidationRule {
  field: string
  type: 'required' | 'email' | 'date' | 'number' | 'min' | 'max' | 'regex' | 'custom'
  params?: any
  message?: string
  validator?: (value: any) => boolean | string
}

// Employee data schema
export const EmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  salary: z.number().optional(),
  manager: z.string().optional(),
  status: z.string().optional()
})

// Attendance data schema
export const AttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(['check-in', 'check-out'], { required_error: "Type is required" }),
  timestamp: z.string().min(1, "Timestamp is required"),
  location: z.string().optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
  status: z.string().optional()
})

// Schedule data schema
export const ScheduleSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  shiftType: z.string().min(1, "Shift type is required"),
  location: z.string().optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
  status: z.string().optional()
})

// Data Import class
export class DataImporter {
  private config: ImportConfig
  private progressCallback?: (progress: ImportProgress) => void

  constructor(config: ImportConfig) {
    this.config = config
  }

  // Set progress callback
  onProgress(callback: (progress: ImportProgress) => void): void {
    this.progressCallback = callback
  }

  // Update progress
  private updateProgress(current: number, total: number, status: ImportProgress['status'], message?: string): void {
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

  // Parse file based on type
  async parseFile(file: File): Promise<any[]> {
    this.updateProgress(0, 100, 'processing', 'Reading file...')
    
    try {
      const buffer = await file.arrayBuffer()
      let data: any[] = []

      switch (this.config.fileType) {
        case 'csv':
          data = await this.parseCSV(buffer)
          break
        case 'excel':
          data = await this.parseExcel(buffer)
          break
        case 'json':
          data = await this.parseJSON(buffer)
          break
        default:
          throw new Error(`Unsupported file type: ${this.config.fileType}`)
      }

      this.updateProgress(100, 100, 'completed', 'File parsed successfully')
      return data
    } catch (error) {
      this.updateProgress(0, 100, 'failed', `Failed to parse file: ${error}`)
      throw error
    }
  }

  // Parse CSV file
  private async parseCSV(buffer: ArrayBuffer): Promise<any[]> {
    const text = new TextDecoder(this.config.encoding || 'utf-8').decode(buffer)
    
    return new Promise((resolve, reject) => {
      parseCSV(text, {
        delimiter: this.config.delimiter || ',',
        columns: this.config.hasHeader !== false,
        skip_empty_lines: this.config.skipEmptyRows !== false
      }, (err, records) => {
        if (err) {
          reject(err)
        } else {
          resolve(records as any[])
        }
      })
    })
  }

  // Parse Excel file
  private async parseExcel(buffer: ArrayBuffer): Promise<any[]> {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = (workbook.Sheets as any)[sheetName]
    
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: this.config.hasHeader !== false ? 1 : undefined,
      defval: ''
    })

    // Convert to array of objects if header is not present
    if (this.config.hasHeader === false && Array.isArray(data) && data.length > 0) {
      // For mock implementation, we'll just return the data as is
      return data as any[]
    }

    return data as any[]
  }

  // Parse JSON file
  private async parseJSON(buffer: ArrayBuffer): Promise<any[]> {
    const text = new TextDecoder(this.config.encoding || 'utf-8').decode(buffer)
    const json = JSON.parse(text)
    
    // Ensure we have an array
    if (Array.isArray(json)) {
      return json
    } else if (typeof json === 'object' && json.data && Array.isArray(json.data)) {
      return json.data
    } else {
      throw new Error('Invalid JSON format. Expected an array or object with data property.')
    }
  }

  // Apply field mapping
  applyFieldMapping(data: any[]): any[] {
    if (!this.config.fieldMapping || this.config.fieldMapping.length === 0) {
      return data
    }

    return data.map(row => {
      const mappedRow: any = {}
      
      this.config.fieldMapping!.forEach(mapping => {
        const sourceValue = row[mapping.sourceField]
        
        if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
          let transformedValue = sourceValue
          
          if (mapping.transform) {
            transformedValue = mapping.transform(sourceValue)
          }
          
          mappedRow[mapping.targetField] = transformedValue
        } else if (mapping.required) {
          mappedRow[mapping.targetField] = null // Will be caught by validation
        }
      })
      
      return mappedRow
    })
  }

  // Validate data
  validateData(data: any[], schema: z.ZodSchema): ImportResult {
    const errors: string[] = []
    const warnings: string[] = []
    const validData: any[] = []
    
    data.forEach((row, index) => {
      try {
        const validatedRow = schema.parse(row)
        validData.push(validatedRow)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const rowErrors = error.errors.map(err => 
            `Row ${index + 1}: ${err.path.join('.')} - ${err.message}`
          )
          errors.push(...rowErrors)
        } else {
          errors.push(`Row ${index + 1}: ${error}`)
        }
      }
    })

    return {
      success: errors.length === 0,
      data: validData,
      errors,
      warnings,
      totalRows: data.length,
      validRows: validData.length,
      invalidRows: errors.length
    }
  }

  // Import data with progress tracking
  async importData(
    file: File,
    schema: z.ZodSchema,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    if (onProgress) {
      this.onProgress(onProgress)
    }

    try {
      // Parse file
      this.updateProgress(0, 100, 'processing', 'Parsing file...')
      const rawData = await this.parseFile(file)
      
      // Apply field mapping
      this.updateProgress(25, 100, 'processing', 'Applying field mapping...')
      const mappedData = this.applyFieldMapping(rawData)
      
      // Validate data
      this.updateProgress(50, 100, 'processing', 'Validating data...')
      const result = this.validateData(mappedData, schema)
      
      // Process in batches if configured
      if (this.config.batchSize && this.config.batchSize > 0) {
        this.updateProgress(75, 100, 'processing', 'Processing data in batches...')
        // In a real implementation, this would process data in batches
        // For now, we'll just simulate the processing
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      this.updateProgress(100, 100, 'completed', 'Import completed successfully')
      return result
    } catch (error) {
      this.updateProgress(0, 100, 'failed', `Import failed: ${error}`)
      throw error
    }
  }

  // Get sample data from file
  async getSampleData(file: File, rows: number = 5): Promise<any[]> {
    try {
      const data = await this.parseFile(file)
      return data.slice(0, rows)
    } catch (error) {
      throw new Error(`Failed to get sample data: ${error}`)
    }
  }

  // Detect file headers
  async detectHeaders(file: File): Promise<string[]> {
    try {
      const sampleData = await this.getSampleData(file, 1)
      if (sampleData.length > 0) {
        return Object.keys(sampleData[0])
      }
      return []
    } catch (error) {
      throw new Error(`Failed to detect headers: ${error}`)
    }
  }

  // Create import template
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

    if (format === 'csv') {
      return stringifyCSV(template, { header: true })
    } else {
      const worksheet = XLSX.utils.json_to_sheet(template)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }).toString()
    }
  }
}

// Utility functions
export const createFieldMapping = (sourceFields: string[], targetFields: string[]): FieldMapping[] => {
  return sourceFields.map((source, index) => ({
    sourceField: source,
    targetField: targetFields[index] || source,
    required: false
  }))
}

export const validateImportConfig = (config: ImportConfig): boolean => {
  return !!config.fileType && ['csv', 'excel', 'json'].includes(config.fileType)
}

export const getFileType = (filename: string): 'csv' | 'excel' | 'json' | null => {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'csv':
      return 'csv'
    case 'xlsx':
    case 'xls':
      return 'excel'
    case 'json':
      return 'json'
    default:
      return null
  }
}