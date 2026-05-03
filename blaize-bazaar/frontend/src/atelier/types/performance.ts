/**
 * Atelier Observatory — Performance types
 *
 * Metrics, histograms, latency budgets, pgvector comparisons, and storage usage.
 *
 * Requirements: 16.5
 */

export interface PerformanceData {
  coldStartP50: number;
  warmReuseP50: number;
  sampleCount: number;
  histogram: { bucket: string; count: number; type: 'cold' | 'warm' }[];
  latencyBudget: {
    panel: string;
    type: 'llm' | 'tool' | 'memory';
    p50Ms: number;
    maxMs: number;
  }[];
  pgvectorComparison: {
    strategy: string;
    recall: number;
    qps: number;
    buildTime: string;
    storage: string;
    isShipped: boolean;
  }[];
  storageUsage: {
    label: string;
    sizeBytes: number;
    percentage: number;
  }[];
}
