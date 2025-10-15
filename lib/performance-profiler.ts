import { logger, logApiError, logApiRequest } from '@/lib/logger'

/**
 * Performance Profiler
 * Provides performance profiling tools for the application
 * Optimized for DS223J hardware constraints
 */

export interface PerformanceProfilerOptions {
  // Profiling options
  enableProfiling?: boolean;
  profilingInterval?: number; // ms
  maxProfiles?: number; // Maximum number of profiles to keep
  
  // Sampling options
  enableSampling?: boolean;
  samplingRate?: number; // Hz
  maxSamples?: number; // Maximum number of samples to keep
  
  // Tracing options
  enableTracing?: boolean;
  traceCategories?: string[];
  
  // Reporting options
  enableReporting?: boolean;
  reportInterval?: number; // ms
  reportEndpoint?: string;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  duration: number; // ms
  samples: PerformanceSample[];
  traces: PerformanceTrace[];
  summary: PerformanceProfileSummary;
}

export interface PerformanceSample {
  timestamp: Date;
  memoryUsage: number; // MB
  cpuUsage: number; // %
  frameTime: number; // ms
  networkRequests: number;
  customMetrics: Record<string, number>;
}

export interface PerformanceTrace {
  id: string;
  name: string;
  category: string;
  startTime: number; // ms
  endTime: number; // ms
  duration: number; // ms
  args?: Record<string, any>;
}

export interface PerformanceProfileSummary {
  averageMemoryUsage: number; // MB
  peakMemoryUsage: number; // MB
  averageCpuUsage: number; // %
  peakCpuUsage: number; // %
  averageFrameTime: number; // ms
  worstFrameTime: number; // ms
  totalNetworkRequests: number;
  totalTraces: number;
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  type: 'memory' | 'cpu' | 'network' | 'rendering' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value: number;
  threshold: number;
  unit: string;
  timestamp: Date;
}

export class PerformanceProfiler {
  private options: PerformanceProfilerOptions;
  private profiles: PerformanceProfile[] = [];
  private currentProfile: PerformanceProfile | null = null;
  private samplingIntervalId: number | null = null;
  private reportIntervalId: number | null = null;
  private profileIdCounter = 0;
  private traceIdCounter = 0;
  private reportCallbacks: Array<(profile: PerformanceProfile) => void> = [];
  private traces: PerformanceTrace[] = [];
  private customMetrics: Record<string, number> = {};

  constructor(options: PerformanceProfilerOptions = {}) {
    this.options = {
      enableProfiling: true,
      profilingInterval: 1000, // 1 second
      maxProfiles: 100,
      enableSampling: true,
      samplingRate: 10, // 10 Hz
      maxSamples: 1000,
      enableTracing: true,
      traceCategories: ['default', 'memory', 'cpu', 'network', 'rendering'],
      enableReporting: true,
      reportInterval: 60000, // 1 minute
      ...options,
    };
  }

  /**
   * Initialize the performance profiler
   */
  initialize(): void {
    if (!this.options.enableProfiling) {
      return;
    }

    // Start sampling interval
    this.startSamplingInterval();
    
    // Start report interval
    this.startReportInterval();
    
    logger.info('Performance profiler initialized');
  }

  /**
   * Cleanup the performance profiler
   */
  cleanup(): void {
    // Stop current profile
    if (this.currentProfile) {
      this.endProfile();
    }
    
    // Stop sampling interval
    this.stopSamplingInterval();
    
    // Stop report interval
    this.stopReportInterval();
    
    logger.info('Performance profiler cleaned up');
  }

  /**
   * Start a new profile
   */
  startProfile(name?: string): string {
    // End current profile if exists
    if (this.currentProfile) {
      this.endProfile();
    }
    
    const id = this.generateProfileId();
    const now = new Date();
    
    this.currentProfile = {
      id,
      name: name || `Profile ${id}`,
      startTime: now,
      endTime: now,
      duration: 0,
      samples: [],
      traces: [],
      summary: {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageCpuUsage: 0,
        peakCpuUsage: 0,
        averageFrameTime: 0,
        worstFrameTime: 0,
        totalNetworkRequests: 0,
        totalTraces: 0,
        bottlenecks: [],
      },
    };
    
    return id;
  }

  /**
   * End the current profile
   */
  endProfile(): PerformanceProfile | null {
    if (!this.currentProfile) {
      return null;
    }
    
    const now = new Date();
    this.currentProfile.endTime = now;
    this.currentProfile.duration = now.getTime() - this.currentProfile.startTime.getTime();
    
    // Calculate summary
    this.currentProfile.summary = this.calculateProfileSummary(this.currentProfile);
    
    // Add to profiles
    this.profiles.push(this.currentProfile);
    
    // Check if we have too many profiles
    if (this.profiles.length > this.options.maxProfiles!) {
      // Remove oldest profiles
      const toRemove = this.profiles.length - this.options.maxProfiles!;
      this.profiles.splice(0, toRemove);
    }
    
    const profile = this.currentProfile;
    this.currentProfile = null;
    
    // Notify callbacks
    this.reportCallbacks.forEach(callback => callback(profile));
    
    // Send report if enabled
    if (this.options.enableReporting && this.options.reportEndpoint) {
      this.sendReport(profile);
    }
    
    return profile;
  }

  /**
   * Start sampling interval
   */
  private startSamplingInterval(): void {
    if (!this.options.enableSampling) {
      return;
    }
    
    this.samplingIntervalId = window.setInterval(() => {
      this.takeSample();
    }, 1000 / this.options.samplingRate!);
  }

  /**
   * Stop sampling interval
   */
  private stopSamplingInterval(): void {
    if (this.samplingIntervalId !== null) {
      clearInterval(this.samplingIntervalId);
      this.samplingIntervalId = null;
    }
  }

  /**
   * Start report interval
   */
  private startReportInterval(): void {
    if (!this.options.enableReporting) {
      return;
    }
    
    this.reportIntervalId = window.setInterval(() => {
      // Generate a report if we have a current profile
      if (this.currentProfile) {
        const profile = this.endProfile();
        if (profile) {
          // Start a new profile
          this.startProfile();
        }
      }
    }, this.options.reportInterval);
  }

  /**
   * Stop report interval
   */
  private stopReportInterval(): void {
    if (this.reportIntervalId !== null) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = null;
    }
  }

  /**
   * Take a performance sample
   */
  private takeSample(): void {
    if (!this.currentProfile) {
      return;
    }
    
    const sample: PerformanceSample = {
      timestamp: new Date(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      frameTime: this.getFrameTime(),
      networkRequests: this.getNetworkRequests(),
      customMetrics: { ...this.customMetrics },
    };
    
    this.currentProfile.samples.push(sample);
    
    // Check if we have too many samples
    if (this.currentProfile.samples.length > this.options.maxSamples!) {
      // Remove oldest samples
      const toRemove = this.currentProfile.samples.length - this.options.maxSamples!;
      this.currentProfile.samples.splice(0, toRemove);
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    
    return 0;
  }

  /**
   * Get CPU usage
   */
  private getCpuUsage(): number {
    // This is a placeholder implementation
    // In a real application, you would use a more sophisticated method to measure CPU usage
    
    // For now, just return a random value between 0 and 100
    return Math.random() * 100;
  }

  /**
   * Get frame time
   */
  private getFrameTime(): number {
    // This is a placeholder implementation
    // In a real application, you would use the Frame Timing API or requestAnimationFrame
    
    // For now, just return a random value between 0 and 100
    return Math.random() * 100;
  }

  /**
   * Get network requests
   */
  private getNetworkRequests(): number {
    // This is a placeholder implementation
    // In a real application, you would track network requests
    
    // For now, just return a random value between 0 and 10
    return Math.floor(Math.random() * 10);
  }

  /**
   * Start a trace
   */
  startTrace(name: string, category?: string): string {
    if (!this.options.enableTracing) {
      return '';
    }
    
    const id = this.generateTraceId();
    const now = performance.now();
    
    const trace: PerformanceTrace = {
      id,
      name,
      category: category || 'default',
      startTime: now,
      endTime: now,
      duration: 0,
    };
    
    this.traces.push(trace);
    
    // Add to current profile if exists
    if (this.currentProfile) {
      this.currentProfile.traces.push(trace);
    }
    
    return id;
  }

  /**
   * End a trace
   */
  endTrace(id: string, args?: Record<string, any>): void {
    if (!this.options.enableTracing) {
      return;
    }
    
    const traceIndex = this.traces.findIndex(trace => trace.id === id);
    
    if (traceIndex !== -1) {
      const now = performance.now();
      this.traces[traceIndex].endTime = now;
      this.traces[traceIndex].duration = now - this.traces[traceIndex].startTime;
      this.traces[traceIndex].args = args;
    }
  }

  /**
   * Set a custom metric
   */
  setCustomMetric(name: string, value: number): void {
    this.customMetrics[name] = value;
  }

  /**
   * Get a custom metric
   */
  getCustomMetric(name: number): number {
    return this.customMetrics[name] || 0;
  }

  /**
   * Calculate profile summary
   */
  private calculateProfileSummary(profile: PerformanceProfile): PerformanceProfileSummary {
    if (profile.samples.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageCpuUsage: 0,
        peakCpuUsage: 0,
        averageFrameTime: 0,
        worstFrameTime: 0,
        totalNetworkRequests: 0,
        totalTraces: profile.traces.length,
        bottlenecks: [],
      };
    }
    
    // Calculate memory usage
    const memoryUsages = profile.samples.map(sample => sample.memoryUsage);
    const averageMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
    const peakMemoryUsage = Math.max(...memoryUsages);
    
    // Calculate CPU usage
    const cpuUsages = profile.samples.map(sample => sample.cpuUsage);
    const averageCpuUsage = cpuUsages.reduce((sum, usage) => sum + usage, 0) / cpuUsages.length;
    const peakCpuUsage = Math.max(...cpuUsages);
    
    // Calculate frame time
    const frameTimes = profile.samples.map(sample => sample.frameTime);
    const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    const worstFrameTime = Math.max(...frameTimes);
    
    // Calculate total network requests
    const totalNetworkRequests = profile.samples.reduce((sum, sample) => sum + sample.networkRequests, 0);
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(profile);
    
    return {
      averageMemoryUsage,
      peakMemoryUsage,
      averageCpuUsage,
      peakCpuUsage,
      averageFrameTime,
      worstFrameTime,
      totalNetworkRequests,
      totalTraces: profile.traces.length,
      bottlenecks,
    };
  }

  /**
   * Identify bottlenecks in a profile
   */
  private identifyBottlenecks(profile: PerformanceProfile): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    if (profile.samples.length === 0) {
      return bottlenecks;
    }
    
    // Check for memory bottlenecks
    const memoryUsages = profile.samples.map(sample => sample.memoryUsage);
    const peakMemoryUsage = Math.max(...memoryUsages);
    
    if (peakMemoryUsage > 400) {
      bottlenecks.push({
        type: 'memory',
        severity: peakMemoryUsage > 500 ? 'critical' : 'high',
        description: `High memory usage detected`,
        value: peakMemoryUsage,
        threshold: 400,
        unit: 'MB',
        timestamp: new Date(),
      });
    }
    
    // Check for CPU bottlenecks
    const cpuUsages = profile.samples.map(sample => sample.cpuUsage);
    const peakCpuUsage = Math.max(...cpuUsages);
    
    if (peakCpuUsage > 80) {
      bottlenecks.push({
        type: 'cpu',
        severity: peakCpuUsage > 90 ? 'critical' : 'high',
        description: `High CPU usage detected`,
        value: peakCpuUsage,
        threshold: 80,
        unit: '%',
        timestamp: new Date(),
      });
    }
    
    // Check for rendering bottlenecks
    const frameTimes = profile.samples.map(sample => sample.frameTime);
    const worstFrameTime = Math.max(...frameTimes);
    
    if (worstFrameTime > 16.67) { // 60 FPS = 16.67ms per frame
      bottlenecks.push({
        type: 'rendering',
        severity: worstFrameTime > 33.33 ? 'critical' : 'high', // 30 FPS = 33.33ms per frame
        description: `Poor frame rate detected`,
        value: worstFrameTime,
        threshold: 16.67,
        unit: 'ms',
        timestamp: new Date(),
      });
    }
    
    // Check for network bottlenecks
    const totalNetworkRequests = profile.samples.reduce((sum, sample) => sum + sample.networkRequests, 0);
    const averageNetworkRequests = totalNetworkRequests / profile.samples.length;
    
    if (averageNetworkRequests > 5) {
      bottlenecks.push({
        type: 'network',
        severity: averageNetworkRequests > 10 ? 'critical' : 'high',
        description: `High network request rate detected`,
        value: averageNetworkRequests,
        threshold: 5,
        unit: 'requests/s',
        timestamp: new Date(),
      });
    }
    
    return bottlenecks;
  }

  /**
   * Generate a profile ID
   */
  private generateProfileId(): string {
    return `profile_${++this.profileIdCounter}_${Date.now()}`;
  }

  /**
   * Generate a trace ID
   */
  private generateTraceId(): string {
    return `trace_${++this.traceIdCounter}_${Date.now()}`;
  }

  /**
   * Get profiles
   */
  getProfiles(filter?: {
    name?: string;
    startTime?: Date;
    endTime?: Date;
  }): PerformanceProfile[] {
    let profiles = [...this.profiles];
    
    // Apply filters
    if (filter?.name) {
      profiles = profiles.filter(profile => profile.name.includes(filter.name!));
    }
    
    if (filter?.startTime) {
      profiles = profiles.filter(profile => profile.startTime >= filter.startTime!);
    }
    
    if (filter?.endTime) {
      profiles = profiles.filter(profile => profile.endTime <= filter.endTime!);
    }
    
    return profiles;
  }

  /**
   * Get current profile
   */
  getCurrentProfile(): PerformanceProfile | null {
    return this.currentProfile;
  }

  /**
   * Get traces
   */
  getTraces(filter?: {
    name?: string;
    category?: string;
    startTime?: number;
    endTime?: number;
  }): PerformanceTrace[] {
    let traces = [...this.traces];
    
    // Apply filters
    if (filter?.name) {
      traces = traces.filter(trace => trace.name.includes(filter.name!));
    }
    
    if (filter?.category) {
      traces = traces.filter(trace => trace.category === filter.category);
    }
    
    if (filter?.startTime !== undefined) {
      traces = traces.filter(trace => trace.startTime >= filter.startTime!);
    }
    
    if (filter?.endTime !== undefined) {
      traces = traces.filter(trace => trace.endTime <= filter.endTime!);
    }
    
    return traces;
  }

  /**
   * Send report to endpoint
   */
  private sendReport(profile: PerformanceProfile): void {
    if (!this.options.reportEndpoint) {
      return;
    }
    
    // Use sendBeacon if available for reliable delivery
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        this.options.reportEndpoint,
        JSON.stringify({ type: 'profile', data: profile })
      );
    } else {
      // Fallback to fetch
      fetch(this.options.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'profile', data: profile }),
      }).catch(error => {
        logger.error('Failed to send profile report', error as Error);
      });
    }
  }

  /**
   * Register a report callback
   */
  onReport(callback: (profile: PerformanceProfile) => void): void {
    this.reportCallbacks.push(callback);
  }

  /**
   * Unregister a report callback
   */
  offReport(callback: (profile: PerformanceProfile) => void): void {
    const index = this.reportCallbacks.indexOf(callback);
    if (index !== -1) {
      this.reportCallbacks.splice(index, 1);
    }
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<PerformanceProfilerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Restart intervals if they changed
    if (this.samplingIntervalId !== null && newOptions.samplingRate) {
      this.stopSamplingInterval();
      this.startSamplingInterval();
    }
    
    if (this.reportIntervalId !== null && newOptions.reportInterval) {
      this.stopReportInterval();
      this.startReportInterval();
    }
  }

  /**
   * Get current options
   */
  getOptions(): PerformanceProfilerOptions {
    return { ...this.options };
  }
}

// Singleton instance with default options
export const performanceProfiler = new PerformanceProfiler({
  enableProfiling: true,
  profilingInterval: 1000,
  maxProfiles: 100,
  enableSampling: true,
  samplingRate: 10,
  maxSamples: 1000,
  enableTracing: true,
  traceCategories: ['default', 'memory', 'cpu', 'network', 'rendering'],
  enableReporting: true,
  reportInterval: 60000,
});

// Export a factory function for easier usage
export function createPerformanceProfiler(options?: PerformanceProfilerOptions): PerformanceProfiler {
  return new PerformanceProfiler(options);
}

// React hook for performance profiling
export function usePerformanceProfiler() {
  return {
    startProfile: performanceProfiler.startProfile.bind(performanceProfiler),
    endProfile: performanceProfiler.endProfile.bind(performanceProfiler),
    getCurrentProfile: performanceProfiler.getCurrentProfile.bind(performanceProfiler),
    getProfiles: performanceProfiler.getProfiles.bind(performanceProfiler),
    startTrace: performanceProfiler.startTrace.bind(performanceProfiler),
    endTrace: performanceProfiler.endTrace.bind(performanceProfiler),
    getTraces: performanceProfiler.getTraces.bind(performanceProfiler),
    setCustomMetric: performanceProfiler.setCustomMetric.bind(performanceProfiler),
    getCustomMetric: performanceProfiler.getCustomMetric.bind(performanceProfiler),
    onReport: performanceProfiler.onReport.bind(performanceProfiler),
    offReport: performanceProfiler.offReport.bind(performanceProfiler),
  };
}