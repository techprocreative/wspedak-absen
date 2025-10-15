/**
 * Video Processor (Stub)
 * Stub implementation for backward compatibility
 */

export interface VideoProcessorOptions {
  width?: number;
  height?: number;
  fps?: number;
}

export class VideoProcessor {
  constructor(options?: VideoProcessorOptions) {
    // Stub
  }

  async processFrame(video: HTMLVideoElement) {
    // Stub - return null
    return null;
  }

  stop() {
    // Stub - no-op
  }
}

export const videoProcessor = new VideoProcessor();
export default videoProcessor;
