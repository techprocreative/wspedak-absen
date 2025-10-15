"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileText, Calendar, CheckCircle } from 'lucide-react'
import { ApiClient } from '@/lib/api-client'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export default function ReportGeneratePage() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [config, setConfig] = useState({
    type: 'attendance',
    format: 'pdf',
    startDate: '',
    endDate: '',
    fields: ['userName', 'userEmail', 'department', 'date', 'time', 'type', 'status']
  })

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    
    setConfig(prev => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate dates
      if (!config.startDate || !config.endDate) {
        throw new Error('Please select both start and end dates')
      }

      if (new Date(config.startDate) > new Date(config.endDate)) {
        throw new Error('Start date must be before end date')
      }

      logger.info('Generating report', { config })

      // Generate report
      const blob = await ApiClient.generateReport({
        type: config.type,
        format: config.format,
        dateRange: {
          start: new Date(config.startDate),
          end: new Date(config.endDate)
        },
        fields: config.fields
      })

      // Download file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const extensions: Record<string, string> = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
        json: 'json'
      }
      
      a.download = `${config.type}-report-${Date.now()}.${extensions[config.format]}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      logger.info('Report downloaded successfully')
      setSuccess(true)
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      logger.error('Report generation failed', err as Error)
      setError(err.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Generate Reports</h1>
        <p className="text-slate-400">Create and download attendance reports in various formats</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 p-3 rounded flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Report generated and downloaded successfully!
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Report Type</Label>
              <Select 
                value={config.type}
                onValueChange={(value) => setConfig({...config, type: value})}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">📋 Attendance Report</SelectItem>
                  <SelectItem value="employee">👥 Employee Report</SelectItem>
                  <SelectItem value="department">🏢 Department Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Output Format</Label>
              <Select 
                value={config.format}
                onValueChange={(value) => setConfig({...config, format: value})}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">📄 PDF Document</SelectItem>
                  <SelectItem value="excel">📊 Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">📝 CSV File</SelectItem>
                  <SelectItem value="json">💾 JSON Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date
              </Label>
              <Input 
                type="date" 
                value={config.startDate}
                onChange={(e) => setConfig({...config, startDate: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                End Date
              </Label>
              <Input 
                type="date" 
                value={config.endDate}
                onChange={(e) => setConfig({...config, endDate: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="bg-slate-700/30 p-4 rounded-lg space-y-2 text-sm text-slate-300">
            <p className="font-semibold text-white mb-2">📊 Report will include:</p>
            {config.type === 'attendance' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Employee name, email, department</li>
                <li>Check-in and check-out times</li>
                <li>Attendance status (present/late/absent)</li>
                <li>Location data (if available)</li>
                <li>Notes and verifications</li>
              </ul>
            )}
            {config.type === 'employee' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Employee personal details</li>
                <li>Role and department information</li>
                <li>Contact information</li>
                <li>Employment start date</li>
                <li>Current status (active/inactive)</li>
              </ul>
            )}
            {config.type === 'department' && (
              <ul className="list-disc list-inside space-y-1">
                <li>Department-wise employee count</li>
                <li>Total attendance per department</li>
                <li>Role distribution</li>
                <li>Department statistics</li>
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={generating || !config.startDate || !config.endDate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download Report
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-slate-500 text-center">
            <p>Reports are generated in real-time from the database</p>
            <p>Large date ranges may take longer to process</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
