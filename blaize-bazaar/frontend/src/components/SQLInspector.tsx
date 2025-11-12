/**
 * SQLInspector - Live SQL Query Inspector Component
 * Shows real-time pgvector queries with syntax highlighting and query plans
 */
import { useState, useEffect, useRef } from 'react';
import { X, Database, Clock, Zap, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';

interface QueryLog {
  query_type: string;
  sql: string;
  params: string[];
  execution_time_ms: number;
  timestamp: string;
  rows_returned: number;
  index_used: string | null;
  query_plan: any;
  search_query?: string;
}

interface SummaryStats {
  total_queries: number;
  avg_time_ms: number;
  min_time_ms: number;
  max_time_ms: number;
  total_rows: number;
  queries_by_type: Record<string, number>;
}

interface SQLInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQLInspector = ({ isOpen, onClose }: SQLInspectorProps) => {
  const [queries, setQueries] = useState<QueryLog[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Initial fetch
    fetchQueries();

    // Auto-refresh
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchQueries, 2000); // Every 2 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, autoRefresh]);

  const fetchQueries = async () => {
    try {
      const response = await fetch('/api/queries/recent?limit=20');
      const data = await response.json();
      setQueries(data.queries || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch queries:', error);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all query logs?')) return;
    
    try {
      await fetch('/api/queries/clear', { method: 'POST' });
      setQueries([]);
      fetchQueries();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const formatSQL = (sql: string): string => {
    // Simple SQL formatting
    return sql
      .replace(/SELECT/gi, '\nSELECT')
      .replace(/FROM/gi, '\nFROM')
      .replace(/WHERE/gi, '\nWHERE')
      .replace(/ORDER BY/gi, '\nORDER BY')
      .replace(/LIMIT/gi, '\nLIMIT')
      .trim();
  };

  const getQueryTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'semantic_search': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'image_search': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'autocomplete': 'bg-green-500/20 text-green-300 border-green-500/30',
      'category_browse': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getPerformanceColor = (timeMs: number): string => {
    if (timeMs < 50) return 'text-green-400';
    if (timeMs < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[90vw] h-[90vh] glass-strong rounded-[20px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-500/20 flex justify-between items-center bg-purple-500/5">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Live SQL Query Inspector
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Real-time pgvector query monitoring with EXPLAIN analysis
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                autoRefresh
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}
            >
              {autoRefresh ? (
                <>
                  <Eye className="h-3 w-3 inline mr-1" />
                  Auto-refresh
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 inline mr-1" />
                  Paused
                </>
              )}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={fetchQueries}
              className="p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className="h-4 w-4 text-text-secondary hover:text-purple-400" />
            </button>
            
            {/* Clear button */}
            <button
              onClick={handleClearLogs}
              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Clear all logs"
            >
              <Trash2 className="h-4 w-4 text-text-secondary hover:text-red-400" />
            </button>
            
            {/* Close button */}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-purple-500/10 transition-colors">
              <X className="h-5 w-5 text-text-secondary hover:text-text-primary" />
            </button>
          </div>
        </div>

        {/* Performance Info Banner */}
        <div className="px-6 py-3 bg-blue-500/10 border-b border-blue-500/30">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 mt-0.5 text-blue-400 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-blue-300 mb-1">Performance Breakdown</p>
              <p className="text-blue-200/80 leading-relaxed">
                <span className="font-medium text-blue-300">Total Search Time (~400ms)</span> = 
                <span className="text-yellow-300"> Bedrock Embeddings (~200ms)</span> + 
                <span className="text-green-300"> Database Query (&lt;1ms)</span> + 
                <span className="text-orange-300"> Network Latency (~150ms)</span> + 
                <span className="text-gray-300"> Processing (~50ms)</span>
              </p>
              <p className="text-blue-200/70 mt-1.5">
                💡 <span className="font-medium">HNSW Index Optimization:</span> Using <code className="px-1 py-0.5 bg-black/30 rounded text-purple-300">SET LOCAL enable_seqscan=off</code>, 
                <code className="px-1 py-0.5 bg-black/30 rounded text-purple-300">random_page_cost=1</code>, and 
                <code className="px-1 py-0.5 bg-black/30 rounded text-purple-300">cpu_tuple_cost=0.01</code> to force PostgreSQL to use the HNSW index for sub-millisecond vector similarity search.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="px-6 py-3 bg-purple-500/5 border-b border-purple-500/20">
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-xs text-text-secondary">Total Queries</div>
                <div className="text-lg font-semibold text-purple-400">{stats.total_queries}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-secondary">Avg Time</div>
                <div className={`text-lg font-semibold ${getPerformanceColor(stats.avg_time_ms)}`}>
                  {stats.avg_time_ms.toFixed(2)}ms
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-secondary">Min Time</div>
                <div className="text-lg font-semibold text-green-400">
                  {stats.min_time_ms.toFixed(2)}ms
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-secondary">Max Time</div>
                <div className="text-lg font-semibold text-red-400">
                  {stats.max_time_ms.toFixed(2)}ms
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-text-secondary">Total Rows</div>
                <div className="text-lg font-semibold text-blue-400">{stats.total_rows}</div>
              </div>
            </div>
          </div>
        )}

        {/* Query List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {queries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary">
              <Database className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg">No queries logged yet</p>
              <p className="text-sm mt-2">Perform a search to see SQL queries appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queries.map((query, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden transition-all duration-300 hover:border-purple-500/40"
                >
                  {/* Query Header */}
                  <div className="px-4 py-3 flex items-center justify-between bg-purple-500/10">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getQueryTypeColor(query.query_type)}`}>
                        {query.query_type}
                      </span>
                      {query.execution_time_ms > 0 && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Clock className="h-3 w-3" />
                          <span className={getPerformanceColor(query.execution_time_ms)}>
                            {query.execution_time_ms}ms
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-text-secondary">
                        {query.rows_returned} rows
                      </div>
                      {query.index_used && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <Zap className="h-3 w-3" />
                          {query.index_used}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedQuery(expandedQuery === idx ? null : idx)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      {expandedQuery === idx ? 'Hide More' : 'More Details'}
                    </button>
                  </div>

                  {/* Query Plan (Primary View) */}
                  {query.query_plan && query.query_plan.text && (
                    <div className="px-4 py-3 bg-black/40 border-b border-purple-500/20">
                      <div className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
                      </div>
                      <pre className="text-xs text-green-300/90 font-mono overflow-x-auto custom-scrollbar bg-black/50 p-3 rounded-lg leading-relaxed">
                        {query.query_plan.text}
                      </pre>
                    </div>
                  )}

                  {/* Search Query */}
                  {query.search_query && (
                    <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
                      <div className="text-xs font-medium text-blue-300 mb-1">🔍 Search Query:</div>
                      <div className="text-sm text-blue-200 font-medium">"{query.search_query}"</div>
                    </div>
                  )}

                  {/* Query SQL */}
                  <div className="px-4 py-3 bg-black/30">
                    <div className="text-xs font-medium text-purple-300 mb-2">SQL Query:</div>
                    <pre className="text-xs text-green-300 font-mono overflow-x-auto custom-scrollbar whitespace-pre">
                      {formatSQL(query.sql)}
                    </pre>
                  </div>

                  {/* Expanded Details */}
                  {expandedQuery === idx && (
                    <div className="border-t border-purple-500/20">
                      {/* Parameters */}
                      {query.params && query.params.length > 0 && (
                        <div className="px-4 py-3 border-b border-purple-500/20">
                          <div className="text-xs font-medium text-purple-300 mb-2">Parameters:</div>
                          <div className="space-y-1">
                            {query.params.map((param, pidx) => (
                              <div key={pidx} className="text-xs text-text-secondary font-mono">
                                ${pidx + 1}: {param}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* JSON Query Plan */}
                      {query.query_plan && query.query_plan.json && (
                        <div className="px-4 py-3 border-b border-purple-500/20">
                          <div className="text-xs font-medium text-purple-300 mb-2">Query Plan (JSON Format):</div>
                          <pre className="text-xs text-text-secondary font-mono overflow-x-auto custom-scrollbar bg-black/30 p-3 rounded-lg">
                            {JSON.stringify(query.query_plan.json, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="px-4 py-2 bg-purple-500/5 text-xs text-text-secondary">
                        Executed at: {new Date(query.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-purple-500/20 bg-purple-500/5">
          <div className="flex items-start gap-3 text-xs text-text-secondary">
            <Zap className="h-4 w-4 mt-0.5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-300 mb-1">Disclaimer</p>
              <p>
                SQL Inspector is built for the DAT406 workshop for illustrative and educational purposes only. 
                Inspect actual pgvector queries with <span className="text-purple-400">&lt;=&gt;</span> operator, 
                view HNSW index usage, analyze execution times, and understand query plans for optimization.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .sql-code .sql-keyword {
          color: #ba68c8;
          font-weight: 600;
        }
        .sql-code .sql-operator {
          color: #64b5f6;
          font-weight: 600;
        }
        .sql-code .sql-table {
          color: #81c784;
        }
        .sql-code .sql-vector {
          color: #ffb74d;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default SQLInspector;