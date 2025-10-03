/**
 * Export Page Integration Functions
 * Replace mock functions in export page with these real API integrations
 */

import { apiClient } from './api-client'
import { toast } from './toast-helper'

export async function fetchExportData(
  setLoading: (loading: boolean) => void,
  setExportHistory: (history: any[]) => void,
  setTemplates: (templates: any[]) => void,
  exportTemplates: any[]
) {
  try {
    setLoading(true)
    
    // Fetch real export history
    const historyResponse = await apiClient.getExportHistory()
    if (historyResponse.success && historyResponse.data) {
      // Map API response to UI format
      const mappedHistory = historyResponse.data.map((item: any) => ({
        id: item.id || Date.now().toString(),
        name: item.details?.filename || 'Export',
        type: item.resource as any,
        format: item.details?.format || 'csv',
        status: 'completed' as const,
        progress: 100,
        totalRecords: item.details?.records || 0,
        processedRecords: item.details?.records || 0,
        fileSize: (item.details?.fileSize || 0) / 1024 / 1024, // bytes to MB
        downloadUrl: undefined, // URLs expire, would need to regenerate
        errors: [],
        warnings: [],
        createdAt: item.created_at,
        createdBy: item.user_id || 'System',
        filters: item.details?.filters || []
      }))
      setExportHistory(mappedHistory)
    }
    
    // Use static templates for now
    setTemplates(exportTemplates)
    
  } catch (error: any) {
    console.error("Error fetching export data:", error)
    toast.error(error.message || 'Failed to fetch export data')
  } finally {
    setLoading(false)
  }
}

export async function startRealExport(
  exportType: string,
  exportFormat: string,
  selectedFields: string[],
  filters: any[],
  setIsExporting: (exporting: boolean) => void,
  setCurrentJob: (job: any) => void,
  setActiveTab: (tab: string) => void,
  refreshHistory: () => void
) {
  if (selectedFields.length === 0) {
    toast.warning('Please select at least one field to export')
    return
  }

  try {
    setIsExporting(true)

    // Call real API
    const result = await apiClient.startExport({
      exportType: exportType as any,
      format: exportFormat as any,
      fields: selectedFields,
      filters: filters.filter(f => f.field && f.value)
    })

    if (result.success) {
      // Create job object from API response
      const newJob = {
        id: Date.now().toString(),
        name: result.filename,
        type: exportType as any,
        format: result.format as any,
        status: 'completed' as const,
        progress: 100,
        totalRecords: result.totalRecords,
        processedRecords: result.totalRecords,
        fileSize: result.fileSize / 1024 / 1024, // bytes to MB
        downloadUrl: result.downloadUrl,
        errors: [],
        warnings: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdBy: 'Admin',
        filters: filters
      }

      setCurrentJob(newJob)
      setActiveTab('progress')
      
      toast.success('Export completed successfully!', 'Data Export')
      
      // Refresh history after export
      setTimeout(refreshHistory, 1000)
    }
  } catch (error: any) {
    console.error('Export error:', error)
    toast.error(error.message || 'Export failed', 'Export Error')
    
    // Create failed job
    const failedJob = {
      id: Date.now().toString(),
      name: `${exportType} Export - ${new Date().toLocaleDateString()}`,
      type: exportType as any,
      format: exportFormat as any,
      status: 'failed' as const,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      fileSize: 0,
      errors: [error.message],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: 'Admin',
      filters: filters
    }
    
    setCurrentJob(failedJob)
    setActiveTab('progress')
  } finally {
    setIsExporting(false)
  }
}

export function downloadExportFile(downloadUrl: string, filename: string) {
  if (!downloadUrl) {
    toast.error('Download URL not available')
    return
  }

  // Create temporary link and trigger download
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  toast.success('Download started', 'Export')
}
