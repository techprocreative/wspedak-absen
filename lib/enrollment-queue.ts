/**
 * Enrollment Queue Manager
 * 
 * Manages bulk face enrollment queue and progress tracking
 */

export interface EnrollmentEmployee {
  id: string
  name: string
  email: string
  department?: string
  position?: string
  employeeId?: string
}

export interface EnrollmentQueueItem {
  employee: EnrollmentEmployee
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped'
  attempts: number
  error?: string
  samplesCompleted: number
  samplesRequired: number
  startedAt?: Date
  completedAt?: Date
  duration?: number // milliseconds
}

export interface EnrollmentProgress {
  total: number
  completed: number
  pending: number
  processing: number
  success: number
  failed: number
  skipped: number
  percentage: number
  estimatedTimeRemaining?: number // milliseconds
}

export class EnrollmentQueue {
  private queue: EnrollmentQueueItem[] = []
  private currentIndex: number = 0
  private startTime?: Date
  private sessionId: string

  constructor(employees: EnrollmentEmployee[], samplesRequired: number = 3) {
    this.sessionId = `enrollment_${Date.now()}`
    this.queue = employees.map(employee => ({
      employee,
      status: 'pending',
      attempts: 0,
      samplesCompleted: 0,
      samplesRequired,
    }))
    this.loadSession()
  }

  /**
   * Get current item being processed
   */
  getCurrentItem(): EnrollmentQueueItem | null {
    if (this.currentIndex >= this.queue.length) return null
    return this.queue[this.currentIndex]
  }

  /**
   * Get all items
   */
  getAllItems(): EnrollmentQueueItem[] {
    return this.queue
  }

  /**
   * Get progress statistics
   */
  getProgress(): EnrollmentProgress {
    const total = this.queue.length
    const completed = this.queue.filter(
      item => item.status === 'success' || item.status === 'failed' || item.status === 'skipped'
    ).length
    const pending = this.queue.filter(item => item.status === 'pending').length
    const processing = this.queue.filter(item => item.status === 'processing').length
    const success = this.queue.filter(item => item.status === 'success').length
    const failed = this.queue.filter(item => item.status === 'failed').length
    const skipped = this.queue.filter(item => item.status === 'skipped').length
    const percentage = total > 0 ? (completed / total) * 100 : 0

    let estimatedTimeRemaining: number | undefined

    // Calculate estimated time remaining
    if (this.startTime && completed > 0 && pending > 0) {
      const elapsedMs = Date.now() - this.startTime.getTime()
      const avgTimePerEmployee = elapsedMs / completed
      estimatedTimeRemaining = avgTimePerEmployee * pending
    }

    return {
      total,
      completed,
      pending,
      processing,
      success,
      failed,
      skipped,
      percentage,
      estimatedTimeRemaining,
    }
  }

  /**
   * Start processing current item
   */
  startCurrentItem(): boolean {
    const current = this.getCurrentItem()
    if (!current) return false

    current.status = 'processing'
    current.attempts += 1
    current.startedAt = new Date()

    if (!this.startTime) {
      this.startTime = new Date()
    }

    this.saveSession()
    return true
  }

  /**
   * Complete current item successfully
   */
  completeCurrentItem(): boolean {
    const current = this.getCurrentItem()
    if (!current) return false

    current.status = 'success'
    current.completedAt = new Date()
    if (current.startedAt) {
      current.duration = current.completedAt.getTime() - current.startedAt.getTime()
    }

    this.saveSession()
    return true
  }

  /**
   * Fail current item
   */
  failCurrentItem(error: string): boolean {
    const current = this.getCurrentItem()
    if (!current) return false

    current.status = 'failed'
    current.error = error
    current.completedAt = new Date()
    if (current.startedAt) {
      current.duration = current.completedAt.getTime() - current.startedAt.getTime()
    }

    this.saveSession()
    return true
  }

  /**
   * Skip current item
   */
  skipCurrentItem(reason?: string): boolean {
    const current = this.getCurrentItem()
    if (!current) return false

    current.status = 'skipped'
    current.error = reason
    current.completedAt = new Date()
    if (current.startedAt) {
      current.duration = current.completedAt.getTime() - current.startedAt.getTime()
    }

    this.saveSession()
    return true
  }

  /**
   * Move to next item
   */
  next(): EnrollmentQueueItem | null {
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex += 1
      this.saveSession()
      return this.getCurrentItem()
    }
    return null
  }

  /**
   * Move to previous item
   */
  previous(): EnrollmentQueueItem | null {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1
      this.saveSession()
      return this.getCurrentItem()
    }
    return null
  }

  /**
   * Retry current item
   */
  retryCurrentItem(): boolean {
    const current = this.getCurrentItem()
    if (!current) return false

    current.status = 'pending'
    current.error = undefined
    current.samplesCompleted = 0
    current.startedAt = undefined
    current.completedAt = undefined
    current.duration = undefined

    this.saveSession()
    return true
  }

  /**
   * Retry all failed items
   */
  retryAllFailed(): number {
    let count = 0
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending'
        item.error = undefined
        item.samplesCompleted = 0
        item.startedAt = undefined
        item.completedAt = undefined
        item.duration = undefined
        count++
      }
    })
    this.saveSession()
    return count
  }

  /**
   * Update sample progress for current item
   */
  updateSampleProgress(samplesCompleted: number): boolean {
    const current = this.getCurrentItem()
    if (!current) return false

    current.samplesCompleted = samplesCompleted
    this.saveSession()
    return true
  }

  /**
   * Check if queue is complete
   */
  isComplete(): boolean {
    return this.queue.every(
      item => item.status === 'success' || item.status === 'failed' || item.status === 'skipped'
    )
  }

  /**
   * Get completion summary
   */
  getSummary() {
    const progress = this.getProgress()
    const avgDuration = this.getAverageDuration()
    const totalDuration = this.getTotalDuration()

    return {
      ...progress,
      avgDuration,
      totalDuration,
      successRate: progress.total > 0 ? (progress.success / progress.total) * 100 : 0,
      failedItems: this.queue.filter(item => item.status === 'failed'),
      skippedItems: this.queue.filter(item => item.status === 'skipped'),
    }
  }

  /**
   * Get average enrollment duration
   */
  private getAverageDuration(): number {
    const completed = this.queue.filter(
      item => item.duration !== undefined && item.status === 'success'
    )
    if (completed.length === 0) return 0

    const total = completed.reduce((sum, item) => sum + (item.duration || 0), 0)
    return total / completed.length
  }

  /**
   * Get total duration
   */
  private getTotalDuration(): number {
    if (!this.startTime) return 0
    return Date.now() - this.startTime.getTime()
  }

  /**
   * Save session to localStorage
   */
  private saveSession() {
    if (typeof window === 'undefined') return

    try {
      const session = {
        sessionId: this.sessionId,
        queue: this.queue,
        currentIndex: this.currentIndex,
        startTime: this.startTime,
      }
      localStorage.setItem(`enrollment_session_${this.sessionId}`, JSON.stringify(session))
    } catch (error) {
      console.error('Failed to save enrollment session:', error)
    }
  }

  /**
   * Load session from localStorage
   */
  private loadSession() {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(`enrollment_session_${this.sessionId}`)
      if (saved) {
        const session = JSON.parse(saved)
        this.queue = session.queue
        this.currentIndex = session.currentIndex
        this.startTime = session.startTime ? new Date(session.startTime) : undefined
      }
    } catch (error) {
      console.error('Failed to load enrollment session:', error)
    }
  }

  /**
   * Clear session from localStorage
   */
  clearSession() {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(`enrollment_session_${this.sessionId}`)
    } catch (error) {
      console.error('Failed to clear enrollment session:', error)
    }
  }

  /**
   * Export results as CSV
   */
  exportCSV(): string {
    const headers = [
      'Name',
      'Email',
      'Department',
      'Status',
      'Samples',
      'Attempts',
      'Duration (s)',
      'Error',
    ]

    const rows = this.queue.map(item => [
      item.employee.name,
      item.employee.email,
      item.employee.department || '',
      item.status,
      `${item.samplesCompleted}/${item.samplesRequired}`,
      item.attempts.toString(),
      item.duration ? (item.duration / 1000).toFixed(1) : '',
      item.error || '',
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    return csv
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(ms: number): string {
  if (ms < 60000) return `~${Math.ceil(ms / 1000)}s remaining`
  const minutes = Math.ceil(ms / 60000)
  return `~${minutes} minute${minutes > 1 ? 's' : ''} remaining`
}
