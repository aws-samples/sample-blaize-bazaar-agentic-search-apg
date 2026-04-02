/**
 * ImageSearchModal - Multi-Modal Product Search Component
 * Upload or drag-drop product images to find similar items using Claude Vision + pgvector.
 */
import { useState, useRef } from 'react';
import { Camera, X, Loader, Sparkles } from 'lucide-react';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (results: any) => void;
}

interface AnalysisResult {
  description: string;
  category: string;
  key_features: string[];
  search_keywords: string[];
}

const ImageSearchModal = ({ isOpen, onClose, onSearch }: ImageSearchModalProps) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large. Maximum size is 5MB');
      return;
    }

    setError(null);
    setAnalyzing(true);
    setPreview(URL.createObjectURL(file));
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/search/image?limit=12', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Image search failed');
      }
      const data = await response.json();
      setAnalysis(data.analysis);
      onSearch({
        type: 'image',
        query: data.search_query,
        analysis: data.analysis,
        results: data.results,
        searchTime: data.search_time_ms,
      });
    } catch (err: any) {
      console.error('Image search error:', err);
      setError(err.message || 'Failed to search by image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleClose = () => {
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setAnalyzing(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-[680px] max-h-[90vh] rounded-[20px] flex flex-col shadow-2xl overflow-hidden"
        style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: '#ffffff' }}>Visual Search</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {!preview ? (
            /* Upload Zone */
            <div
              className="border border-dashed rounded-2xl p-10 text-center transition-all duration-300"
              style={{
                borderColor: dragActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                background: dragActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                cursor: 'pointer',
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <div className="flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Camera className="h-7 w-7" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                </div>
                <div>
                  <p className="text-base font-medium mb-1.5 tracking-tight" style={{ color: '#ffffff' }}>Drop an image or click to browse</p>
                  <p className="text-xs tracking-wide" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>JPEG, PNG, or WebP up to 5 MB</p>
                </div>
              </div>
            </div>
          ) : (
            /* Preview & Analysis */
            <div className="space-y-5">
              {/* Image Preview */}
              <div className="relative">
                <img src={preview} alt="Upload preview" className="w-full h-56 object-contain rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
                {analyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader className="h-6 w-6 animate-spin" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                      <p className="text-xs font-medium tracking-wide" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Analyzing with Claude Sonnet 4.6
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              {analysis && !analyzing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400/80" />
                    <span className="text-xs font-medium tracking-wide" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Analysis complete</span>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <p className="text-[10px] uppercase tracking-widest mb-1 font-medium" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Description</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{analysis.description}</p>
                    </div>
                    <div className="px-4 py-3" style={{ borderBottom: analysis.key_features?.length ? '1px solid rgba(255, 255, 255, 0.04)' : 'none' }}>
                      <p className="text-[10px] uppercase tracking-widest mb-1 font-medium" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Category</p>
                      <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{analysis.category}</p>
                    </div>
                    {analysis.key_features && analysis.key_features.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest mb-2 font-medium" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Features</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.key_features.map((feature, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-center tracking-wide" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                    Matching results shown in search overlay
                  </p>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Try Another Button */}
              {!analyzing && (
                <button
                  onClick={() => { setPreview(null); setAnalysis(null); setError(null); }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/10"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  Try another image
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
              <Sparkles className="h-3 w-3" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
            </div>
            <span className="text-xs font-medium tracking-wide" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Claude Sonnet 4.6 Vision + Cohere Embeddings + pgvector
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSearchModal;
