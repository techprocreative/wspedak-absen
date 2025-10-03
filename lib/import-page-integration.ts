/**
 * Import Page Integration Functions
 * Replace mock functions in import page with these real API integrations
 */

import { apiClient } from './api-client'
import { toast } from './toast-helper'

export async function fetchImportData(
  setLoading: (loading: boolean) => void,
  setImportHistory: (history: any[]) => void,
  setTemplates: (templates: any[]) => void,
  importTemplates: any[]
) {
  try {
    setLoading(true)
    
    // Fetch real import history
    const historyResponse = await apiClient.getImportHistory()
    if (historyResponse.success && historyResponse.data) {
      // Map API response to UI format
      const mappedHistory = historyResponse.data.map((item: any) => ({
        id: item.id || Date.now().toString(),
        filename: item.details?.filename || 'import.csv',
        type: item.resource as any,
        status: 'completed' as const,
        progress: 100,
        totalRecords: item.details?.totalRows || 0,
        processedRecords: item.details?.insertedCount + item.details?.updatedCount || 0,
        errors: item.details?.errors || [],
        warnings: item.details?.warnings || [],
        createdAt: item.created_at,
        createdBy: item.user_id || 'System'
      }))
      setImportHistory(mappedHistory)
    }
    
    // Use static templates
    setTemplates(importTemplates)
    
  } catch (error: any) {
    console.error("Error fetching import data:", error)
    toast.error(error.message || 'Failed to fetch import data')
  } finally {
    setLoading(false)
  }
}

export async function handleRealUpload(
  selectedFile: File | null,
  importType: string,
  setIsUploading: (uploading: boolean) => void,
  setUploadProgress: (progress: number) => void,
  setPreview: (preview: any) => void,
  setActiveTab: (tab: string) => void
) {
  if (!selectedFile) {
    toast.warning('Please select a file to upload')
    return
  }

  try {
    setIsUploading(true)
    setUploadProgress(0)

    // Simulate progress for UX (actual upload is fast)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    // Call real API
    const result = await apiClient.uploadImport({
      file: selectedFile,
      importType: importType as any,
      mode: 'upsert' // Default mode
    })

    clearInterval(progressInterval)
    setUploadProgress(100)

    if (result.success) {
      // Create preview from API response
      const preview = {
        headers: [], // Would need to parse from result
        data: [],
        totalRows: result.data.totalRows,
        sampleRows: [],
        mapping: {},
        validation: {
          validRows: result.data.validRows,
          invalidRows: result.data.invalidRows,
          errors: result.data.errors
        }
      }

      setPreview(preview)
      setActiveTab('preview')
      
      if (result.data.invalidRows > 0) {
        toast.warning(
          `${result.data.validRows} valid, ${result.data.invalidRows} invalid records`,
          'Validation Results'
        )
      } else {
        toast.success(
          `All ${result.data.validRows} records are valid`,
          'Validation Success'
        )
      }
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    toast.error(error.message || 'Upload failed', 'Upload Error')
  } finally {
    setIsUploading(false)
  }
}

export async function startRealImport(
  selectedFile: File | null,
  importType: string,
  preview: any,
  setCurrentJob: (job: any) => void,
  setActiveTab: (tab: string) => void,
  refreshHistory: () => void
) {
  if (!selectedFile || !preview) {
    toast.warning('No file or preview available')
    return
  }

  try {
    // Call real API (already validated during upload)
    const result = await apiClient.uploadImport({
      file: selectedFile,
      importType: importType as any,
      mode: 'upsert'
    })

    if (result.success) {
      const newJob = {
        id: Date.now().toString(),
        filename: selectedFile.name,
        type: importType as any,
        status: 'completed' as const,
        progress: 100,
        totalRecords: result.data.totalRows,
        processedRecords: result.data.insertedCount + result.data.updatedCount,
        errors: result.data.errors,
        warnings: result.data.warnings,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdBy: 'Admin'
      }

      setCurrentJob(newJob)
      setActiveTab('progress')
      
      toast.success(
        `Imported ${result.data.insertedCount} new, updated ${result.data.updatedCount}, skipped ${result.data.skippedCount}`,
        'Import Complete'
      )
      
      // Refresh history
      setTimeout(refreshHistory, 1000)
    }
  } catch (error: any) {
    console.error('Import error:', error)
    toast.error(error.message || 'Import failed', 'Import Error')
    
    const failedJob = {
      id: Date.now().toString(),
      filename: selectedFile.name,
      type: importType as any,
      status: 'failed' as const,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      errors: [error.message],
      warnings: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      createdBy: 'Admin'
    }
    
    setCurrentJob(failedJob)
    setActiveTab('progress')
  }
}

export function downloadImportTemplate(type: string, format: string = 'csv') {
  try {
    apiClient.downloadImportTemplate(type, format)
    toast.success('Template download started', 'Download')
  } catch (error: any) {
    console.error('Template download error:', error)
    toast.error(error.message || 'Failed to download template')
  }
}
