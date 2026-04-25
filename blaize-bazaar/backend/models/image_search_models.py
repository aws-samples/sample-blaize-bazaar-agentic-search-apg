"""
Image Search Models - Request and Response models for multi-modal search
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ImageSearchResponse(BaseModel):
    """Response from image-based search"""
    
    query_type: str = "image"
    analysis: Dict[str, Any] = Field(
        description="Claude Opus 4 vision analysis of the uploaded image"
    )
    search_query: str = Field(
        description="Generated search query from image analysis"
    )
    results: List[Dict] = Field(
        description="Product search results similar to the uploaded image"
    )
    total_results: int
    search_time_ms: float
    image_preview: Optional[str] = Field(
        default=None,
        description="Base64 preview of uploaded image (first 200 chars)"
    )


class ImageAnalysis(BaseModel):
    """Structured image analysis from Claude Opus 4"""
    
    description: str = Field(
        description="Detailed product description"
    )
    category: str = Field(
        description="Inferred product category"
    )
    key_features: List[str] = Field(
        default=[],
        description="List of notable product features"
    )
    search_keywords: List[str] = Field(
        default=[],
        description="Keywords optimized for semantic search"
    )
