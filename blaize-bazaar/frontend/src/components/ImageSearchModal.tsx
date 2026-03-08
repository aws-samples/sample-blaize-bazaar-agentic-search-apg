/**
 * ImageSearchModal - Multi-Modal Product Search Component
 * Upload or drag-drop product images to find similar items
 */
import { useState, useRef } from 'react';
import { Camera, X, Upload, Loader, Sparkles } from 'lucide-react';

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
    // Validation
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
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to backend
      const response = await fetch('/api/search/image?limit=12', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Image search failed');
      }

      const data = await response.json();

      // Set analysis results
      setAnalysis(data.analysis);

      // Trigger search with results
      onSearch({
        type: 'image',
        query: data.search_query,
        analysis: data.analysis,
        results: data.results,
        searchTime: data.search_time_ms
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
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
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
        className="w-[600px] max-h-[90vh] rounded-[20px] flex flex-col shadow-2xl overflow-hidden"
        style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
              Visual Product Search
            </h2>
            <Sparkles className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {!preview ? (
            /* Upload Zone */
            <div
              className="border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300"
              style={{
                borderColor: dragActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                background: dragActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                cursor: 'pointer',
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                  <Upload className="h-10 w-10" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                </div>

                <div>
                  <p className="text-lg font-medium mb-2" style={{ color: '#ffffff' }}>
                    Drop an image or click to upload
                  </p>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    JPEG, PNG, or WebP • Max 5MB
                  </p>
                </div>

                <div className="mt-2 px-6 py-2 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    Try uploading a photo of headphones, laptops, or any product
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Preview & Analysis */
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={preview}
                  alt="Upload preview"
                  className="w-full h-64 object-contain rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                />
                {analyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader className="h-8 w-8 animate-spin" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                      <p className="text-sm" style={{ color: '#ffffff' }}>Analyzing with Claude Sonnet 4...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              {analysis && !analyzing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-medium">AI Analysis Complete</span>
                  </div>

                  <div className="space-y-3">
                    {/* Description */}
                    <div className="p-4 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <p className="text-xs mb-1 font-medium" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>DESCRIPTION</p>
                      <p className="text-sm" style={{ color: '#ffffff' }}>{analysis.description}</p>
                    </div>

                    {/* Category */}
                    <div className="p-4 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <p className="text-xs mb-1 font-medium" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>CATEGORY</p>
                      <p className="text-sm" style={{ color: '#ffffff' }}>{analysis.category}</p>
                    </div>

                    {/* Key Features */}
                    {analysis.key_features && analysis.key_features.length > 0 && (
                      <div className="p-4 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <p className="text-xs mb-2 font-medium" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>KEY FEATURES</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.key_features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full text-xs"
                              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.6)' }}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs mt-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    <Sparkles className="h-4 w-4" />
                    <span>Results shown in search overlay</span>
                  </div>
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
                  onClick={() => {
                    setPreview(null);
                    setAnalysis(null);
                    setError(null);
                  }}
                  className="w-full px-4 py-3 rounded-lg font-medium transition-all duration-300"
                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
                >
                  Try Another Image
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="flex items-start gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
            <div>
              <p className="font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Powered by Claude Sonnet 4 Vision</p>
              <p>
                AI analyzes your image to understand product type, features, and style, 
                then searches our catalog using semantic understanding with pgvector.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSearchModal;
