/**
 * Quality Thresholds (Stub)
 * Stub implementation for backward compatibility
 */

export interface QualityThresholdsOptions {
  minConfidence?: number;
  minQuality?: number;
}

export interface QualityMetrics {
  confidence: number;
  quality: number;
  isAcceptable: boolean;
}

export const qualityThresholdsManager = {
  checkQuality: (metrics: Partial<QualityMetrics>): boolean => {
    return (metrics.confidence || 0) > 0.6;
  },
  getMetrics: (): QualityMetrics => {
    return {
      confidence: 0.8,
      quality: 0.8,
      isAcceptable: true,
    };
  },
};

export default qualityThresholdsManager;
