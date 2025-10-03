"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Trash2, Archive, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "warning"
  onConfirm: () => Promise<void> | void
  loading?: boolean
  icon?: React.ReactNode
  className?: string
}

const defaultVariants = {
  default: {
    icon: <AlertTriangle className="w-6 h-6 text-blue-400" />,
    confirmClass: "bg-blue-600 hover:bg-blue-700 text-white",
    title: "Konfirmasi Aksi",
    description: "Apakah Anda yakin ingin melanjutkan aksi ini?",
    confirmText: "Konfirmasi",
  },
  destructive: {
    icon: <Trash2 className="w-6 h-6 text-red-400" />,
    confirmClass: "bg-red-600 hover:bg-red-700 text-white",
    title: "Konfirmasi Penghapusan",
    description: "Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.",
    confirmText: "Hapus",
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-yellow-400" />,
    confirmClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
    title: "Konfirmasi Peringatan",
    description: "Apakah Anda yakin ingin melanjutkan? Tindakan ini mungkin memiliki konsekuensi.",
    confirmText: "Lanjutkan",
  },
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = "Batal",
  variant = "default",
  onConfirm,
  loading = false,
  icon,
  className,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const isLoading = loading || internalLoading

  const handleConfirm = async () => {
    try {
      setInternalLoading(true)
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setInternalLoading(false)
    }
  }

  const currentVariant = defaultVariants[variant]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(
        "bg-slate-800 border-slate-700 text-white max-w-md",
        className
      )}>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {icon || currentVariant.icon}
            <AlertDialogTitle className="text-white">
              {title || currentVariant.title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-300">
            {description || currentVariant.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {cancelText}
            </Button>
          </AlertDialogCancel>
          
          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn(currentVariant.confirmClass, "flex items-center gap-2")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                confirmText || currentVariant.confirmText
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for managing confirm modal state
export function useConfirmModal() {
  const [state, setState] = React.useState<{
    open: boolean
    title?: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive" | "warning"
    onConfirm?: () => Promise<void> | void
    loading?: boolean
    icon?: React.ReactNode
  }>({
    open: false,
  })

  const confirm = React.useCallback((options: Omit<ConfirmModalProps, 'open' | 'onOpenChange'>) => {
    return new Promise<boolean>((resolve) => {
      setState({
        ...options,
        open: true,
        onConfirm: async () => {
          try {
            await options.onConfirm?.()
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
      })
    })
  }, [])

  const ConfirmModalComponent = React.useCallback(() => (
    <ConfirmModal
      open={state.open}
      onOpenChange={(open) => setState(prev => ({ ...prev, open }))}
      title={state.title}
      description={state.description}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      onConfirm={state.onConfirm || (() => Promise.resolve())}
      loading={state.loading}
      icon={state.icon}
    />
  ), [state])

  return {
    confirm,
    ConfirmModal: ConfirmModalComponent,
  }
}

// Pre-configured confirm modals for common actions
export const DeleteConfirmModal = (props: Omit<ConfirmModalProps, 'variant' | 'title' | 'description' | 'confirmText'>) => (
  <ConfirmModal
    variant="destructive"
    title="Konfirmasi Penghapusan"
    description="Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan."
    confirmText="Hapus"
    {...props}
  />
)

export const ArchiveConfirmModal = (props: Omit<ConfirmModalProps, 'variant' | 'title' | 'description' | 'confirmText'>) => (
  <ConfirmModal
    variant="warning"
    title="Konfirmasi Arsip"
    description="Apakah Anda yakin ingin mengarsipkan item ini? Item akan dipindahkan ke arsip dan tidak akan muncul di daftar aktif."
    confirmText="Arsipkan"
    icon={<Archive className="w-6 h-6 text-yellow-400" />}
    {...props}
  />
)

export const RestoreConfirmModal = (props: Omit<ConfirmModalProps, 'variant' | 'title' | 'description' | 'confirmText'>) => (
  <ConfirmModal
    variant="default"
    title="Konfirmasi Pemulihan"
    description="Apakah Anda yakin ingin memulihkan item ini? Item akan dikembalikan ke daftar aktif."
    confirmText="Pulihkan"
    {...props}
  />
)