/**
 * Hybrid Search Comparison - Side-by-Side Results
 * Compare vector-only vs hybrid search results
 */
import { useState } from 'react';
import { X, Search, Zap, TrendingUp } from 'lucide-react';

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

const HybridSearchComparison = ({ isOpen, onClose }: HybridSearchComparisonProps) => {
  const [query, setQuery] = useState('');
  const [vectorResults, setVectorResults] = useState<SearchResult[]>([]);
  const [hybridResults, setHybridResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [vectorTime, setVectorTime] = useState(0);
  const [hybridTime, setHybridTime] = useState(0);

  const runComparison = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Vector-only search
      const vectorStart = performance.now();
      const vectorRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10, min_similarity: 0 })
      });
      const vectorData = await vectorRes.json();
      setVectorTime(performance.now() - vectorStart);
      console.log('Vector data:', vectorData);
      // Extract product data - handle both nested and flat structures
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
      
      // Hybrid search - using semantic endpoint with hybrid prefix
      const hybridStart = performance.now();
      const hybridRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `hybrid:${query}`, limit: 10, min_similarity: 0 })
      });
      const hybridData = await hybridRes.json();
      setHybridTime(performance.now() - hybridStart);
      console.log('Hybrid data:', hybridData);
      // Extract product data - handle both nested and flat structures
      const hybridProducts = hybridData.results?.map((r: any) => {
        const product = r.product || r;
        console.log('Hybrid product raw:', product);
        return {
          product_id: product.productId || product.product_id,
          product_description: product.product_description,
          img_url: product.imgurl || product.img_url,
          product_url: product.producturl || product.product_url,
          price: product.price,
          rating: product.stars || product.rating,
          reviews: product.reviews,
          rrf_score: r.rrf_score || product.rrf_score,  // Check both levels
          vector_rank: r.vector_rank || product.vector_rank,
          fulltext_rank: r.fulltext_rank || product.fulltext_rank
        };
      }) || [];
      console.log('Processed hybrid products:', hybridProducts);
      setHybridResults(hybridProducts);
      
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[95vw] max-w-[1400px] max-h-[90vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.98) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
            borderColor: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Hybrid Search Comparison</h2>
              <p className="text-xs text-text-secondary">Vector-only vs Hybrid (Vector + Full-Text + RRF)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors">
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && runComparison()}
              placeholder="Enter search query (e.g., 'wireless headphones')"
              className="flex-1 px-4 py-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-text-primary placeholder-text-secondary focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={runComparison}
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                color: 'white',
              }}
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
          {/* Sample Queries */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-text-secondary">Try:</span>
            {[
              'espresso machine',
              'coffee maker',
              'wireless headphones',
              'laptop computer',
              'gaming keyboard'
            ].map((sample) => (
              <button
                key={sample}
                onClick={() => setQuery(sample)}
                className="text-xs px-3 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {vectorResults.length === 0 && hybridResults.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="h-16 w-16 text-purple-400/30 mx-auto mb-4" />
              <p className="text-text-secondary">Enter a query and click Compare to see the difference</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Vector-Only Results */}
              <div>
                <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-blue-400">🔵 Vector-Only Search</h3>
                    <span className="text-sm text-blue-300">{vectorTime.toFixed(0)}ms</span>
                  </div>
                  <p className="text-xs text-text-secondary">Semantic similarity using pgvector HNSW index</p>
                </div>
                <div className="space-y-3">
                  {vectorResults.map((result, idx) => (
                    <a
                      key={result.product_id}
                      href={result.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex gap-3">
                        <img
                          src={result.img_url}
                          alt={result.product_description}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23374151" width="80" height="80"/%3E%3C/svg%3E'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-blue-400">#{idx + 1}</span>
                              <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                                {result.similarity ? `${(result.similarity * 100).toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-green-400">${result.price}</span>
                          </div>
                          <p className="text-sm text-text-primary mb-2 line-clamp-2">{result.product_description}</p>
                          <div className="flex items-center gap-3 text-xs text-text-secondary">
                            <span>⭐ {result.rating}</span>
                            <span>💬 {result.reviews} reviews</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Hybrid Results */}
              <div>
                <div className="mb-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-purple-400">🟣 Hybrid Search (RRF)</h3>
                    <span className="text-sm text-purple-300">{hybridTime.toFixed(0)}ms</span>
                  </div>
                  <p className="text-xs text-text-secondary">Vector + Full-Text with Reciprocal Rank Fusion</p>
                </div>
                <div className="space-y-3">
                  {hybridResults.map((result, idx) => {
                    const vectorIdx = vectorResults.findIndex(v => v.product_id === result.product_id);
                    const isReranked = vectorIdx !== -1 && vectorIdx !== idx;
                    const isNewResult = vectorIdx === -1;
                    
                    return (
                    <a
                      key={result.product_id}
                      href={result.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-purple-500/5 border hover:bg-purple-500/10 transition-all hover:scale-[1.02]"
                      style={{
                        borderColor: isNewResult ? 'rgba(34, 197, 94, 0.5)' : isReranked ? 'rgba(251, 191, 36, 0.5)' : 'rgba(168, 85, 247, 0.2)'
                      }}
                    >
                      <div className="flex gap-3">
                        <img
                          src={result.img_url}
                          alt={result.product_description}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23374151" width="80" height="80"/%3E%3C/svg%3E'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-purple-400">#{idx + 1}</span>
                              <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                                RRF: {result.rrf_score ? result.rrf_score.toFixed(4) : 'N/A'}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-green-400">${result.price}</span>
                          </div>
                          <p className="text-sm text-text-primary mb-2 line-clamp-2">{result.product_description}</p>
                          <div className="flex items-center gap-3 text-xs text-text-secondary">
                            <span>⭐ {result.rating}</span>
                            <span>💬 {result.reviews} reviews</span>
                            {result.vector_rank && <span className="text-blue-400">V:{result.vector_rank}</span>}
                            {result.fulltext_rank && <span className="text-yellow-400">FT:{result.fulltext_rank}</span>}
                            {isNewResult && <span className="text-green-400 font-semibold">✨ NEW</span>}
                            {isReranked && <span className="text-amber-400">↑ Was #{vectorIdx + 1}</span>}
                          </div>
                        </div>
                      </div>
                    </a>
                  )})}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t"
          style={{
            background: 'rgba(17, 24, 39, 0.8)',
            borderColor: 'rgba(75, 85, 99, 0.3)',
          }}
        >
          <p className="text-xs text-text-secondary">
            <strong className="text-purple-300">Hybrid Search:</strong> Combines semantic similarity (vector) 
            with keyword matching (full-text) using Reciprocal Rank Fusion. V: Vector rank, FT: Full-text rank.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HybridSearchComparison;
