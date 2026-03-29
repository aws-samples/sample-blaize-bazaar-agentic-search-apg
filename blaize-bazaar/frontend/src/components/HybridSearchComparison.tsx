/**
 * Hybrid Search Comparison - Side-by-Side Results
 * Compare vector-only vs hybrid search results
 */
import { useState } from 'react';
import { X, Search, Zap, TrendingUp, BarChart3, CheckCircle, XCircle, Trophy } from 'lucide-react';

interface SearchResult {
  product_id: string;
  product_description: string;
  img_url: string;
  product_url: string;
  price: number;
  rating: number;
  reviews: number;
  similarity?: number;
  rrf_score?: number;
  vector_rank?: number;
  fulltext_rank?: number;
}

interface HybridSearchComparisonProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EvalResult {
  query: string;
  category: string;
  precision_at_k: number;
  ndcg_at_k: number;
  matches?: number;
  retrieved_count?: number;
  error?: string;
}

interface EvalData {
  method: string;
  k: number;
  avg_precision_at_k: number;
  avg_ndcg_at_k: number;
  evaluated: number;
  total_queries: number;
  results: EvalResult[];
}

interface LeaderboardEntry {
  name: string;
  ndcg: number;
  precision: number;
  vector_w: number;
  fulltext_w: number;
  k: number;
  ts: string;
}

interface TuneResult {
  ndcg_at_k: number;
  precision_at_k: number;
  k: number;
  vector_weight: number;
  fulltext_weight: number;
  rank: number;
  leaderboard: LeaderboardEntry[];
  evaluated_queries: number;
}

const HybridSearchComparison = ({ isOpen, onClose }: HybridSearchComparisonProps) => {
  const [query, setQuery] = useState('');
  const [vectorResults, setVectorResults] = useState<SearchResult[]>([]);
  const [hybridResults, setHybridResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vectorTime, setVectorTime] = useState(0);
  const [hybridTime, setHybridTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'compare' | 'eval' | 'tune'>('compare');
  const [vectorEval, setVectorEval] = useState<EvalData | null>(null);
  const [hybridEval, setHybridEval] = useState<EvalData | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  // Tune tab state
  const [tuneVectorWeight, setTuneVectorWeight] = useState(60);
  const [tuneFulltextWeight, setTuneFulltextWeight] = useState(40);
  const [participantName, setParticipantName] = useState('');
  const [tuneResult, setTuneResult] = useState<TuneResult | null>(null);
  const [tuneLoading, setTuneLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const runEvaluation = async () => {
    setEvalLoading(true);
    try {
      const [vRes, hRes] = await Promise.all([
        fetch('/api/search/eval?method=vector&k=5'),
        fetch('/api/search/eval?method=hybrid&k=5'),
      ]);
      if (vRes.ok) setVectorEval(await vRes.json());
      if (hRes.ok) setHybridEval(await hRes.json());
    } catch (error) {
      console.error('Evaluation failed:', error);
    } finally {
      setEvalLoading(false);
    }
  };

  const runTuning = async () => {
    setTuneLoading(true);
    try {
      const total = tuneVectorWeight + tuneFulltextWeight;
      const vw = total > 0 ? tuneVectorWeight / total : 0.5;
      const fw = total > 0 ? tuneFulltextWeight / total : 0.5;
      const res = await fetch('/api/search/eval/tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector_weight: vw,
          fulltext_weight: fw,
          k: 10,
          participant_name: participantName || 'Anonymous',
        }),
      });
      if (res.ok) {
        const data: TuneResult = await res.json();
        setTuneResult(data);
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Tune failed:', err);
    } finally {
      setTuneLoading(false);
    }
  };

  const runComparison = async () => {
    if (!query.trim()) return;

    setIsLoading(true);

    try {
      // Vector-only search
      const vectorStart = performance.now();
      const vectorRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 5, min_similarity: 0 })
      });
      const vectorData = await vectorRes.json();
      setVectorTime(performance.now() - vectorStart);
      const vectorProducts = vectorData.results?.map((r: any) => {
        const product = r.product || r;
        return {
          product_id: product.productId || product.product_id,
          product_description: product.product_description,
          img_url: product.imgurl || product.img_url,
          product_url: product.producturl || product.product_url,
          price: product.price,
          rating: product.stars || product.rating,
          reviews: product.reviews,
          similarity: product.similarity_score || product.similarity
        };
      }) || [];
      setVectorResults(vectorProducts);

      // Hybrid search
      const hybridStart = performance.now();
      const hybridRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `hybrid:${query}`, limit: 5, min_similarity: 0 })
      });
      const hybridData = await hybridRes.json();
      setHybridTime(performance.now() - hybridStart);
      const hybridProducts = hybridData.results?.map((r: any) => {
        const product = r.product || r;
        return {
          product_id: product.productId || product.product_id,
          product_description: product.product_description,
          img_url: product.imgurl || product.img_url,
          product_url: product.producturl || product.product_url,
          price: product.price,
          rating: product.stars || product.rating,
          reviews: product.reviews,
          rrf_score: r.rrf_score || product.rrf_score,
          vector_rank: r.vector_rank || product.vector_rank,
          fulltext_rank: r.fulltext_rank || product.fulltext_rank
        };
      }) || [];
      setHybridResults(hybridProducts);

    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-[95vw] max-w-[1400px] max-h-[90vh] rounded-[20px] flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <div>
              <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>Hybrid Search</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Compare results & evaluate quality
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['compare', 'eval', 'tune'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: activeTab === tab ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                  border: activeTab === tab ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                }}
              >
                {tab === 'eval' ? 'Eval' : tab === 'tune' ? 'Tune' : 'Compare'}
              </button>
            ))}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-2">
              <X className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
            </button>
          </div>
        </div>

        {activeTab === 'tune' ? (
          /* Tune Tab — RRF Weight Tuning Competition */
          <div className="flex-1 overflow-y-auto px-6 py-6 search-scroll">
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#ffffff' }}>RRF Weight Tuning Competition</h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Adjust the balance between vector (semantic) and full-text (keyword) search. Submit to see your NDCG@10 score and rank.
              </p>
            </div>

            {/* Weight sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="text-xs font-medium" style={{ color: 'rgba(96,165,250,0.9)' }}>
                    Vector weight — {tuneVectorWeight}%
                  </label>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>semantic understanding</span>
                </div>
                <input
                  type="range" min={0} max={100} value={tuneVectorWeight}
                  onChange={(e) => { const v = Number(e.target.value); setTuneVectorWeight(v); setTuneFulltextWeight(100 - v); }}
                  className="w-full"
                  style={{ accentColor: '#60a5fa' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="text-xs font-medium" style={{ color: 'rgba(192,132,252,0.9)' }}>
                    Full-text weight — {tuneFulltextWeight}%
                  </label>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>keyword matching</span>
                </div>
                <input
                  type="range" min={0} max={100} value={tuneFulltextWeight}
                  onChange={(e) => { const v = Number(e.target.value); setTuneFulltextWeight(v); setTuneVectorWeight(100 - v); }}
                  className="w-full"
                  style={{ accentColor: '#c084fc' }}
                />
              </div>
            </div>

            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Vector-heavy', v: 80, f: 20 },
                { label: 'Balanced', v: 60, f: 40 },
                { label: 'Keyword-heavy', v: 30, f: 70 },
                { label: 'Vector-only', v: 100, f: 0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => { setTuneVectorWeight(preset.v); setTuneFulltextWeight(preset.f); }}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: tuneVectorWeight === preset.v ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    color: tuneVectorWeight === preset.v ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    border: tuneVectorWeight === preset.v ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {preset.label} ({preset.v}/{preset.f})
                </button>
              ))}
            </div>

            {/* Name + Submit */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <input
                type="text"
                value={participantName}
                maxLength={20}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Your name (optional)"
                className="flex-1 px-3 py-2 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}
              />
              <button
                onClick={runTuning}
                disabled={tuneLoading}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff' }}
              >
                <BarChart3 className="h-4 w-4" />
                {tuneLoading ? 'Evaluating (~15s)...' : 'Submit Score'}
              </button>
            </div>

            {/* Result card */}
            {tuneResult && (
              <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Your Result</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                    Rank #{tuneResult.rank}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#ffffff' }}>{(tuneResult.ndcg_at_k * 100).toFixed(1)}%</div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>NDCG@{tuneResult.k}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl font-bold" style={{ color: '#ffffff' }}>{(tuneResult.precision_at_k * 100).toFixed(1)}%</div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Precision@{tuneResult.k}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{Math.round(tuneResult.vector_weight * 100)}/{Math.round(tuneResult.fulltext_weight * 100)}</div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>V/FT weights</div>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Trophy className="h-3 w-3 inline-block mr-1" style={{ color: '#fcd34d' }} />
                  Top Scores
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={`${entry.name}-${entry.ts}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{
                        background: idx === 0 ? 'rgba(252,211,77,0.06)' : 'rgba(255,255,255,0.02)',
                        border: idx === 0 ? '1px solid rgba(252,211,77,0.15)' : '1px solid transparent',
                      }}
                    >
                      <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: idx === 0 ? '#fcd34d' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : 'rgba(255,255,255,0.3)' }}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.name}</span>
                      <span className="text-xs font-mono" style={{ color: 'rgba(96,165,250,0.8)' }}>{(entry.ndcg * 100).toFixed(1)}%</span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {Math.round(entry.vector_w * 100)}v/{Math.round(entry.fulltext_w * 100)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!tuneResult && leaderboard.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>No scores yet</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Adjust weights and click Submit to start the competition</p>
              </div>
            )}
          </div>
        ) : activeTab === 'eval' ? (
          /* Evaluation Tab */
          <div className="flex-1 overflow-y-auto px-6 py-6 search-scroll">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#ffffff' }}>Search Quality Evaluation</h3>
                <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  Precision@5 and NDCG@5 against 25 golden queries
                </p>
              </div>
              <button
                onClick={runEvaluation}
                disabled={evalLoading}
                className="px-4 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-40 flex items-center gap-2"
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
              >
                <BarChart3 className="h-4 w-4" />
                {evalLoading ? 'Evaluating...' : 'Run Evaluation'}
              </button>
            </div>

            {vectorEval && hybridEval ? (
              <>
                {/* Metric Cards Side by Side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Vector Metrics */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: '#60a5fa' }}>Vector Search</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="text-xl font-bold" style={{ color: '#ffffff' }}>{(vectorEval.avg_precision_at_k * 100).toFixed(1)}%</div>
                        <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Precision@5</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="text-xl font-bold" style={{ color: '#ffffff' }}>{(vectorEval.avg_ndcg_at_k * 100).toFixed(1)}%</div>
                        <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>NDCG@5</div>
                      </div>
                    </div>
                    <div className="text-[10px] mt-2 text-center" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{vectorEval.evaluated}/{vectorEval.total_queries} queries</div>
                  </div>

                  {/* Hybrid Metrics */}
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: '#c084fc' }}>Hybrid Search (RRF)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="text-xl font-bold" style={{ color: '#ffffff' }}>{(hybridEval.avg_precision_at_k * 100).toFixed(1)}%</div>
                        <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Precision@5</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="text-xl font-bold" style={{ color: '#ffffff' }}>{(hybridEval.avg_ndcg_at_k * 100).toFixed(1)}%</div>
                        <div className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>NDCG@5</div>
                      </div>
                    </div>
                    <div className="text-[10px] mt-2 text-center" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{hybridEval.evaluated}/{hybridEval.total_queries} queries</div>
                  </div>
                </div>

                {/* Per-Query Results Table */}
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Per-Query Breakdown</h4>
                <div className="space-y-1">
                  {vectorEval.results.map((vr, idx) => {
                    const hr = hybridEval.results[idx];
                    return (
                      <div key={vr.query} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs truncate block" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{vr.query}</span>
                          <span className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{vr.category}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {vr.precision_at_k > 0 ? <CheckCircle className="h-3 w-3" style={{ color: 'rgba(52, 211, 153, 0.6)' }} /> : <XCircle className="h-3 w-3" style={{ color: 'rgba(248, 113, 113, 0.6)' }} />}
                          <span className="text-[10px] w-12 text-right" style={{ color: 'rgba(96, 165, 250, 0.7)' }}>{(vr.precision_at_k * 100).toFixed(0)}%</span>
                          <span className="text-[10px] w-12 text-right" style={{ color: 'rgba(192, 132, 252, 0.7)' }}>{hr ? (hr.precision_at_k * 100).toFixed(0) : 0}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <BarChart3 className="h-16 w-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.1)' }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Click "Run Evaluation" to compare vector vs hybrid search quality</p>
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Search Input */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && runComparison()}
              placeholder="Enter search query (e.g., 'luxury watch for a gift')"
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none"
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            />
            <button
              onClick={runComparison}
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>Try:</span>
            {['luxury watch', 'running shoes', 'wireless earbuds', 'skincare routine', 'kitchen knife'].map((sample) => (
              <button
                key={sample}
                onClick={() => setQuery(sample)}
                className="text-xs px-3 py-1 rounded-full transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-6 search-scroll">
          {vectorResults.length === 0 && hybridResults.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="h-16 w-16 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.1)' }} />
              <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Enter a query and click Compare to see the difference</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Vector-Only Results */}
              <div>
                <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold" style={{ color: '#60a5fa' }}>Vector-Only Search</h3>
                    <span className="text-sm font-mono" style={{ color: 'rgba(96, 165, 250, 0.7)' }}>{vectorTime.toFixed(0)}ms</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Semantic similarity via pgvector HNSW</p>
                </div>
                <div className="space-y-2">
                  {vectorResults.map((result, idx) => (
                    <div
                      key={result.product_id}
                      className="p-3 rounded-xl transition-all"
                      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      <div className="flex gap-3">
                        <img
                          src={result.img_url}
                          alt={result.product_description}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>#{idx + 1}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgba(96, 165, 250, 0.8)' }}>
                              {result.similarity ? `${(result.similarity * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                            <span className="ml-auto text-sm font-semibold" style={{ color: '#34d399' }}>${result.price}</span>
                          </div>
                          <p className="text-sm line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{result.product_description}</p>
                          <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                            <span>★ {result.rating}</span>
                            <span>{result.reviews} reviews</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hybrid Results */}
              <div>
                <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold" style={{ color: '#c084fc' }}>Hybrid Search (RRF)</h3>
                    <span className="text-sm font-mono" style={{ color: 'rgba(192, 132, 252, 0.7)' }}>{hybridTime.toFixed(0)}ms</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Vector + Full-Text with Reciprocal Rank Fusion</p>
                </div>
                <div className="space-y-2">
                  {hybridResults.map((result, idx) => {
                    const vectorIdx = vectorResults.findIndex(v => v.product_id === result.product_id);
                    const isReranked = vectorIdx !== -1 && vectorIdx !== idx;
                    const isNewResult = vectorIdx === -1;

                    return (
                    <div
                      key={result.product_id}
                      className="p-3 rounded-xl transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: isNewResult
                          ? '1px solid rgba(52, 211, 153, 0.3)'
                          : isReranked
                          ? '1px solid rgba(251, 191, 36, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      <div className="flex gap-3">
                        <img
                          src={result.img_url}
                          alt={result.product_description}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>#{idx + 1}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'rgba(192, 132, 252, 0.8)' }}>
                              RRF: {result.rrf_score ? result.rrf_score.toFixed(4) : 'N/A'}
                            </span>
                            <span className="ml-auto text-sm font-semibold" style={{ color: '#34d399' }}>${result.price}</span>
                          </div>
                          <p className="text-sm line-clamp-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{result.product_description}</p>
                          <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                            <span>★ {result.rating}</span>
                            <span>{result.reviews} reviews</span>
                            {result.vector_rank && <span style={{ color: 'rgba(96, 165, 250, 0.6)' }}>V:{result.vector_rank}</span>}
                            {result.fulltext_rank && <span style={{ color: 'rgba(251, 191, 36, 0.6)' }}>FT:{result.fulltext_rank}</span>}
                            {isNewResult && <span style={{ color: '#34d399' }}>NEW</span>}
                            {isReranked && <span style={{ color: '#fbbf24' }}>Was #{vectorIdx + 1}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-start gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
            <p>
              <span className="font-medium" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Hybrid Search</span> combines
              semantic similarity (vector) with keyword matching (full-text) using Reciprocal Rank Fusion.
              V = Vector rank, FT = Full-text rank. Green border = new result from full-text, Yellow = re-ranked.
            </p>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default HybridSearchComparison;
