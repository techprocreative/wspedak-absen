/**
 * Adaptive Quality Manager
 * Provides adaptive quality settings for the application
 * Optimized for DS223J hardware constraints
 */

export interface AdaptiveQualityOptions {
  // Quality options
  enableAdaptiveQuality?: boolean;
  monitoringInterval?: number; // ms
  qualityLevels?: QualityLevel[];
  
  // Performance thresholds
  cpuThreshold?: number; // %
  memoryThreshold?: number; // MB
  networkThreshold?: number; // Mbps
  
  // Adjustment options
  enableAutoAdjustment?: boolean;
  adjustmentInterval?: number; // ms
  adjustmentStrategy?: 'conservative' | 'balanced' | 'aggressive';
  
  // Recovery options
  enableAutoRecovery?: boolean;
  recoveryInterval?: number; // ms
  recoveryThreshold?: number; // %
}

export interface QualityLevel {
  name: string;
  level: number;
  imageQuality: number; // 0-1
  videoQuality: number; // 0-1
  audioQuality: number; // 0-1
  renderingQuality: number; // 0-1
  processingQuality: number; // 0-1
  networkQuality: number; // 0-1
}

export interface QualityStats {
  currentLevel: number;
  currentQuality: QualityLevel;
  isAdjusting: boolean;
  lastAdjustment: Date | null;
  adjustmentsCount: number;
  cpuUsage: number; // %
  memoryUsage: number; // MB
  networkSpeed: number; // Mbps
}

export interface QualityAdjustmentStrategy {
  name: string;
  execute: (currentLevel: number, stats: QualityStats) => Promise<number>;
  condition: (stats: QualityStats) => boolean;
}

export class AdaptiveQualityManager {
  private options: AdaptiveQualityOptions;
  private currentLevel = 0;
  private isAdjusting = false;
  private lastAdjustment: Date | null = null;
  private adjustmentsCount = 0;
  private monitoringIntervalId: number | null = null;
  private adjustmentIntervalId: number | null = null;
  private recoveryIntervalId: number | null = null;
  private adjustmentStrategies: QualityAdjustmentStrategy[] = [];
  private qualityChangeCallbacks: Array<(level: number, quality: QualityLevel) => void> = [];

  constructor(options: AdaptiveQualityOptions = {}) {
    this.options = {
      enableAdaptiveQuality: true,
      monitoringInterval: 5000, // 5 seconds
      qualityLevels: [
        {
          name: 'Ultra',
          level: 4,
          imageQuality: 1.0,
          videoQuality: 1.0,
          audioQuality: 1.0,
          renderingQuality: 1.0,
          processingQuality: 1.0,
          networkQuality: 1.0,
        },
        {
          name: 'High',
          level: 3,
          imageQuality: 0.8,
          videoQuality: 0.8,
          audioQuality: 0.9,
          renderingQuality: 0.8,
          processingQuality: 0.8,
          networkQuality: 0.9,
        },
        {
          name: 'Medium',
          level: 2,
          imageQuality: 0.6,
          videoQuality: 0.6,
          audioQuality: 0.8,
          renderingQuality: 0.6,
          processingQuality: 0.6,
          networkQuality: 0.8,
        },
        {
          name: 'Low',
          level: 1,
          imageQuality: 0.4,
          videoQuality: 0.4,
          audioQuality: 0.7,
          renderingQuality: 0.4,
          processingQuality: 0.4,
          networkQuality: 0.7,
        },
        {
          name: 'Minimal',
          level: 0,
          imageQuality: 0.2,
          videoQuality: 0.2,
          audioQuality: 0.6,
          renderingQuality: 0.2,
          processingQuality: 0.2,
          networkQuality: 0.6,
        },
      ],
      cpuThreshold: 70, // 70%
      memoryThreshold: 300, // 300 MB
      networkThreshold: 1, // 1 Mbps
      enableAutoAdjustment: true,
      adjustmentInterval: 10000, // 10 seconds
      adjustmentStrategy: 'balanced',
      enableAutoRecovery: true,
      recoveryInterval: 15000, // 15 seconds
      recoveryThreshold: 50, // 50%
      ...options,
    };
    
    // Initialize default adjustment strategies
    this.initializeAdjustmentStrategies();
  }

  /**
   * Initialize the adaptive quality manager
   */
  initialize(): void {
    if (!this.options.enableAdaptiveQuality) {
      return;
    }

    // Start monitoring interval
    this.startMonitoringInterval();
    
    // Start adjustment interval
    if (this.options.enableAutoAdjustment) {
      this.startAdjustmentInterval();
    }
    
    // Start recovery interval
    if (this.options.enableAutoRecovery) {
      this.startRecoveryInterval();
    }
    
    console.log('Adaptive quality manager initialized');
  }

  /**
   * Cleanup the adaptive quality manager
   */
  cleanup(): void {
    // Stop monitoring interval
    this.stopMonitoringInterval();
    
    // Stop adjustment interval
    this.stopAdjustmentInterval();
    
    // Stop recovery interval
    this.stopRecoveryInterval();
    
    console.log('Adaptive quality manager cleaned up');
  }

  /**
   * Initialize default adjustment strategies
   */
  private initializeAdjustmentStrategies(): void {
    // Add default adjustment strategies
    this.adjustmentStrategies = [
      {
        name: 'CPU-based Adjustment',
        execute: async (currentLevel, stats) => this.adjustByCPU(currentLevel, stats),
        condition: (stats) => stats.cpuUsage > this.options.cpuThreshold!,
      },
      {
        name: 'Memory-based Adjustment',
        execute: async (currentLevel, stats) => this.adjustByMemory(currentLevel, stats),
        condition: (stats) => stats.memoryUsage > this.options.memoryThreshold!,
      },
      {
        name: 'Network-based Adjustment',
        execute: async (currentLevel, stats) => this.adjustByNetwork(currentLevel, stats),
        condition: (stats) => stats.networkSpeed < this.options.networkThreshold!,
      },
    ];
  }

  /**
   * Start monitoring interval
   */
  private startMonitoringInterval(): void {
    this.monitoringIntervalId = window.setInterval(() => {
      this.monitorPerformance();
    }, this.options.monitoringInterval);
  }

  /**
   * Stop monitoring interval
   */
  private stopMonitoringInterval(): void {
    if (this.monitoringIntervalId !== null) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }
  }

  /**
   * Start adjustment interval
   */
  private startAdjustmentInterval(): void {
    this.adjustmentIntervalId = window.setInterval(() => {
      this.checkAdjustment();
    }, this.options.adjustmentInterval);
  }

  /**
   * Stop adjustment interval
   */
  private stopAdjustmentInterval(): void {
    if (this.adjustmentIntervalId !== null) {
      clearInterval(this.adjustmentIntervalId);
      this.adjustmentIntervalId = null;
    }
  }

  /**
   * Start recovery interval
   */
  private startRecoveryInterval(): void {
    this.recoveryIntervalId = window.setInterval(() => {
      this.checkRecovery();
    }, this.options.recoveryInterval);
  }

  /**
   * Stop recovery interval
   */
  private stopRecoveryInterval(): void {
    if (this.recoveryIntervalId !== null) {
      clearInterval(this.recoveryIntervalId);
      this.recoveryIntervalId = null;
    }
  }

  /**
   * Monitor performance
   */
  private monitorPerformance(): void {
    // This is a placeholder implementation
    // In a real application, you would monitor actual performance metrics
    
    console.log('Performance monitored');
  }

  /**
   * Check if adjustment is needed
   */
  private checkAdjustment(): void {
    if (this.isAdjusting) {
      return;
    }
    
    const stats = this.getQualityStats();
    
    // Check if any adjustment strategy should be applied
    for (const strategy of this.adjustmentStrategies) {
      if (strategy.condition(stats)) {
        this.applyAdjustmentStrategy(strategy);
        break;
      }
    }
  }

  /**
   * Apply an adjustment strategy
   */
  private async applyAdjustmentStrategy(strategy: QualityAdjustmentStrategy): Promise<void> {
    this.isAdjusting = true;
    
    try {
      const stats = this.getQualityStats();
      const newLevel = await strategy.execute(this.currentLevel, stats);
      
      if (newLevel !== this.currentLevel) {
        this.setQualityLevel(newLevel);
      }
      
      this.lastAdjustment = new Date();
      this.adjustmentsCount++;
      
      console.log(`Quality adjustment applied: ${strategy.name} (level: ${newLevel})`);
    } catch (error) {
      console.error(`Error applying adjustment strategy ${strategy.name}:`, error);
    } finally {
      this.isAdjusting = false;
    }
  }

  /**
   * Check if recovery is needed
   */
  private checkRecovery(): void {
    const stats = this.getQualityStats();
    
    // Check if performance is good enough to recover
    if (
      stats.cpuUsage < this.options.recoveryThreshold! &&
      stats.memoryUsage < this.options.memoryThreshold! * 0.8 &&
      stats.networkSpeed > this.options.networkThreshold! * 2
    ) {
      this.recoverQuality();
    }
  }

  /**
   * Recover quality
   */
  private recoverQuality(): void {
    if (this.currentLevel >= this.options.qualityLevels!.length - 1) {
      return; // Already at maximum quality
    }
    
    this.setQualityLevel(this.currentLevel + 1);
    console.log(`Quality recovered to level ${this.currentLevel}`);
  }

  /**
   * Adjust quality by CPU usage
   */
  private async adjustByCPU(currentLevel: number, stats: QualityStats): Promise<number> {
    const cpuUsage = stats.cpuUsage;
    let newLevel = currentLevel;
    
    // Determine adjustment based on strategy
    switch (this.options.adjustmentStrategy) {
      case 'conservative':
        if (cpuUsage > 90) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (cpuUsage > 80) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
      case 'balanced':
        if (cpuUsage > 85) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (cpuUsage > 75) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
      case 'aggressive':
        if (cpuUsage > 80) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (cpuUsage > 70) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
    }
    
    return newLevel;
  }

  /**
   * Adjust quality by memory usage
   */
  private async adjustByMemory(currentLevel: number, stats: QualityStats): Promise<number> {
    const memoryUsage = stats.memoryUsage;
    let newLevel = currentLevel;
    
    // Determine adjustment based on strategy
    switch (this.options.adjustmentStrategy) {
      case 'conservative':
        if (memoryUsage > 450) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (memoryUsage > 350) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
      case 'balanced':
        if (memoryUsage > 400) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (memoryUsage > 300) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
      case 'aggressive':
        if (memoryUsage > 350) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (memoryUsage > 250) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
    }
    
    return newLevel;
  }

  /**
   * Adjust quality by network speed
   */
  private async adjustByNetwork(currentLevel: number, stats: QualityStats): Promise<number> {
    const networkSpeed = stats.networkSpeed;
    let newLevel = currentLevel;
    
    // Determine adjustment based on strategy
    switch (this.options.adjustmentStrategy) {
      case 'conservative':
        if (networkSpeed < 0.5) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (networkSpeed < 1) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
      case 'balanced':
        if (networkSpeed < 0.8) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (networkSpeed < 1.5) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
      case 'aggressive':
        if (networkSpeed < 1) {
          newLevel = Math.max(0, currentLevel - 2);
        } else if (networkSpeed < 2) {
          newLevel = Math.max(0, currentLevel - 1);
        }
        break;
    }
    
    return newLevel;
  }

  /**
   * Get current quality stats
   */
  getQualityStats(): QualityStats {
    // This is a placeholder implementation
    // In a real application, you would get actual performance stats
    
    return {
      currentLevel: this.currentLevel,
      currentQuality: this.options.qualityLevels![this.currentLevel],
      isAdjusting: this.isAdjusting,
      lastAdjustment: this.lastAdjustment,
      adjustmentsCount: this.adjustmentsCount,
      cpuUsage: this.getCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      networkSpeed: this.getNetworkSpeed(),
    };
  }

  /**
   * Get current CPU usage
   */
  private getCPUUsage(): number {
    // This is a placeholder implementation
    // In a real application, you would use a more sophisticated method to measure CPU usage
    
    // For now, just return a random value between 0 and 100
    return Math.random() * 100;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    // This is a placeholder implementation
    // In a real application, you would use the Performance API or other methods to get memory usage
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    
    // For now, just return a random value between 0 and 512
    return Math.random() * 512;
  }

  /**
   * Get current network speed
   */
  private getNetworkSpeed(): number {
    // This is a placeholder implementation
    // In a real application, you would use the Network Information API or other methods to get network speed
    
    // For now, just return a random value between 0 and 10
    return Math.random() * 10;
  }

  /**
   * Set quality level
   */
  setQualityLevel(level: number): void {
    if (level < 0 || level >= this.options.qualityLevels!.length) {
      return;
    }
    
    const oldLevel = this.currentLevel;
    this.currentLevel = level;
    
    // Notify callbacks
    this.qualityChangeCallbacks.forEach(callback => {
      try {
        callback(level, this.options.qualityLevels![level]);
      } catch (error) {
        console.error('Error in quality change callback:', error);
      }
    });
    
    console.log(`Quality level changed from ${oldLevel} to ${level}`);
  }

  /**
   * Get current quality level
   */
  getCurrentQualityLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get current quality
   */
  getCurrentQuality(): QualityLevel {
    return this.options.qualityLevels![this.currentLevel];
  }

  /**
   * Get quality levels
   */
  getQualityLevels(): QualityLevel[] {
    return [...this.options.qualityLevels!];
  }

  /**
   * Add a quality change callback
   */
  onQualityChange(callback: (level: number, quality: QualityLevel) => void): void {
    this.qualityChangeCallbacks.push(callback);
  }

  /**
   * Remove a quality change callback
   */
  offQualityChange(callback: (level: number, quality: QualityLevel) => void): void {
    const index = this.qualityChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.qualityChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Add an adjustment strategy
   */
  addAdjustmentStrategy(strategy: QualityAdjustmentStrategy): void {
    this.adjustmentStrategies.push(strategy);
  }

  /**
   * Remove an adjustment strategy
   */
  removeAdjustmentStrategy(name: string): void {
    this.adjustmentStrategies = this.adjustmentStrategies.filter(
      strategy => strategy.name !== name
    );
  }

  /**
   * Force adjustment
   */
  async forceAdjustment(): Promise<void> {
    if (this.isAdjusting) {
      return;
    }
    
    const stats = this.getQualityStats();
    
    // Find the first applicable strategy
    for (const strategy of this.adjustmentStrategies) {
      if (strategy.condition(stats)) {
        await this.applyAdjustmentStrategy(strategy);
        break;
      }
    }
  }

  /**
   * Force recovery
   */
  forceRecovery(): void {
    this.recoverQuality();
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<AdaptiveQualityOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (this.monitoringIntervalId !== null && newOptions.monitoringInterval) {
      this.stopMonitoringInterval();
      this.startMonitoringInterval();
    }
    
    if (this.adjustmentIntervalId !== null && newOptions.adjustmentInterval) {
      this.stopAdjustmentInterval();
      this.startAdjustmentInterval();
    }
    
    if (this.recoveryIntervalId !== null && newOptions.recoveryInterval) {
      this.stopRecoveryInterval();
      this.startRecoveryInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): AdaptiveQualityOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const adaptiveQualityManager = new AdaptiveQualityManager({
  enableAdaptiveQuality: true,
  monitoringInterval: 5000,
  qualityLevels: [],
  cpuThreshold: 70,
  memoryThreshold: 300,
  networkThreshold: 1,
  enableAutoAdjustment: true,
  adjustmentInterval: 10000,
  adjustmentStrategy: 'balanced',
  enableAutoRecovery: true,
  recoveryInterval: 15000,
  recoveryThreshold: 50,
});

// Export a factory function for easier usage
export function createAdaptiveQualityManager(options?: AdaptiveQualityOptions): AdaptiveQualityManager {
  return new AdaptiveQualityManager(options);
}

// React hook for adaptive quality
export function useAdaptiveQuality() {
  return {
    getQualityStats: adaptiveQualityManager.getQualityStats.bind(adaptiveQualityManager),
    setQualityLevel: adaptiveQualityManager.setQualityLevel.bind(adaptiveQualityManager),
    getCurrentQualityLevel: adaptiveQualityManager.getCurrentQualityLevel.bind(adaptiveQualityManager),
    getCurrentQuality: adaptiveQualityManager.getCurrentQuality.bind(adaptiveQualityManager),
    getQualityLevels: adaptiveQualityManager.getQualityLevels.bind(adaptiveQualityManager),
    onQualityChange: adaptiveQualityManager.onQualityChange.bind(adaptiveQualityManager),
    offQualityChange: adaptiveQualityManager.offQualityChange.bind(adaptiveQualityManager),
    addAdjustmentStrategy: adaptiveQualityManager.addAdjustmentStrategy.bind(adaptiveQualityManager),
    removeAdjustmentStrategy: adaptiveQualityManager.removeAdjustmentStrategy.bind(adaptiveQualityManager),
    forceAdjustment: adaptiveQualityManager.forceAdjustment.bind(adaptiveQualityManager),
    forceRecovery: adaptiveQualityManager.forceRecovery.bind(adaptiveQualityManager),
  };
}