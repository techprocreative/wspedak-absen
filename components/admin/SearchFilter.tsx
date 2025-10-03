"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Search, Filter, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'checkbox' | 'number'
  options?: { label: string; value: string | number }[]
  placeholder?: string
  defaultValue?: any
}

export interface SearchFilterProps {
  onSearch: (query: string) => void
  onFilter: (filters: Record<string, any>) => void
  onReset?: () => void
  searchPlaceholder?: string
  searchValue?: string
  filters?: FilterOption[]
  initialFilters?: Record<string, any>
  showReset?: boolean
  showAdvanced?: boolean
  className?: string
  size?: "default" | "sm" | "lg"
}

export function SearchFilter({
  onSearch,
  onFilter,
  onReset,
  searchPlaceholder = "Cari...",
  searchValue = "",
  filters = [],
  initialFilters,
  showReset = true,
  showAdvanced = true,
  className,
  size = "default",
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = React.useState(searchValue)
  const [activeFilters, setActiveFilters] = React.useState<Record<string, any>>(initialFilters ?? {})
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false)
  const [dateRanges, setDateRanges] = React.useState<Record<string, { start?: Date; end?: Date }>>({})

  React.useEffect(() => {
    setSearchQuery(searchValue)
  }, [searchValue])

  // Initialize filters from props when provided; avoid infinite loop by
  // depending on a stable stringified key and skipping undefined.
  const initialFiltersKey = React.useMemo(
    () => (initialFilters ? JSON.stringify(initialFilters) : null),
    [initialFilters]
  )
  React.useEffect(() => {
    if (initialFiltersKey !== null && initialFilters) {
      setActiveFilters(initialFilters)
    }
  }, [initialFiltersKey, initialFilters])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleFilterChange = (key: string, value: any) => {
    const next = { ...activeFilters }
    // Remove empty-ish values to keep filters clean and avoid loops
    const isEmptyObject = (v: any) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? Object.values(v).every((x) => x === undefined || x === null || x === '')
        : false
    if (
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      isEmptyObject(value)
    ) {
      delete next[key]
    } else {
      next[key] = value
    }
    setActiveFilters(next)
    onFilter(next)
  }

  const handleDateRangeChange = (key: string, field: 'start' | 'end', date: Date | undefined) => {
    const newDateRanges = {
      ...dateRanges,
      [key]: {
        ...dateRanges[key],
        [field]: date,
      },
    }
    setDateRanges(newDateRanges)

    if (newDateRanges[key].start || newDateRanges[key].end) {
      handleFilterChange(key, newDateRanges[key])
    }
  }

  const handleReset = () => {
    setSearchQuery("")
    setActiveFilters({})
    setDateRanges({})
    setIsAdvancedOpen(false)
    onSearch("")
    onFilter({})
    onReset?.()
  }

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key]
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => v !== undefined && v !== null && v !== '')
      }
      return value !== undefined && value !== null && value !== ''
    }).length
  }

  const renderFilterInput = (filter: FilterOption) => {
    const value = activeFilters[filter.key] || filter.defaultValue

    switch (filter.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) =>
              handleFilterChange(filter.key, newValue === 'all' ? undefined : newValue)
            }
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {filter.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={String(option.value)}
                  className="text-slate-300"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-slate-700 border-slate-600 text-white"
              >
                <span className="truncate">
                  {Array.isArray(value) && value.length > 0
                    ? `${value.length} dipilih`
                    : filter.placeholder}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-slate-800 border-slate-700 w-64">
              <div className="max-h-48 overflow-y-auto">
                {filter.options?.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 p-2">
                    <Checkbox
                      id={`${filter.key}-${option.value}`}
                      checked={Array.isArray(value) && value.includes(option.value)}
                      onCheckedChange={(checked) => {
                        const currentValues = Array.isArray(value) ? value : []
                        const newValues = checked
                          ? [...currentValues, option.value]
                          : currentValues.filter((v: any) => v !== option.value)
                        handleFilterChange(filter.key, newValues)
                      }}
                    />
                    <label
                      htmlFor={`${filter.key}-${option.value}`}
                      className="text-sm text-slate-300 cursor-pointer flex-1"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white",
                  !value && "text-slate-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP", { locale: id }) : filter.placeholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-slate-800 border-slate-700">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(filter.key, date)}
                initialFocus
                className="bg-slate-800 text-white"
              />
            </PopoverContent>
          </Popover>
        )

      case 'daterange':
        const dateRange = dateRanges[filter.key] || {}
        return (
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white",
                    !dateRange.start && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.start ? format(dateRange.start, "PPP", { locale: id }) : "Tanggal mulai"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-slate-800 border-slate-700">
                <Calendar
                  mode="single"
                  selected={dateRange.start}
                  onSelect={(date) => handleDateRangeChange(filter.key, 'start', date)}
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
                    "w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white",
                    !dateRange.end && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.end ? format(dateRange.end, "PPP", { locale: id }) : "Tanggal akhir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-slate-800 border-slate-700">
                <Calendar
                  mode="single"
                  selected={dateRange.end}
                  onSelect={(date) => handleDateRangeChange(filter.key, 'end', date)}
                  initialFocus
                  className="bg-slate-800 text-white"
                />
              </PopoverContent>
            </Popover>
          </div>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={filter.key}
              checked={value || false}
              onCheckedChange={(checked) => handleFilterChange(filter.key, checked)}
            />
            <label htmlFor={filter.key} className="text-sm text-slate-300">
              {filter.label}
            </label>
          </div>
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder}
            value={value || ""}
            onChange={(e) => handleFilterChange(filter.key, e.target.value ? Number(e.target.value) : "")}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        )

      default:
        return (
          <Input
            placeholder={filter.placeholder}
            value={value || ""}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        )
    }
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={cn(
              "pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400",
              size === "sm" && "h-8 text-sm",
              size === "lg" && "h-12 text-lg"
            )}
          />
        </div>
        
        {showAdvanced && filters.length > 0 && (
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size={size}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 relative"
              >
                <Filter className="w-4 h-4" />
                {size !== "sm" && <span className="ml-2">Filter</span>}
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs min-w-5 h-5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
        
        {showReset && (searchQuery || activeFilterCount > 0) && (
          <Button
            variant="outline"
            size={size}
            onClick={handleReset}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            {size !== "sm" && <span className="ml-2">Reset</span>}
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && filters.length > 0 && (
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleContent>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center justify-between">
                  <span>Filter Lanjutan</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdvancedOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filters.map((filter) => (
                    <div key={filter.key} className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        {filter.label}
                      </label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null
            
            const filter = filters.find(f => f.key === key)
            const label = filter?.label || key
            
            let displayValue = value
            if (Array.isArray(value)) {
              displayValue = `${value.length} dipilih`
            } else if (typeof value === 'object' && value !== null) {
              const range = value as { start?: Date; end?: Date }
              if (range.start || range.end) {
                const start = range.start ? format(range.start, "dd/MM/yyyy", { locale: id }) : ""
                const end = range.end ? format(range.end, "dd/MM/yyyy", { locale: id }) : ""
                displayValue = start && end ? `${start} - ${end}` : start || end
              }
            }

            return (
              <Badge
                key={key}
                variant="secondary"
                className="bg-slate-700 text-slate-300 border-slate-600 flex items-center gap-1"
              >
                <span>{label}: {displayValue}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-white"
                  onClick={() => handleFilterChange(key, filter?.defaultValue || "")}
                />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
