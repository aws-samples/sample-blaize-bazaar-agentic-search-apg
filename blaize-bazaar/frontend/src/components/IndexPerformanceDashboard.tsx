/**
 * IndexPerformanceDashboard - pgvector Index Performance Comparison
 * Interactive dashboard for comparing HNSW vs Sequential Scan performance
 * WITH dataset size context and educational notes
 */
import { useState } from 'react';
import { X, Zap, TrendingUp, Database, Settings, Play, BarChart3, Info, AlertCircle } from 'lucide-react';

interface IndexPerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PerformanceResults {
  query: string;
  ef_search: number;
  limit: number;
  dataset_size: number;
  num_runs: number;
  hnsw: {
    execution_time_ms: number;
    median_time_ms: number;
    all_times_ms: number[];
    result_count: number;
    index_used: string;
    ef_search: number;
    index_type: string;
    num_runs: number;
  };
  sequential: {
    execution_time_ms: number;
    median_time_ms: number;
    all_times_ms: number[];
    result_count: number;
    index_type: string;
    num_runs: number;
  };
  comparison: {
    speedup_factor: number;
    time_saved_ms: number;
    time_saved_pct: number;
    recall_pct: number;
    dataset_size: number;
    dataset_context: {
      size_category: string;
      size_note: string;
      ef_search_note: string;
      rows: number;
      show_small_dataset_warning: boolean;
    };
    recommendation: string;
  };
}

const IndexPerformanceDashboard = ({ isOpen, onClose }: IndexPerformanceDashboardProps) => {
  const [query, setQuery] = useState('luxury watch');
  const [efSearch, setEfSearch] = useState(40);
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<PerformanceResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/performance/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          ef_search: efSearch,
          limit
        })
      });

      if (!response.ok) {
        throw new Error('Performance comparison failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to run comparison');
    } finally {
      setLoading(false);
    }
  };

  const getSpeedupColor = (speedup: number): string => {
    if (speedup >= 10) return 'text-green-400';
    if (speedup >= 5) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getLatencyColor = (ms: number): string => {
    if (ms < 50) return 'text-green-400';
    if (ms < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[90vw] max-w-[1200px] max-h-[90vh] wood-modal rounded-[20px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 wood-header flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 wood-text-accent" />
            <div>
              <h2 className="text-xl font-semibold wood-text-primary">
                pgvector Index Performance Dashboard
              </h2>
              <p className="text-xs wood-text-secondary mt-0.5">
                Compare HNSW index vs Sequential Scan • Median of 4 runs with cache clearing
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 wood-text-secondary hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 wood-scroll">
          {/* Controls Section */}
          <div className="mb-6 p-6 rounded-xl wood-card">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-white/50" />
              <h3 className="text-lg font-semibold text-text-primary">Test Configuration</h3>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Query Input */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Search Query
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter search query..."
                  className="w-full px-3 py-2 rounded-lg input-field text-sm"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Natural language query to test
                </p>
              </div>

              {/* ef_search Slider */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  ef_search: <span className="text-white/50 font-bold">{efSearch}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={efSearch}
                  onChange={(e) => setEfSearch(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: '#999999'
                  }}
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>Fast (10)</span>
                  <span>Accurate (200)</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Higher = more accurate, slightly slower
                </p>
              </div>

              {/* Limit Input */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Result Limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg input-field text-sm"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Number of results to return
                </p>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={runComparison}
              disabled={loading || !query.trim()}
              className="mt-4 w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.10) 100%)'
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Running 4 test runs with cache clearing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Run Performance Comparison
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Dataset Size & Cache Behavior Warning - NEW */}
          {results && results.comparison?.dataset_context?.show_small_dataset_warning && (
            <div className="mb-6 p-5 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="h-6 w-6 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    Understanding Cache Behavior & Dataset Size
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Dataset Size Context */}
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <p className="text-sm text-text-primary leading-relaxed font-medium mb-1">
                        Small Dataset Context
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {results.comparison.dataset_context.size_note}
                      </p>
                    </div>

                    {/* Cache Behavior Explanation */}
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm text-yellow-300 font-medium mb-2">
                        Why Timing Varies (This is Normal!)
                      </p>
                      <div className="text-sm text-text-secondary leading-relaxed space-y-2">
                        <p>
                          <strong className="text-text-primary">PostgreSQL's shared buffer cache</strong> stores 
                          the entire ~3K row dataset in memory after the first query. This causes expected timing variations:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong className="text-orange-300">Cold cache (first run):</strong> 200-400ms - realistic for cache misses</li>
                          <li><strong className="text-green-300">Warm cache (subsequent):</strong> 10-60ms - realistic for cached data</li>
                        </ul>
                        <p className="pt-2 border-t border-yellow-500/20">
                          <strong className="text-yellow-300">This is correct enterprise behavior.</strong> Databases 
                          cache hot data for performance. Both measurements are valid depending on your workload.
                        </p>
                      </div>
                    </div>

                    {/* When ef_search Matters */}
                    <div className="p-3 rounded-lg wood-card">
                      <p className="text-sm text-white/40 font-medium mb-2">
                        When ef_search Tuning Shows Impact
                      </p>
                      <ul className="text-sm text-text-secondary leading-relaxed space-y-1 list-decimal list-inside ml-2">
                        <li><strong className="text-text-primary">Large datasets</strong> (&gt;100K rows) - cache can't hold everything</li>
                        <li><strong className="text-text-primary">Cold cache scenarios</strong> - initial queries after restart</li>
                        <li><strong className="text-text-primary">High-dimensional vectors</strong> - more computation required</li>
                      </ul>
                    </div>

                    {/* Production Takeaway */}
                    <div className="pt-3 border-t border-blue-500/20">
                      <p className="text-xs text-blue-300 font-medium">
                        Production Takeaway: With small datasets and warm caches, timing becomes inconsistent. 
                        This is normal PostgreSQL behavior. Focus on testing with enterprise-scale data for realistic ef_search tuning.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {results && (
            <div className="space-y-6">
              {/* Performance Comparison */}
              <div className="grid grid-cols-2 gap-6">
                {/* HNSW Results */}
                <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-text-primary">HNSW Index</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-text-secondary">Execution Time (Median of {results.hnsw.num_runs})</div>
                      <div className={`text-3xl font-bold ${getLatencyColor(results.hnsw.execution_time_ms)}`}>
                        {results.hnsw.execution_time_ms}ms
                      </div>
                      {results.hnsw.all_times_ms && (
                        <div className="text-xs text-text-secondary mt-1">
                          All runs: {results.hnsw.all_times_ms.join('ms, ')}ms
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Index Used</div>
                      <div className="text-sm text-green-400 font-mono">{results.hnsw.index_used}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Results Returned</div>
                      <div className="text-lg font-semibold text-text-primary">{results.hnsw.result_count}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">ef_search Parameter</div>
                      <div className="text-lg font-semibold text-white/50">{results.hnsw.ef_search}</div>
                    </div>
                  </div>
                </div>

                {/* Sequential Scan Results */}
                <div className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-5 w-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-text-primary">Sequential Scan</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-text-secondary">Execution Time (Median of {results.sequential.num_runs})</div>
                      <div className="text-3xl font-bold text-orange-400">
                        {results.sequential.execution_time_ms}ms
                      </div>
                      {results.sequential.all_times_ms && (
                        <div className="text-xs text-text-secondary mt-1">
                          All runs: {results.sequential.all_times_ms.join('ms, ')}ms
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Index Used</div>
                      <div className="text-sm text-orange-400">None (Full Table Scan)</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Results Returned</div>
                      <div className="text-lg font-semibold text-text-primary">{results.sequential.result_count}</div>
                    </div>
                    <div>
                      <div className="text-sm text-text-secondary">Scan Type</div>
                      <div className="text-lg font-semibold text-text-primary">Exact (100% recall)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Metrics */}
              <div className="p-6 rounded-xl wood-card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-white/50" />
                  <h3 className="text-lg font-semibold text-text-primary">Comparison Analysis</h3>
                  <span className="text-xs text-text-secondary">
                    ({results.comparison.dataset_size.toLocaleString()} rows)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg wood-card">
                    <div className="text-sm text-text-secondary mb-1">Speedup</div>
                    <div className={`text-2xl font-bold ${getSpeedupColor(results.comparison.speedup_factor)}`}>
                      {results.comparison.speedup_factor}x
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg wood-card">
                    <div className="text-sm text-text-secondary mb-1">Time Saved</div>
                    <div className="text-2xl font-bold text-green-400">
                      {results.comparison.time_saved_ms}ms
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg wood-card">
                    <div className="text-sm text-text-secondary mb-1">Efficiency</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {results.comparison.time_saved_pct}%
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg wood-card">
                    <div className="text-sm text-text-secondary mb-1">Recall</div>
                    <div className="text-2xl font-bold text-white/50">
                      {results.comparison.recall_pct}%
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-blue-300 mb-1">Recommendation</div>
                      <p className="text-sm text-text-primary">{results.comparison.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="p-6 rounded-xl wood-card">
                <h3 className="text-lg font-semibold text-text-primary mb-3">Query Insights</h3>
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>
                    • HNSW index provides <strong className="text-white/50">{results.comparison.speedup_factor}x speedup</strong> over sequential scan
                  </p>
                  <p>
                    • With ef_search={efSearch}, HNSW achieves <strong className="text-white/50">{results.comparison.recall_pct}% recall</strong>
                  </p>
                  <p>
                    • Current query latency: <strong className={getLatencyColor(results.hnsw.execution_time_ms)}>{results.hnsw.execution_time_ms}ms</strong> (median of {results.hnsw.num_runs} runs)
                  </p>
                  <p>
                    • Dataset size: <strong className="text-white/50">{results.comparison.dataset_size.toLocaleString()} rows</strong> ({results.comparison.dataset_context.size_category})
                  </p>
                  {efSearch < 50 && !results.comparison.dataset_context.show_small_dataset_warning && (
                    <p className="text-yellow-400">
                      Consider increasing ef_search for better recall (currently {efSearch})
                    </p>
                  )}
                  {results.hnsw.execution_time_ms < 50 && (
                    <p className="text-green-400">
                      Excellent performance! Query latency is optimal for enterprise
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Educational Content */}
          {!results && !loading && (
            <div className="p-6 rounded-xl wood-card">
              <h3 className="text-lg font-semibold text-text-primary mb-3">About pgvector HNSW Indexes</h3>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>
                  <strong className="text-white/50">HNSW (Hierarchical Navigable Small World)</strong> is an approximate nearest neighbor (ANN) algorithm 
                  that provides fast similarity search at scale.
                </p>
                <p>
                  <strong className="text-white/50">ef_search parameter:</strong> Controls the trade-off between search accuracy and speed. 
                  Higher values search more thoroughly, increasing recall with slightly increased latency.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>ef_search = 10-40: Fast queries, good for real-time applications</li>
                  <li>ef_search = 40-100: Balanced performance and accuracy</li>
                  <li>ef_search = 100-200: High accuracy, acceptable for batch processing</li>
                </ul>
                
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-300 font-medium mb-2">Important: Cache Behavior & Dataset Size</p>
                      <div className="space-y-2 text-sm">
                        <p>
                          This demo uses ~3K rows. With small datasets, <strong className="text-blue-300">PostgreSQL's 
                          shared buffer cache</strong> stores everything in memory after the first query (warm cache):
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li><strong>Cold cache:</strong> 200-400ms (first run, cache misses)</li>
                          <li><strong>Warm cache:</strong> 10-60ms (cached data, subsequent runs)</li>
                        </ul>
                        <p className="pt-2 border-t border-blue-500/20">
                          Both measurements are valid! Timing variation is <strong className="text-blue-300">expected 
                          PostgreSQL behavior</strong>. The ef_search parameter's impact becomes pronounced with 
                          larger datasets (&gt;100K rows) where the cache can't hold the entire working set.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4">
                  <strong className="text-white/50">Production tip:</strong> Start with ef_search=40 and tune based on your recall requirements 
                  and latency budget. This dashboard uses median of 4 runs with cache clearing for realistic benchmarking, 
                  but cache warming is expected behavior with frequently accessed data.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 wood-footer">
          <div className="flex items-start gap-3 text-xs wood-text-secondary">
            <Zap className="h-4 w-4 mt-0.5 wood-text-accent flex-shrink-0" />
            <div>
              <p className="font-medium wood-text-primary mb-1">Production Database Tuning</p>
              <p>
                Use this dashboard to find the optimal ef_search value for your workload. Monitor query latency vs recall 
                to ensure your application meets performance SLAs while maintaining search quality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexPerformanceDashboard;