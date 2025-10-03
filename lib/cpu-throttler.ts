/**
 * CPU Throttler
 * Provides CPU usage throttling for the application
 * Optimized for DS223J hardware constraints
 */

export interface CPUThrottlerOptions {
  // Throttling options
  enableThrottling?: boolean;
  monitoringInterval?: number; // ms
  cpuThreshold?: number; // %
  aggressiveThreshold?: number; // %
  
  // Throttling strategies
  enableFrameSkipping?: boolean;
  enableQualityReduction?: boolean;
  enableProcessThrottling?: boolean;
  
  // Frame skipping options
  maxFrameSkip?: number;
  frameSkipThreshold?: number; // %
  
  // Quality reduction options
  qualityLevels?: number[];
  qualityReductionThreshold?: number; // %
  
  // Process throttling options
  processQueueSize?: number;
  processThrottlingThreshold?: number; // %
  
  // Recovery options
  enableAutoRecovery?: boolean;
  recoveryInterval?: number; // ms
  recoveryThreshold?: number; // %
}

export interface CPUStats {
  usage: number; // %
  isThrottling: boolean;
  throttlingStrategy: string;
  lastThrottling: Date | null;
  throttlingCount: number;
  currentQualityLevel: number;
  frameSkipCount: number;
  processQueueLength: number;
}

export interface ThrottlingStrategy {
  name: string;
  priority: number;
  execute: () => Promise<void>;
  condition: () => boolean;
  recover: () => Promise<void>;
}

export class CPUThrottler {
  private options: CPUThrottlerOptions;
  private isThrottling = false;
  private throttlingStrategy = '';
  private lastThrottling: Date | null = null;
  private throttlingCount = 0;
  private currentQualityLevel = 0;
  private frameSkipCount = 0;
  private processQueue: Array<() => Promise<any>> = [];
  private monitoringIntervalId: number | null = null;
  private recoveryIntervalId: number | null = null;
  private throttlingStrategies: ThrottlingStrategy[] = [];

  constructor(options: CPUThrottlerOptions = {}) {
    this.options = {
      enableThrottling: true,
      monitoringInterval: 1000, // 1 second
      cpuThreshold: 70, // 70%
      aggressiveThreshold: 85, // 85%
      enableFrameSkipping: true,
      enableQualityReduction: true,
      enableProcessThrottling: true,
      maxFrameSkip: 3,
      frameSkipThreshold: 75, // 75%
      qualityLevels: [1.0, 0.8, 0.6, 0.4, 0.2],
      qualityReductionThreshold: 80, // 80%
      processQueueSize: 100,
      processThrottlingThreshold: 75, // 75%
      enableAutoRecovery: true,
      recoveryInterval: 5000, // 5 seconds
      recoveryThreshold: 50, // 50%
      ...options,
    };
    
    // Initialize default throttling strategies
    this.initializeThrottlingStrategies();
  }

  /**
   * Initialize the CPU throttler
   */
  initialize(): void {
    if (!this.options.enableThrottling) {
      return;
    }

    // Start monitoring interval
    this.startMonitoringInterval();
    
    // Start recovery interval
    if (this.options.enableAutoRecovery) {
      this.startRecoveryInterval();
    }
    
    console.log('CPU throttler initialized');
  }

  /**
   * Cleanup the CPU throttler
   */
  cleanup(): void {
    // Stop monitoring interval
    this.stopMonitoringInterval();
    
    // Stop recovery interval
    this.stopRecoveryInterval();
    
    // Clear process queue
    this.processQueue = [];
    
    console.log('CPU throttler cleaned up');
  }

  /**
   * Initialize default throttling strategies
   */
  private initializeThrottlingStrategies(): void {
    // Add default throttling strategies
    this.throttlingStrategies = [
      {
        name: 'Frame Skipping',
        priority: 1,
        execute: () => this.executeFrameSkipping(),
        condition: () => this.options.enableFrameSkipping! && this.getCPUUsage() > this.options.frameSkipThreshold!,
        recover: () => this.recoverFrameSkipping(),
      },
      {
        name: 'Quality Reduction',
        priority: 2,
        execute: () => this.executeQualityReduction(),
        condition: () => this.options.enableQualityReduction! && this.getCPUUsage() > this.options.qualityReductionThreshold!,
        recover: () => this.recoverQualityReduction(),
      },
      {
        name: 'Process Throttling',
        priority: 3,
        execute: () => this.executeProcessThrottling(),
        condition: () => this.options.enableProcessThrottling! && this.getCPUUsage() > this.options.processThrottlingThreshold!,
        recover: () => this.recoverProcessThrottling(),
      },
    ];
  }

  /**
   * Start monitoring interval
   */
  private startMonitoringInterval(): void {
    this.monitoringIntervalId = window.setInterval(() => {
      this.monitorCPUUsage();
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
   * Monitor CPU usage and apply throttling if needed
   */
  private monitorCPUUsage(): void {
    const cpuUsage = this.getCPUUsage();
    
    // Check if we need to throttle
    if (cpuUsage > this.options.cpuThreshold!) {
      this.applyThrottling(cpuUsage);
    }
  }

  /**
   * Get current CPU usage
   */
  getCPUUsage(): number {
    // This is a placeholder implementation
    // In a real application, you would use a more sophisticated method to measure CPU usage
    
    // For now, just return a random value between 0 and 100
    return Math.random() * 100;
  }

  /**
   * Apply throttling based on CPU usage
   */
  private applyThrottling(cpuUsage: number): void {
    if (this.isThrottling) {
      return;
    }
    
    // Determine if aggressive throttling is needed
    const isAggressive = cpuUsage > this.options.aggressiveThreshold!;
    
    // Sort throttling strategies by priority (higher priority first)
    const sortedStrategies = [...this.throttlingStrategies].sort((a, b) => b.priority - a.priority);
    
    // Execute throttling strategies
    for (const strategy of sortedStrategies) {
      if (strategy.condition()) {
        this.executeThrottlingStrategy(strategy, isAggressive);
        break;
      }
    }
  }

  /**
   * Execute a throttling strategy
   */
  private async executeThrottlingStrategy(strategy: ThrottlingStrategy, isAggressive: boolean): Promise<void> {
    this.isThrottling = true;
    this.throttlingStrategy = strategy.name;
    this.lastThrottling = new Date();
    this.throttlingCount++;
    
    try {
      await strategy.execute();
      console.log(`CPU throttling applied: ${strategy.name} (${isAggressive ? 'aggressive' : 'standard'})`);
    } catch (error) {
      console.error(`Error executing throttling strategy ${strategy.name}:`, error);
    }
  }

  /**
   * Check if recovery is needed
   */
  private checkRecovery(): void {
    if (!this.isThrottling) {
      return;
    }
    
    const cpuUsage = this.getCPUUsage();
    
    // Check if CPU usage is low enough to recover
    if (cpuUsage < this.options.recoveryThreshold!) {
      this.recoverFromThrottling();
    }
  }

  /**
   * Recover from throttling
   */
  private async recoverFromThrottling(): Promise<void> {
    // Find the active throttling strategy
    const activeStrategy = this.throttlingStrategies.find(
      strategy => strategy.name === this.throttlingStrategy
    );
    
    if (activeStrategy) {
      try {
        await activeStrategy.recover();
        console.log(`CPU throttling recovered: ${activeStrategy.name}`);
      } catch (error) {
        console.error(`Error recovering from throttling strategy ${activeStrategy.name}:`, error);
      }
    }
    
    this.isThrottling = false;
    this.throttlingStrategy = '';
  }

  /**
   * Execute frame skipping
   */
  private async executeFrameSkipping(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would implement frame skipping
    
    this.frameSkipCount++;
    console.log(`Frame skipping executed (count: ${this.frameSkipCount})`);
  }

  /**
   * Recover from frame skipping
   */
  private async recoverFrameSkipping(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would recover from frame skipping
    
    this.frameSkipCount = 0;
    console.log('Frame skipping recovered');
  }

  /**
   * Execute quality reduction
   */
  private async executeQualityReduction(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would reduce quality
    
    if (this.currentQualityLevel < this.options.qualityLevels!.length - 1) {
      this.currentQualityLevel++;
      console.log(`Quality reduced to level ${this.currentQualityLevel} (${this.options.qualityLevels![this.currentQualityLevel]})`);
    }
  }

  /**
   * Recover from quality reduction
   */
  private async recoverQualityReduction(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would recover quality
    
    if (this.currentQualityLevel > 0) {
      this.currentQualityLevel--;
      console.log(`Quality increased to level ${this.currentQualityLevel} (${this.options.qualityLevels![this.currentQualityLevel]})`);
    }
  }

  /**
   * Execute process throttling
   */
  private async executeProcessThrottling(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would throttle processes
    
    console.log(`Process throttling executed (queue length: ${this.processQueue.length})`);
  }

  /**
   * Recover from process throttling
   */
  private async recoverProcessThrottling(): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would recover from process throttling
    
    console.log('Process throttling recovered');
  }

  /**
   * Add a process to the queue
   */
  addProcess(process: () => Promise<any>): void {
    if (!this.options.enableProcessThrottling) {
      // Execute immediately if process throttling is disabled
      process();
      return;
    }
    
    // Add to queue
    this.processQueue.push(process);
    
    // Limit queue size
    if (this.processQueue.length > this.options.processQueueSize!) {
      // Remove oldest processes
      const toRemove = this.processQueue.length - this.options.processQueueSize!;
      this.processQueue.splice(0, toRemove);
    }
  }

  /**
   * Execute processes in the queue
   */
  async executeProcesses(): Promise<void> {
    if (this.processQueue.length === 0) {
      return;
    }
    
    // Get a copy of the queue
    const processes = [...this.processQueue];
    
    // Clear the queue
    this.processQueue = [];
    
    // Execute processes
    for (const process of processes) {
      try {
        await process();
      } catch (error) {
        console.error('Error executing process:', error);
      }
    }
  }

  /**
   * Get current CPU stats
   */
  getCPUStats(): CPUStats {
    return {
      usage: this.getCPUUsage(),
      isThrottling: this.isThrottling,
      throttlingStrategy: this.throttlingStrategy,
      lastThrottling: this.lastThrottling,
      throttlingCount: this.throttlingCount,
      currentQualityLevel: this.currentQualityLevel,
      frameSkipCount: this.frameSkipCount,
      processQueueLength: this.processQueue.length,
    };
  }

  /**
   * Get current quality level
   */
  getCurrentQualityLevel(): number {
    return this.options.qualityLevels![this.currentQualityLevel];
  }

  /**
   * Set quality level
   */
  setQualityLevel(level: number): void {
    if (level >= 0 && level < this.options.qualityLevels!.length) {
      this.currentQualityLevel = level;
      console.log(`Quality level set to ${level} (${this.options.qualityLevels![level]})`);
    }
  }

  /**
   * Add a throttling strategy
   */
  addThrottlingStrategy(strategy: ThrottlingStrategy): void {
    this.throttlingStrategies.push(strategy);
  }

  /**
   * Remove a throttling strategy
   */
  removeThrottlingStrategy(name: string): void {
    this.throttlingStrategies = this.throttlingStrategies.filter(
      strategy => strategy.name !== name
    );
  }

  /**
   * Force throttling
   */
  forceThrottling(strategyName?: string): void {
    if (strategyName) {
      const strategy = this.throttlingStrategies.find(s => s.name === strategyName);
      if (strategy) {
        this.executeThrottlingStrategy(strategy, true);
      }
    } else {
      const cpuUsage = this.getCPUUsage();
      this.applyThrottling(cpuUsage);
    }
  }

  /**
   * Force recovery
   */
  forceRecovery(): void {
    if (this.isThrottling) {
      this.recoverFromThrottling();
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<CPUThrottlerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (this.monitoringIntervalId !== null && newOptions.monitoringInterval) {
      this.stopMonitoringInterval();
      this.startMonitoringInterval();
    }
    
    if (this.recoveryIntervalId !== null && newOptions.recoveryInterval) {
      this.stopRecoveryInterval();
      this.startRecoveryInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): CPUThrottlerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const cpuThrottler = new CPUThrottler({
  enableThrottling: true,
  monitoringInterval: 1000,
  cpuThreshold: 70,
  aggressiveThreshold: 85,
  enableFrameSkipping: true,
  enableQualityReduction: true,
  enableProcessThrottling: true,
  maxFrameSkip: 3,
  frameSkipThreshold: 75,
  qualityLevels: [1.0, 0.8, 0.6, 0.4, 0.2],
  qualityReductionThreshold: 80,
  processQueueSize: 100,
  processThrottlingThreshold: 75,
  enableAutoRecovery: true,
  recoveryInterval: 5000,
  recoveryThreshold: 50,
});

// Export a factory function for easier usage
export function createCPUThrottler(options?: CPUThrottlerOptions): CPUThrottler {
  return new CPUThrottler(options);
}

// React hook for CPU throttling
export function useCPUThrottler() {
  return {
    getCPUUsage: cpuThrottler.getCPUUsage.bind(cpuThrottler),
    getCPUStats: cpuThrottler.getCPUStats.bind(cpuThrottler),
    getCurrentQualityLevel: cpuThrottler.getCurrentQualityLevel.bind(cpuThrottler),
    setQualityLevel: cpuThrottler.setQualityLevel.bind(cpuThrottler),
    addProcess: cpuThrottler.addProcess.bind(cpuThrottler),
    executeProcesses: cpuThrottler.executeProcesses.bind(cpuThrottler),
    addThrottlingStrategy: cpuThrottler.addThrottlingStrategy.bind(cpuThrottler),
    removeThrottlingStrategy: cpuThrottler.removeThrottlingStrategy.bind(cpuThrottler),
    forceThrottling: cpuThrottler.forceThrottling.bind(cpuThrottler),
    forceRecovery: cpuThrottler.forceRecovery.bind(cpuThrottler),
  };
}