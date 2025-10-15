/**
 * Incremental Sync (Stub)
 * Stub implementation for backward compatibility
 */

export interface IncrementalSyncOptions {
  batchSize?: number;
  interval?: number;
}

export class IncrementalSync {
  private callbacks: ((result: any) => void)[] = [];

  constructor(options?: IncrementalSyncOptions) {
    // Stub
  }

  initialize() {
    // Stub - no-op
    return this;
  }

  async sync() {
    // Stub - no-op
    const result = { success: true, synced: 0 };
    this.callbacks.forEach(cb => cb(result));
    return result;
  }

  onSyncComplete(callback: (result: any) => void) {
    // Stub - register callback
    this.callbacks.push(callback);
  }

  stop() {
    // Stub - no-op
    this.callbacks = [];
  }
}

export const incrementalSyncManager = new IncrementalSync();
export default incrementalSyncManager;
