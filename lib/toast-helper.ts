/**
 * Toast notification helper
 * Simple toast notifications for user feedback
 */

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  title?: string
  description: string
  type: ToastType
  duration?: number
}

// Simple toast function (can be replaced with a proper toast library like sonner or react-hot-toast)
export function showToast(options: ToastOptions) {
  const { title, description, type, duration = 5000 } = options

  // For now, use alert/console as fallback
  // In production, this should use a proper toast library
  console.log(`[${type.toUpperCase()}] ${title ? title + ': ' : ''}${description}`)
  
  // You can integrate with shadcn/ui toast here
  if (typeof window !== 'undefined') {
    // Create a simple toast element
    const toast = document.createElement('div')
    toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${getToastColor(type)} animate-in slide-in-from-bottom-full`
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1">
          ${title ? `<p class="font-semibold">${title}</p>` : ''}
          <p class="text-sm ${title ? 'mt-1' : ''}">${description}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-sm opacity-70 hover:opacity-100">×</button>
      </div>
    `
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.remove()
    }, duration)
  }
}

function getToastColor(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-green-500/10 border border-green-500/30 text-green-400'
    case 'error':
      return 'bg-red-500/10 border border-red-500/30 text-red-400'
    case 'warning':
      return 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
    case 'info':
      return 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
    default:
      return 'bg-slate-500/10 border border-slate-500/30 text-slate-400'
  }
}

export const toast = {
  success: (description: string, title?: string) => 
    showToast({ type: 'success', description, title }),
  
  error: (description: string, title?: string) => 
    showToast({ type: 'error', description, title }),
  
  info: (description: string, title?: string) => 
    showToast({ type: 'info', description, title }),
  
  warning: (description: string, title?: string) => 
    showToast({ type: 'warning', description, title }),
}
