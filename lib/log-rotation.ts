/**
 * Log Rotation and Retention System
 * Provides automated log rotation, archiving, and cleanup
 * Optimized for DS223J hardware constraints
 */

export interface RotationPolicy {
  type: 'time' | 'size' | 'count';
  interval?: number; // For time-based rotation (ms)
  maxSize?: number; // For size-based rotation (bytes)
  maxCount?: number; // For count-based rotation
  maxAge?: number; // Maximum age before deletion (ms)
}

export interface RetentionPolicy {
  maxAge: number; // Maximum age before deletion (ms)
  maxTotalSize: number; // Maximum total size of logs (bytes)
  maxFiles: number; // Maximum number of log files
  compressAfterAge?: number; // Compress logs after this age (ms)
  deleteAfterAge?: number; // Delete logs after this age (ms)
}

export interface LogArchive {
  id: string;
  name: string;
  createdAt: Date;
  size: number;
  compressed: boolean;
  entries: number;
  startDate: Date;
  endDate: Date;
  tags?: string[];
}

export interface RotationConfig {
  enableRotation: boolean;
  rotationPolicy: RotationPolicy;
  retentionPolicy: RetentionPolicy;
  archiveLocation: string;
  enableCompression: boolean;
  compressionLevel: number; // 1-9
  checkInterval: number; // ms
}

export class LogRotationManager {
  private config: RotationConfig;
  private rotationTimer: number | null = null;
  private archives: LogArchive[] = [];
  private archiveIdCounter = 0;

  constructor(config: Partial<RotationConfig> = {}) {
    this.config = {
      enableRotation: true,
      rotationPolicy: {
        type: 'time',
        interval: 24 * 60 * 60 * 1000, // 24 hours
        maxSize: 10 * 1024 * 1024, // 10MB
        maxCount: 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      retentionPolicy: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxTotalSize: 100 * 1024 * 1024, // 100MB
        maxFiles: 50,
        compressAfterAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        deleteAfterAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      archiveLocation: 'log-archives',
      enableCompression: true,
      compressionLevel: 6,
      checkInterval: 60 * 60 * 1000, // 1 hour
      ...config,
    };

    this.loadArchives();
    this.startRotationTimer();
  }

  /**
   * Start rotation timer
   */
  private startRotationTimer(): void {
    if (!this.config.enableRotation) {
      return;
    }

    this.rotationTimer = window.setInterval(() => {
      this.checkRotation();
    }, this.config.checkInterval);
  }

  /**
   * Stop rotation timer
   */
  private stopRotationTimer(): void {
    if (this.rotationTimer !== null) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  /**
   * Check if rotation is needed
   */
  private async checkRotation(): Promise<void> {
    try {
      const shouldRotate = await this.shouldRotate();
      
      if (shouldRotate) {
        await this.performRotation();
      }
      
      // Apply retention policy
      await this.applyRetentionPolicy();
      
      // Save archives
      this.saveArchives();
    } catch (error) {
      console.error('Error during log rotation check:', error);
    }
  }

  /**
   * Check if rotation should be performed
   */
  private async shouldRotate(): Promise<boolean> {
    const policy = this.config.rotationPolicy;
    
    switch (policy.type) {
      case 'time':
        return this.shouldRotateByTime();
      case 'size':
        return this.shouldRotateBySize();
      case 'count':
        return this.shouldRotateByCount();
      default:
        return false;
    }
  }

  /**
   * Check if rotation should be performed by time
   */
  private shouldRotateByTime(): boolean {
    const policy = this.config.rotationPolicy;
    if (!policy.interval) return false;

    const lastArchive = this.archives[0];
    if (!lastArchive) {
      return true; // No archives yet, create first one
    }

    const now = Date.now();
    const timeSinceLastArchive = now - lastArchive.createdAt.getTime();
    
    return timeSinceLastArchive >= policy.interval;
  }

  /**
   * Check if rotation should be performed by size
   */
  private async shouldRotateBySize(): Promise<boolean> {
    const policy = this.config.rotationPolicy;
    if (!policy.maxSize) return false;

    try {
      const currentLogSize = await this.getCurrentLogSize();
      return currentLogSize >= policy.maxSize;
    } catch (error) {
      console.error('Error checking log size:', error);
      return false;
    }
  }

  /**
   * Check if rotation should be performed by count
   */
  private async shouldRotateByCount(): Promise<boolean> {
    const policy = this.config.rotationPolicy;
    if (!policy.maxCount) return false;

    try {
      const currentLogCount = await this.getCurrentLogCount();
      return currentLogCount >= policy.maxCount;
    } catch (error) {
      console.error('Error checking log count:', error);
      return false;
    }
  }

  /**
   * Get current log size
   */
  private async getCurrentLogSize(): Promise<number> {
    try {
      const logs = localStorage.getItem('structured_logs') || '[]';
      return new Blob([logs]).size;
    } catch (error) {
      console.error('Error getting current log size:', error);
      return 0;
    }
  }

  /**
   * Get current log count
   */
  private async getCurrentLogCount(): Promise<number> {
    try {
      const logs = localStorage.getItem('structured_logs') || '[]';
      const parsedLogs = JSON.parse(logs);
      return parsedLogs.length;
    } catch (error) {
      console.error('Error getting current log count:', error);
      return 0;
    }
  }

  /**
   * Perform log rotation
   */
  private async performRotation(): Promise<void> {
    try {
      const logs = await this.getCurrentLogs();
      if (logs.length === 0) {
        return;
      }

      const archive = await this.createArchive(logs);
      this.archives.unshift(archive);
      
      // Clear current logs
      await this.clearCurrentLogs();
      
      console.log(`Log rotation completed: created archive ${archive.id} with ${logs.length} entries`);
    } catch (error) {
      console.error('Error performing log rotation:', error);
    }
  }

  /**
   * Get current logs
   */
  private async getCurrentLogs(): Promise<any[]> {
    try {
      const logs = localStorage.getItem('structured_logs') || '[]';
      return JSON.parse(logs);
    } catch (error) {
      console.error('Error getting current logs:', error);
      return [];
    }
  }

  /**
   * Clear current logs
   */
  private async clearCurrentLogs(): Promise<void> {
    try {
      localStorage.removeItem('structured_logs');
    } catch (error) {
      console.error('Error clearing current logs:', error);
    }
  }

  /**
   * Create archive from logs
   */
  private async createArchive(logs: any[]): Promise<LogArchive> {
    const id = this.generateArchiveId();
    const now = new Date();
    
    // Determine date range
    const timestamps = logs.map(log => new Date(log.timestamp));
    const startDate = new Date(Math.min(...timestamps.map(d => d.getTime())));
    const endDate = new Date(Math.max(...timestamps.map(d => d.getTime())));
    
    // Create archive data
    const archiveData = {
      id,
      createdAt: now,
      logs,
      metadata: {
        entryCount: logs.length,
        startDate,
        endDate,
        tags: this.extractTags(logs),
      },
    };

    // Compress if enabled
    let compressed = false;
    let size = 0;
    
    if (this.config.enableCompression) {
      const compressedData = await this.compressArchive(archiveData);
      size = compressedData.length;
      compressed = true;
      
      // Store compressed archive
      localStorage.setItem(`archive_${id}`, compressedData);
    } else {
      const serializedData = JSON.stringify(archiveData);
      size = serializedData.length;
      
      // Store uncompressed archive
      localStorage.setItem(`archive_${id}`, serializedData);
    }

    return {
      id,
      name: this.generateArchiveName(startDate, endDate),
      createdAt: now,
      size,
      compressed,
      entries: logs.length,
      startDate,
      endDate,
      tags: this.extractTags(logs),
    };
  }

  /**
   * Generate archive ID
   */
  private generateArchiveId(): string {
    return `archive_${++this.archiveIdCounter}_${Date.now()}`;
  }

  /**
   * Generate archive name
   */
  private generateArchiveName(startDate: Date, endDate: Date): string {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    return `logs_${startStr}_to_${endStr}`;
  }

  /**
   * Extract tags from logs
   */
  private extractTags(logs: any[]): string[] {
    const tagSet = new Set<string>();
    
    logs.forEach(log => {
      if (log.tags && Array.isArray(log.tags)) {
        log.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet);
  }

  /**
   * Compress archive data
   */
  private async compressArchive(data: any): Promise<string> {
    // This is a simplified compression implementation
    // In a real application, you would use a proper compression library
    try {
      const jsonString = JSON.stringify(data);
      
      // Simple compression: replace common patterns
      let compressed = jsonString
        .replace(/"timestamp":/g, '"t":')
        .replace(/"message":/g, '"m":')
        .replace(/"level":/g, '"l":')
        .replace(/"context":/g, '"c":')
        .replace(/"component":/g, '"cp":')
        .replace(/"action":/g, '"a":');
      
      return compressed;
    } catch (error) {
      console.error('Error compressing archive:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress archive data
   */
  private async decompressArchive(compressedData: string): Promise<any> {
    try {
      // Simple decompression: restore common patterns
      let decompressed = compressedData
        .replace(/"t":/g, '"timestamp":')
        .replace(/"m":/g, '"message":')
        .replace(/"l":/g, '"level":')
        .replace(/"c":/g, '"context":')
        .replace(/"cp":/g, '"component":')
        .replace(/"a":/g, '"action":');
      
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Error decompressing archive:', error);
      return JSON.parse(compressedData);
    }
  }

  /**
   * Apply retention policy
   */
  private async applyRetentionPolicy(): Promise<void> {
    const policy = this.config.retentionPolicy;
    const now = Date.now();
    
    // Remove archives older than max age
    this.archives = this.archives.filter(archive => {
      const age = now - archive.createdAt.getTime();
      return age <= policy.maxAge;
    });
    
    // Remove archives if total size exceeds limit
    let totalSize = this.archives.reduce((sum, archive) => sum + archive.size, 0);
    while (totalSize > policy.maxTotalSize && this.archives.length > 0) {
      const oldestArchive = this.archives[this.archives.length - 1];
      totalSize -= oldestArchive.size;
      this.archives.pop();
      
      // Remove from storage
      localStorage.removeItem(`archive_${oldestArchive.id}`);
    }
    
    // Remove archives if count exceeds limit
    while (this.archives.length > policy.maxFiles && this.archives.length > 0) {
      const oldestArchive = this.archives[this.archives.length - 1];
      this.archives.pop();
      
      // Remove from storage
      localStorage.removeItem(`archive_${oldestArchive.id}`);
    }
    
    // Compress old archives if needed
    if (policy.compressAfterAge) {
      await this.compressOldArchives(policy.compressAfterAge);
    }
    
    // Delete very old archives if needed
    if (policy.deleteAfterAge) {
      await this.deleteOldArchives(policy.deleteAfterAge);
    }
  }

  /**
   * Compress old archives
   */
  private async compressOldArchives(maxAge: number): Promise<void> {
    const now = Date.now();
    
    for (const archive of this.archives) {
      if (archive.compressed) continue;
      
      const age = now - archive.createdAt.getTime();
      if (age >= maxAge) {
        try {
          await this.compressExistingArchive(archive);
        } catch (error) {
          console.error(`Error compressing archive ${archive.id}:`, error);
        }
      }
    }
  }

  /**
   * Compress existing archive
   */
  private async compressExistingArchive(archive: LogArchive): Promise<void> {
    const archiveData = localStorage.getItem(`archive_${archive.id}`);
    if (!archiveData) return;
    
    try {
      const data = JSON.parse(archiveData);
      const compressedData = await this.compressArchive(data);
      
      // Update archive
      archive.compressed = true;
      archive.size = compressedData.length;
      
      // Store compressed version
      localStorage.setItem(`archive_${archive.id}`, compressedData);
    } catch (error) {
      console.error(`Error compressing existing archive ${archive.id}:`, error);
    }
  }

  /**
   * Delete old archives
   */
  private async deleteOldArchives(maxAge: number): Promise<void> {
    const now = Date.now();
    const archivesToDelete: LogArchive[] = [];
    
    for (const archive of this.archives) {
      const age = now - archive.createdAt.getTime();
      if (age >= maxAge) {
        archivesToDelete.push(archive);
      }
    }
    
    for (const archive of archivesToDelete) {
      try {
        // Remove from storage
        localStorage.removeItem(`archive_${archive.id}`);
        
        // Remove from archives list
        const index = this.archives.indexOf(archive);
        if (index !== -1) {
          this.archives.splice(index, 1);
        }
      } catch (error) {
        console.error(`Error deleting archive ${archive.id}:`, error);
      }
    }
  }

  /**
   * Load archives from storage
   */
  private loadArchives(): void {
    try {
      const archivesData = localStorage.getItem('log_archives');
      if (archivesData) {
        this.archives = JSON.parse(archivesData);
      }
    } catch (error) {
      console.error('Error loading archives:', error);
      this.archives = [];
    }
  }

  /**
   * Save archives to storage
   */
  private saveArchives(): void {
    try {
      localStorage.setItem('log_archives', JSON.stringify(this.archives));
    } catch (error) {
      console.error('Error saving archives:', error);
    }
  }

  /**
   * Get archives
   */
  getArchives(filter?: {
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    compressed?: boolean;
  }): LogArchive[] {
    let archives = [...this.archives];
    
    if (filter?.startDate) {
      archives = archives.filter(archive => archive.endDate >= filter.startDate!);
    }
    
    if (filter?.endDate) {
      archives = archives.filter(archive => archive.startDate <= filter.endDate!);
    }
    
    if (filter?.tags && filter.tags.length > 0) {
      archives = archives.filter(archive =>
        filter.tags!.some(tag => archive.tags && archive.tags.includes(tag))
      );
    }
    
    if (filter?.compressed !== undefined) {
      archives = archives.filter(archive => archive.compressed === filter.compressed);
    }
    
    return archives;
  }

  /**
   * Get archive data
   */
  async getArchiveData(archiveId: string): Promise<any> {
    const archiveData = localStorage.getItem(`archive_${archiveId}`);
    if (!archiveData) {
      throw new Error(`Archive ${archiveId} not found`);
    }
    
    try {
      const archive = this.archives.find(a => a.id === archiveId);
      if (archive?.compressed) {
        return await this.decompressArchive(archiveData);
      } else {
        return JSON.parse(archiveData);
      }
    } catch (error) {
      console.error(`Error getting archive data for ${archiveId}:`, error);
      throw error;
    }
  }

  /**
   * Delete archive
   */
  async deleteArchive(archiveId: string): Promise<void> {
    const archiveIndex = this.archives.findIndex(a => a.id === archiveId);
    if (archiveIndex === -1) {
      throw new Error(`Archive ${archiveId} not found`);
    }
    
    try {
      // Remove from storage
      localStorage.removeItem(`archive_${archiveId}`);
      
      // Remove from archives list
      this.archives.splice(archiveIndex, 1);
      
      // Save archives
      this.saveArchives();
    } catch (error) {
      console.error(`Error deleting archive ${archiveId}:`, error);
      throw error;
    }
  }

  /**
   * Get rotation statistics
   */
  getRotationStats(): {
    totalArchives: number;
    totalSize: number;
    compressedArchives: number;
    uncompressedArchives: number;
    oldestArchive: Date | null;
    newestArchive: Date | null;
    totalEntries: number;
  } {
    const totalArchives = this.archives.length;
    const totalSize = this.archives.reduce((sum, archive) => sum + archive.size, 0);
    const compressedArchives = this.archives.filter(a => a.compressed).length;
    const uncompressedArchives = totalArchives - compressedArchives;
    const totalEntries = this.archives.reduce((sum, archive) => sum + archive.entries, 0);
    
    let oldestArchive: Date | null = null;
    let newestArchive: Date | null = null;
    
    if (this.archives.length > 0) {
      oldestArchive = this.archives[this.archives.length - 1].createdAt;
      newestArchive = this.archives[0].createdAt;
    }
    
    return {
      totalArchives,
      totalSize,
      compressedArchives,
      uncompressedArchives,
      oldestArchive,
      newestArchive,
      totalEntries,
    };
  }

  /**
   * Force rotation
   */
  async forceRotation(): Promise<void> {
    await this.performRotation();
    await this.applyRetentionPolicy();
    this.saveArchives();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RotationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart timer if check interval changed
    if (newConfig.checkInterval !== undefined) {
      this.stopRotationTimer();
      this.startRotationTimer();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RotationConfig {
    return { ...this.config };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopRotationTimer();
    this.saveArchives();
  }
}

// Singleton instance with default configuration
export const logRotationManager = new LogRotationManager({
  enableRotation: true,
  rotationPolicy: {
    type: 'time',
    interval: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 10 * 1024 * 1024, // 10MB
    maxCount: 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  retentionPolicy: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxTotalSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 50,
    compressAfterAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    deleteAfterAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  archiveLocation: 'log-archives',
  enableCompression: true,
  compressionLevel: 6,
  checkInterval: 60 * 60 * 1000, // 1 hour
});

// Export a factory function for easier usage
export function createLogRotationManager(config?: Partial<RotationConfig>): LogRotationManager {
  return new LogRotationManager(config);
}

// React hook for log rotation
export function useLogRotation() {
  return {
    getArchives: logRotationManager.getArchives.bind(logRotationManager),
    getArchiveData: logRotationManager.getArchiveData.bind(logRotationManager),
    deleteArchive: logRotationManager.deleteArchive.bind(logRotationManager),
    getRotationStats: logRotationManager.getRotationStats.bind(logRotationManager),
    forceRotation: logRotationManager.forceRotation.bind(logRotationManager),
    updateConfig: logRotationManager.updateConfig.bind(logRotationManager),
    getConfig: logRotationManager.getConfig.bind(logRotationManager),
  };
}