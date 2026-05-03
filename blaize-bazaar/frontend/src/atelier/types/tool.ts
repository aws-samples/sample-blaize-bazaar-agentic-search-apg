/**
 * Atelier Observatory — Tool types
 *
 * Represents a registered tool function and pgvector discovery results.
 *
 * Requirements: 16.5
 */

export interface Tool {
  numeral: number;
  functionName: string;
  description: string;
  status: 'shipped' | 'exercise';
  signature: string;
  usedBy: string[];
  invocationCount: number;
  version: string;
}

export interface ToolDiscoveryResult {
  rank: number;
  toolId: string;
  name: string;
  description: string;
  similarity: number;
  status: 'shipped' | 'exercise';
}
