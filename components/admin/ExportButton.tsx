"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Download, FileText, Table, FileSpreadsheet, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface ExportOption {
  key: string
  label: string
  icon?: React.ReactNode
  format: 'json' | 'csv' | 'xlsx' | 'pdf'
}

export interface ExportFilter {
  startDate?: Date
  endDate?: Date
  includeHeaders?: boolean
  includeMetadata?: boolean
  selectedFields?: string[]
  customFilters?: Record<string, any>
}

interface ExportButtonProps {
  onExport: (format: string, filters: ExportFilter) => Promise<void>
  options?: ExportOption[]
  loading?: boolean
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost" | "secondary"
  availableFields?: { key: string; label: string }[]
  showDateRange?: boolean
  showFieldSelection?: boolean
  defaultFilters?: Partial<ExportFilter>
}

const defaultExportOptions: ExportOption[] = [
  {
    key: 'json',
    label: 'Export JSON',
    icon: <FileText className="w-4 h-4" />,
    format: 'json',
  },
  {
    key: 'csv',
    label: 'Export CSV',
    icon: <Table className="w-4 h-4" />,
    format: 'csv',
  },
  {
    key: 'xlsx',
    label: 'Export Excel',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    format: 'xlsx',
  },
]

export function ExportButton({
  onExport,
  options = defaultExportOptions,
  loading = false,
  disabled = false,
  className,
  size = "default",
  variant = "outline",
  availableFields = [],
  showDateRange = true,
  showFieldSelection = true,
  defaultFilters = {},
}: ExportButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedFormat, setSelectedFormat] = React.useState<string>(options[0]?.key || '')
  const [filters, setFilters] = React.useState<ExportFilter>({
    includeHeaders: true,
    includeMetadata: false,
    selectedFields: availableFields.map(field => field.key),
    ...defaultFilters,
  })
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    if (!selectedFormat) return

    try {
      setIsExporting(true)
      const option = options.find(opt => opt.key === selectedFormat)
      if (option) {
        await onExport(option.format, filters)
        setOpen(false)
      }
    } catch (error) {
      logger.error('Export failed', error as Error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      selectedFields: checked
        ? [...(prev.selectedFields || []), fieldKey]
        : (prev.selectedFields || []).filter(key => key !== fieldKey)
    }))
  }

  const selectedOption = options.find(opt => opt.key === selectedFormat)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || loading}
          className={cn("border-slate-600 text-slate-300 hover:bg-slate-700", className)}
        >
          {loading || isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {size !== "icon" && <span className="ml-2">Export</span>}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Export Data</DialogTitle>
          <DialogDescription className="text-slate-300">
            Pilih format dan filter untuk mengekspor data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-slate-300">Format Export</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Pilih format" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {options.map((option) => (
                  <SelectItem
                    key={option.key}
                    value={option.key}
                    className="text-slate-300 flex items-center gap-2"
                  >
                    <div className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          {showDateRange && (
            <div className="space-y-2">
              <Label className="text-slate-300">Rentang Tanggal</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal bg-slate-700 border-slate-600 text-white",
                        !filters.startDate && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? (
                        format(filters.startDate, "PPP", { locale: id })
                      ) : (
                        <span>Tanggal Mulai</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-slate-800 border-slate-700">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                      initialFocus
                      className="bg-slate-800 text-white"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal bg-slate-700 border-slate-600 text-white",
                        !filters.endDate && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? (
                        format(filters.endDate, "PPP", { locale: id })
                      ) : (
                        <span>Tanggal Akhir</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-slate-800 border-slate-700">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                      initialFocus
                      className="bg-slate-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Field Selection */}
          {showFieldSelection && availableFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">Kolom yang akan diekspor</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 bg-slate-700/30 p-3 rounded-md">
                {availableFields.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={filters.selectedFields?.includes(field.key)}
                      onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                    />
                    <Label
                      htmlFor={`field-${field.key}`}
                      className="text-sm text-slate-300 cursor-pointer"
                    >
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-2">
            <Label className="text-slate-300">Opsi Tambahan</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-headers"
                  checked={filters.includeHeaders}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, includeHeaders: checked as boolean }))
                  }
                />
                <Label htmlFor="include-headers" className="text-sm text-slate-300">
                  Sertakan header kolom
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-metadata"
                  checked={filters.includeMetadata}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, includeMetadata: checked as boolean }))
                  }
                />
                <Label htmlFor="include-metadata" className="text-sm text-slate-300">
                  Sertakan metadata export
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Batal
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedFormat || isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                {selectedOption?.icon}
                Export {selectedOption?.label}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick export buttons for common formats
export function QuickExportButton({
  format,
  onExport,
  loading = false,
  disabled = false,
  className,
}: {
  format: 'json' | 'csv' | 'xlsx'
  onExport: () => Promise<void>
  loading?: boolean
  disabled?: boolean
  className?: string
}) {
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await onExport()
    } catch (error) {
      logger.error('Export failed', error as Error)
    } finally {
      setIsExporting(false)
    }
  }

  const formatConfig = {
    json: { icon: <FileText className="w-4 h-4" />, label: 'JSON' },
    csv: { icon: <Table className="w-4 h-4" />, label: 'CSV' },
    xlsx: { icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Excel' },
  }

  const config = formatConfig[format]

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || loading || isExporting}
      className={cn("border-slate-600 text-slate-300 hover:bg-slate-700", className)}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        config.icon
      )}
      <span className="ml-2">{config.label}</span>
    </Button>
  )
}