"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: { label: string; value: string | number }[]
  validation?: z.ZodTypeAny
  className?: string
  description?: string
}

export interface FormSection {
  title?: string
  description?: string
  fields: FormField[]
  className?: string
}

interface AdminFormProps {
  schema: z.ZodSchema
  sections: FormSection[]
  onSubmit: (data: any) => Promise<void> | void
  onCancel?: () => void
  initialData?: Record<string, any>
  loading?: boolean
  submitText?: string
  cancelText?: string
  className?: string
  title?: string
  description?: string
}

export function AdminForm({
  schema,
  sections,
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  submitText = "Simpan",
  cancelText = "Batal",
  className,
  title,
  description,
}: AdminFormProps) {
  const [error, setError] = React.useState<string | null>(null)
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {},
    mode: "onChange",
  })

  const handleSubmit = async (data: any) => {
    try {
      setError(null)
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    }
  }

  const renderField = (field: FormField) => {
    const fieldProps = form.register(field.name)
    const error = form.formState.errors[field.name]

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className={cn("space-y-2", field.className)}>
            <Label htmlFor={field.name} className="text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              disabled={field.disabled || loading}
              {...fieldProps}
              className={cn(
                "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400",
                error && "border-red-500 focus:border-red-500"
              )}
            />
            {field.description && (
              <p className="text-xs text-slate-400">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400">{error.message as string}</p>
            )}
          </div>
        )

      case 'select':
        return (
          <div key={field.name} className={cn("space-y-2", field.className)}>
            <Label htmlFor={field.name} className="text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Select
              value={form.watch(field.name)}
              onValueChange={(value) => form.setValue(field.name, value)}
              disabled={field.disabled || loading}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {field.options?.map((option) => (
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
            {field.description && (
              <p className="text-xs text-slate-400">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400">{error.message as string}</p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.name} className={cn("space-y-2", field.className)}>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.name}
                checked={form.watch(field.name)}
                onCheckedChange={(checked) => form.setValue(field.name, checked)}
                disabled={field.disabled || loading}
              />
              <Label htmlFor={field.name} className="text-slate-300">
                {field.label}
              </Label>
            </div>
            {field.description && (
              <p className="text-xs text-slate-400 ml-6">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400 ml-6">{error.message as string}</p>
            )}
          </div>
        )

      case 'radio':
        return (
          <div key={field.name} className={cn("space-y-2", field.className)}>
            <Label className="text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={form.watch(field.name)}
              onValueChange={(value) => form.setValue(field.name, value)}
              disabled={field.disabled || loading}
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(option.value)} id={`${field.name}-${option.value}`} />
                  <Label
                    htmlFor={`${field.name}-${option.value}`}
                    className="text-slate-300"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {field.description && (
              <p className="text-xs text-slate-400">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400">{error.message as string}</p>
            )}
          </div>
        )

      case 'date':
        return (
          <div key={field.name} className={cn("space-y-2", field.className)}>
            <Label htmlFor={field.name} className="text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              disabled={field.disabled || loading}
              {...fieldProps}
              className={cn(
                "bg-slate-700/50 border-slate-600 text-white",
                error && "border-red-500 focus:border-red-500"
              )}
            />
            {field.description && (
              <p className="text-xs text-slate-400">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400">{error.message as string}</p>
            )}
          </div>
        )

      default:
        return (
          <div key={field.name} className={cn("space-y-2", field.className)}>
            <Label htmlFor={field.name} className="text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              disabled={field.disabled || loading}
              {...fieldProps}
              className={cn(
                "bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400",
                error && "border-red-500 focus:border-red-500"
              )}
            />
            {field.description && (
              <p className="text-xs text-slate-400">{field.description}</p>
            )}
            {error && (
              <p className="text-xs text-red-400">{error.message as string}</p>
            )}
          </div>
        )
    }
  }

  return (
    <Card className={cn("bg-slate-800/50 border-slate-700", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle className="text-white">{title}</CardTitle>}
          {description && (
            <p className="text-slate-400 text-sm">{description}</p>
          )}
        </CardHeader>
      )}
      
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {error && (
            <Alert className="bg-red-900/20 border-red-500/50">
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className={cn("space-y-4", section.className)}>
              {section.title && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {section.title}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-slate-400 mb-4">
                      {section.description}
                    </p>
                  )}
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {section.fields.map(renderField)}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <X className="w-4 h-4 mr-2" />
                {cancelText}
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={loading || !form.formState.isValid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {submitText}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}