"""
Search request and response models
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field

from .product import ProductWithScore


class SearchRequest(BaseModel):
    """Search request model for Lab 1 semantic search"""

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Search query text"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of results to return"
    )
    min_similarity: float = Field(
        default=0.0,
        ge=0,
        le=1,
        description="Minimum similarity score threshold (0-1)"
    )
    search_mode: str = Field(
        default="vector",
        description="Search mode: 'vector', 'hybrid', or 'keyword'"
    )


class SearchResult(BaseModel):
    """Individual search result"""
    
    product: ProductWithScore
    explanation: Optional[str] = None
    rrf_score: Optional[float] = None
    vector_rank: Optional[int] = None
    fulltext_rank: Optional[int] = None


class SearchResponse(BaseModel):
    """Search response model containing results and metadata"""
    
    query: str
    results: List[SearchResult]
    total_results: int
    search_time_ms: float
    search_type: str = "semantic"


class RecommendationRequest(BaseModel):
    """Recommendation request model for Lab 2"""
    
    productId: str
    limit: int = 5
    exclude_same_product: bool = True


class AgentResponse(BaseModel):
    """Response from multi-agent system (Lab 2)"""
    
    agent_name: str
    response: str
    data: Optional[dict] = None
    execution_time_ms: float
    tools_used: List[str] = []


class HealthResponse(BaseModel):
    """Health check response"""
    
    status: str
    database: str
    bedrock: str
    custom_tools: str = "not_available"
    version: str


class ChatMessage(BaseModel):
    """Chat message"""
    role: str
    content: str


class ChatRequest(BaseModel):
    """Chat request"""
    message: str
    conversation_history: List[ChatMessage] = []
    session_id: Optional[str] = None
    workshop_mode: Optional[str] = Field(default=None, description="Workshop progression mode: 'legacy', 'search', 'agentic', 'production'")
    guardrails_enabled: bool = Field(default=False, description="Enable content moderation guardrails")


class ChatResponse(BaseModel):
    """Chat response"""
    response: str
    products: List[Dict] = []
    suggestions: List[str] = []
    tool_calls: List[Dict] = []
    agent_execution: Optional[Dict] = None
    model: str = ""
    success: bool = True
    token_count: Optional[int] = None
    estimated_cost_usd: Optional[float] = None
