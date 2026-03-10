/**
 * IndexPerformanceDashboard - pgvector Index Performance Comparison
 * Interactive dashboard for comparing HNSW vs Sequential Scan performance
 * WITH dataset size context and educational notes
 */
import { useState, useEffect } from 'react';
import { X, Zap, TrendingUp, Database, Settings, Play, BarChart3, Info, AlertCircle, Filter, FlaskConical } from 'lucide-react';

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

interface QuantData {
  row_count: number;
  dimensions: number;
  full_precision: { type: string; bytes_per_vector: number; index_bytes: number; index_size: string };
  scalar_quantization: { type: string; bytes_per_vector: number; estimated_index_bytes: number; estimated_index_size: string; memory_reduction: string };
  binary_quantization: { type: string; bytes_per_vector: number; estimated_index_bytes: number; estimated_index_size: string; memory_reduction: string };
  sql_examples: { sq: string; bq: string };
  note: string;
}

const IndexPerformanceDashboard = ({ isOpen, onClose }: IndexPerformanceDashboardProps) => {
  const [query, setQuery] = useState('luxury watch');
  const [efSearch, setEfSearch] = useState(40);
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<PerformanceResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'benchmark' | 'quantization' | 'iterative-scan'>('benchmark');
  const [quantData, setQuantData] = useState<QuantData | null>(null);
  const [quantLoading, setQuantLoading] = useState(false);

  // Iterative Scan state
  const [categories, setCategories] = useState<string[]>([]);
  const [isCategory, setIsCategory] = useState('');
  const [isQuery, setIsQuery] = useState('wireless headphones');
  const [isEfSearch, setIsEfSearch] = useState(40);
  const [isResults, setIsResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quantization Benchmark state
  const [qbQuery, setQbQuery] = useState('luxury watch');
  const [qbResults, setQbResults] = useState<any>(null);
  const [qbLoading, setQbLoading] = useState(false);

  const fetchQuantization = async () => {
    setQuantLoading(true);
    try {
      const res = await fetch('/api/performance/quantization');
      if (res.ok) setQuantData(await res.json());
    } catch { /* ignore */ } finally { setQuantLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/performance/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !isCategory) setIsCategory(data.categories[0]);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCategories(); }, []);

  const runIterativeScan = async () => {
    if (!isQuery.trim() || !isCategory) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/performance/iterative-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: isQuery, category: isCategory, ef_search: isEfSearch, limit: 10 }),
      });
      if (res.ok) setIsResults(await res.json());
    } catch (err) { console.error('Iterative scan error:', err); }
    finally { setIsLoading(false); }
  };

  const runQuantBenchmark = async () => {
    if (!qbQuery.trim()) return;
    setQbLoading(true);
    try {
      const res = await fetch('/api/performance/quantization-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: qbQuery, limit: 10 }),
      });
      if (res.ok) setQbResults(await res.json());
    } catch (err) { console.error('Quant benchmark error:', err); }
    finally { setQbLoading(false); }
  };

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
      <div className="w-[90vw] max-w-[1200px] max-h-[90vh] rounded-[20px] flex flex-col overflow-hidden"
        style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <div>
              <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
                pgvector Index Performance Dashboard
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Compare HNSW index vs Sequential Scan • Median of 4 runs with cache clearing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {([
              { key: 'benchmark' as const, label: 'Benchmark' },
              { key: 'quantization' as const, label: 'Quantization' },
              { key: 'iterative-scan' as const, label: 'Iterative Scan' },
            ]).map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'quantization' && !quantData) fetchQuantization(); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: activeTab === tab.key ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: activeTab === tab.key ? '#ffffff' : 'rgba(255, 255, 255, 0.4)', border: activeTab === tab.key ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent' }}>
                {tab.label}
              </button>
            ))}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-2">
              <X className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 search-scroll">
          {activeTab === 'iterative-scan' ? (
            /* Iterative Scan Tab */
            <div className="space-y-6">
              {/* Explanation */}
              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                <Info className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: '#60a5fa' }}>pgvector 0.8.0 Iterative Scan</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                    HNSW explores a fixed candidate set, then applies WHERE filters. If the filter is selective,
                    most candidates are discarded — returning <strong style={{ color: 'rgba(255,255,255,0.8)' }}>fewer results than requested</strong>.
                    Iterative scan continues traversing the graph until LIMIT is satisfied.
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="p-5 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  <h4 className="text-sm font-semibold" style={{ color: '#ffffff' }}>Filtered Search Configuration</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Category Filter</label>
                    <select
                      value={isCategory}
                      onChange={e => setIsCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      {categories.map(c => <option key={c} value={c} style={{ background: '#1a1a1a' }}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Search Query</label>
                    <input
                      type="text"
                      value={isQuery}
                      onChange={e => setIsQuery(e.target.value)}
                      placeholder="Search query..."
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      ef_search: <span style={{ color: 'rgba(255,255,255,0.4)' }}>{isEfSearch}</span>
                    </label>
                    <input
                      type="range" min="10" max="200" step="10"
                      value={isEfSearch}
                      onChange={e => setIsEfSearch(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer mt-2"
                      style={{ accentColor: '#999' }}
                    />
                  </div>
                </div>
                <button
                  onClick={runIterativeScan}
                  disabled={isLoading || !isQuery.trim() || !isCategory}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                >
                  {isLoading ? (
                    <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Running Comparison...</>
                  ) : (
                    <><Play className="h-4 w-4" /> Run Filtered Search Comparison</>
                  )}
                </button>
              </div>

              {/* Results */}
              {isResults && (
                <>
                  {/* pgvector 0.8.0 availability warning */}
                  {!isResults.pgvector_080_available && (
                    <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                      <AlertCircle className="h-4 w-4" style={{ color: '#fbbf24' }} />
                      <p className="text-xs" style={{ color: '#fbbf24' }}>pgvector 0.8.0 not detected — iterative scan is unavailable. Showing standard filtered results only.</p>
                    </div>
                  )}

                  {/* Key Metric */}
                  {isResults.without_iterative_scan && isResults.with_iterative_scan && (
                    <div className="p-5 rounded-xl text-center" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Result Count Improvement</p>
                      <div className="text-4xl font-bold" style={{ color: '#34d399' }}>
                        {isResults.without_iterative_scan.result_count} → {isResults.with_iterative_scan.result_count}
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Requested {isResults.limit} results · Category: "{isResults.category_filter}"
                      </p>
                    </div>
                  )}

                  {/* Side-by-side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Without */}
                    <div className="p-5 rounded-xl" style={{ background: 'rgba(251, 146, 60, 0.06)', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: '#fb923c' }}>Without Iterative Scan</h4>
                      <p className="text-[10px] mb-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Standard HNSW — fixed candidate set, then filter</p>
                      {isResults.without_iterative_scan ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Results Returned</div>
                            <div className="text-3xl font-bold" style={{ color: '#fb923c' }}>{isResults.without_iterative_scan.result_count}<span className="text-sm font-normal" style={{ color: 'rgba(255, 255, 255, 0.3)' }}> / {isResults.limit}</span></div>
                          </div>
                          <div>
                            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Execution Time</div>
                            <div className="text-lg font-semibold" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{isResults.without_iterative_scan.execution_time_ms}ms</div>
                          </div>
                          {isResults.without_iterative_scan.result_count < isResults.limit && (
                            <div className="p-2 rounded-lg text-[10px]" style={{ background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' }}>
                              Overfiltering! Only {isResults.without_iterative_scan.result_count} of {isResults.limit} results returned
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No data</p>
                      )}
                    </div>

                    {/* With */}
                    <div className="p-5 rounded-xl" style={{ background: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: '#34d399' }}>With Iterative Scan</h4>
                      <p className="text-[10px] mb-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>pgvector 0.8.0 — continues traversal until LIMIT met</p>
                      {isResults.with_iterative_scan ? (
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Results Returned</div>
                            <div className="text-3xl font-bold" style={{ color: '#34d399' }}>{isResults.with_iterative_scan.result_count}<span className="text-sm font-normal" style={{ color: 'rgba(255, 255, 255, 0.3)' }}> / {isResults.limit}</span></div>
                          </div>
                          <div>
                            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Execution Time</div>
                            <div className="text-lg font-semibold" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{isResults.with_iterative_scan.execution_time_ms}ms</div>
                          </div>
                          {isResults.with_iterative_scan.result_count >= isResults.limit && (
                            <div className="p-2 rounded-lg text-[10px]" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>
                              Full {isResults.limit} results returned
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                          {isResults.pgvector_080_available === false ? 'Requires pgvector 0.8.0+' : 'No data'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SQL Example */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Enable Iterative Scan</h4>
                    <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: 'rgba(0, 0, 0, 0.5)', color: 'rgba(52, 211, 153, 0.8)' }}>
{`SET hnsw.iterative_scan = 'relaxed_order';
SET hnsw.max_scan_tuples = 20000;

-- Then run your filtered query as normal
SELECT * FROM products
WHERE category = 'Electronics'
ORDER BY embedding <=> query_vector
LIMIT 10;`}
                    </pre>
                  </div>
                </>
              )}

              {/* Empty state */}
              {!isResults && !isLoading && (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 mx-auto mb-3" style={{ color: 'rgba(255, 255, 255, 0.1)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Select a category and run the comparison to see the overfiltering fix</p>
                </div>
              )}
            </div>
          ) : activeTab === 'quantization' ? (
            /* Quantization Tab */
            <div className="space-y-6">
              {quantLoading ? (
                <div className="text-center py-16">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 animate-pulse" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Loading quantization data...</p>
                </div>
              ) : quantData ? (
                <>
                  {/* Side-by-side cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Full Precision */}
                    <div className="p-5 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: '#60a5fa' }}>Full Precision</h4>
                      <div className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>{quantData.full_precision.index_size}</div>
                      <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{quantData.full_precision.type} · {quantData.full_precision.bytes_per_vector} B/vec</div>
                      <div className="mt-3 h-3 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.4)' }} />
                    </div>
                    {/* Scalar Quantization */}
                    <div className="p-5 rounded-xl" style={{ background: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: '#34d399' }}>Scalar Quantization</h4>
                      <div className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>{quantData.scalar_quantization.estimated_index_size}</div>
                      <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{quantData.scalar_quantization.type} · {quantData.scalar_quantization.bytes_per_vector} B/vec</div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-3 rounded-full flex-1" style={{ background: 'rgba(52, 211, 153, 0.4)', width: '25%', maxWidth: '25%' }} />
                        <span className="text-xs font-bold" style={{ color: '#34d399' }}>{quantData.scalar_quantization.memory_reduction} smaller</span>
                      </div>
                    </div>
                    {/* Binary Quantization */}
                    <div className="p-5 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: '#c084fc' }}>Binary Quantization</h4>
                      <div className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>{quantData.binary_quantization.estimated_index_size}</div>
                      <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{quantData.binary_quantization.type} · {quantData.binary_quantization.bytes_per_vector} B/vec</div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-3 rounded-full" style={{ background: 'rgba(168, 85, 247, 0.4)', width: '3%', minWidth: '4px' }} />
                        <span className="text-xs font-bold" style={{ color: '#c084fc' }}>{quantData.binary_quantization.memory_reduction} smaller</span>
                      </div>
                    </div>
                  </div>

                  {/* Memory bar chart */}
                  <div className="p-5 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Memory Comparison</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'float32', bytes: quantData.full_precision.index_bytes, color: 'rgba(96, 165, 250, 0.6)' },
                        { label: 'int8 (SQ)', bytes: quantData.scalar_quantization.estimated_index_bytes, color: 'rgba(52, 211, 153, 0.6)' },
                        { label: '1-bit (BQ)', bytes: quantData.binary_quantization.estimated_index_bytes, color: 'rgba(192, 132, 252, 0.6)' },
                      ].map(item => {
                        const pct = (item.bytes / quantData!.full_precision.index_bytes) * 100;
                        return (
                          <div key={item.label} className="flex items-center gap-3">
                            <span className="text-xs w-16 text-right" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{item.label}</span>
                            <div className="flex-1 h-5 rounded" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                              <div className="h-full rounded transition-all" style={{ width: `${Math.max(pct, 1)}%`, background: item.color }} />
                            </div>
                            <span className="text-xs w-12 text-right" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{quantData.row_count.toLocaleString()} vectors · {quantData.dimensions} dimensions</div>
                  </div>

                  {/* SQL Example */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>CREATE INDEX (Scalar Quantization)</h4>
                    <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: 'rgba(0, 0, 0, 0.5)', color: 'rgba(52, 211, 153, 0.8)' }}>
                      {quantData.sql_examples.sq}
                    </pre>
                    <p className="text-[10px] mt-2" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{quantData.note}</p>
                  </div>

                  {/* Live Benchmark Section */}
                  <div className="p-5 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <FlaskConical className="h-4 w-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                      <h4 className="text-sm font-semibold" style={{ color: '#ffffff' }}>Live Benchmark</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.4)' }}>
                        Expression casts · No DDL required
                      </span>
                    </div>
                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        value={qbQuery}
                        onChange={e => setQbQuery(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && runQuantBenchmark()}
                        placeholder="Search query..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                        style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      />
                      <button
                        onClick={runQuantBenchmark}
                        disabled={qbLoading || !qbQuery.trim()}
                        className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center gap-2"
                        style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                      >
                        {qbLoading ? (
                          <><div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" /> Benchmarking...</>
                        ) : (
                          <><Play className="h-3.5 w-3.5" /> Run Benchmark</>
                        )}
                      </button>
                    </div>

                    {qbResults && (
                      <div className="space-y-4">
                        {/* Result cards */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* float32 */}
                          {qbResults.float32 && (
                            <div className="p-4 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                              <h5 className="text-xs font-semibold mb-2" style={{ color: '#60a5fa' }}>float32 (Baseline)</h5>
                              <div className="text-2xl font-bold" style={{ color: '#ffffff' }}>{qbResults.float32.execution_time_ms}ms</div>
                              <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{qbResults.float32.result_count} results · 100% recall</div>
                            </div>
                          )}
                          {/* halfvec */}
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(52, 211, 153, 0.06)', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
                            <h5 className="text-xs font-semibold mb-2" style={{ color: '#34d399' }}>halfvec (SQ)</h5>
                            {qbResults.halfvec_available && qbResults.halfvec && !qbResults.halfvec.error ? (
                              <>
                                <div className="text-2xl font-bold" style={{ color: '#ffffff' }}>{qbResults.halfvec.execution_time_ms}ms</div>
                                <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{qbResults.halfvec.result_count} results · {qbResults.halfvec.recall_vs_float32}% recall</div>
                              </>
                            ) : (
                              <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                {qbResults.halfvec?.error ? 'Cast not supported' : 'Unavailable'}
                              </div>
                            )}
                          </div>
                          {/* binary */}
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                            <h5 className="text-xs font-semibold mb-2" style={{ color: '#c084fc' }}>binary (BQ)</h5>
                            {qbResults.binary_available && qbResults.binary && !qbResults.binary.error ? (
                              <>
                                <div className="text-2xl font-bold" style={{ color: '#ffffff' }}>{qbResults.binary.execution_time_ms}ms</div>
                                <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{qbResults.binary.result_count} results · {qbResults.binary.recall_vs_float32}% recall</div>
                              </>
                            ) : (
                              <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                                {qbResults.binary?.error ? 'Cast not supported' : 'Unavailable'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timing bar chart */}
                        {qbResults.float32 && (
                          <div className="p-4 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                            <h5 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Execution Time Comparison</h5>
                            {[
                              { label: 'float32', time: qbResults.float32.execution_time_ms, color: 'rgba(96, 165, 250, 0.6)', available: true },
                              { label: 'halfvec', time: qbResults.halfvec?.execution_time_ms, color: 'rgba(52, 211, 153, 0.6)', available: qbResults.halfvec_available && !qbResults.halfvec?.error },
                              { label: 'binary', time: qbResults.binary?.execution_time_ms, color: 'rgba(192, 132, 252, 0.6)', available: qbResults.binary_available && !qbResults.binary?.error },
                            ].filter(i => i.available && i.time != null).map(item => {
                              const maxTime = Math.max(qbResults.float32.execution_time_ms, qbResults.halfvec?.execution_time_ms || 0, qbResults.binary?.execution_time_ms || 0);
                              const pct = maxTime > 0 ? (item.time / maxTime) * 100 : 0;
                              return (
                                <div key={item.label} className="flex items-center gap-3 mb-2">
                                  <span className="text-xs w-14 text-right" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{item.label}</span>
                                  <div className="flex-1 h-4 rounded" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                    <div className="h-full rounded transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: item.color }} />
                                  </div>
                                  <span className="text-xs w-16 text-right font-mono" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{item.time}ms</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Educational note */}
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      <span className="font-medium" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>pgvector 0.8.0+</span> supports scalar (SQ) and binary (BQ) quantization.
                      SQ reduces each float32 to int8 (4x savings) with minimal recall loss.
                      BQ compresses to 1-bit (32x savings) — best for initial candidate retrieval with re-ranking.
                      The live benchmark above uses expression casts at query time — no CREATE INDEX required.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.1)' }} />
                  <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Click to load quantization comparison</p>
                  <button onClick={fetchQuantization} className="mt-4 px-4 py-2 rounded-xl text-sm" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>Load Data</button>
                </div>
              )}
            </div>
          ) : (
          <>
          {/* Controls Section */}
          <div className="mb-6 p-6 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
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
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
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
              <div className="p-6 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-white/50" />
                  <h3 className="text-lg font-semibold text-text-primary">Comparison Analysis</h3>
                  <span className="text-xs text-text-secondary">
                    ({results.comparison.dataset_size.toLocaleString()} rows)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="text-sm text-text-secondary mb-1">Speedup</div>
                    <div className={`text-2xl font-bold ${getSpeedupColor(results.comparison.speedup_factor)}`}>
                      {results.comparison.speedup_factor}x
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="text-sm text-text-secondary mb-1">Time Saved</div>
                    <div className="text-2xl font-bold text-green-400">
                      {results.comparison.time_saved_ms}ms
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="text-sm text-text-secondary mb-1">Efficiency</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {results.comparison.time_saved_pct}%
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
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
              <div className="p-6 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
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
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
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
          </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-start gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
            <div>
              <p className="font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Production Database Tuning</p>
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