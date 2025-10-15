/**
 * Memory Monitor (Stub)
 * Stub implementation for backward compatibility
 */

export interface MemoryMonitorOptions {
  threshold?: number;
  interval?: number;
}

export const memoryMonitor = {
  start: () => {
    // Stub - no-op
  },
  stop: () => {
    // Stub - no-op
  },
  getUsage: () => {
    return {
      used: 0,
      total: 0,
      percentage: 0,
    };
  },
};

export default memoryMonitor;
