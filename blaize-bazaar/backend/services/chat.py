"""
Chat Service with Product Card Support

Uses Strands SDK for multi-agent orchestration with direct asyncpg database access.
Context Manager tracks tokens and manages conversation state.
"""

import json
import logging
import os
import subprocess
import sys
from typing import List, Dict, Any, Optional
import re

import boto3

# Configure logging levels
logging.getLogger("strands").setLevel(logging.INFO)
logging.getLogger("strands.tools.registry").setLevel(logging.INFO)
logging.getLogger("strands.event_loop").setLevel(logging.INFO)
logging.getLogger("botocore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

logging.basicConfig(
    format="%(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler()],
    level=logging.INFO
)

logger = logging.getLogger(__name__)


class EnhancedChatService:
    """Enhanced chat service with product card support"""
    
    def __init__(self):
        """Initialize with Strands SDK for multi-agent orchestration"""
        from config import settings
        
        self.model_id = settings.BEDROCK_CHAT_MODEL
        self.region = settings.AWS_REGION
        self.bedrock = boto3.client('bedrock-runtime', region_name=self.region)
        self.session_storage_dir = "/tmp/blaize-sessions"
        
        # Check Strands availability
        try:
            from strands import Agent
            self.Agent = Agent
            self.strands_available = True
            logger.info("✅ ChatService initialized with Strands SDK")
            
        except ImportError as e:
            self.strands_available = False
            logger.error(f"❌ Strands SDK not available: {e}")
            logger.error("Install with: pip install strands-agents strands-agents-tools")
    

    
    def _get_system_prompt(self) -> str:
        """Enhanced system prompt for product recommendations"""
        return """You are Aurora AI, a sophisticated shopping assistant for Blaize Bazaar.

You have direct access to our Aurora PostgreSQL database with 21,704 products.

CRITICAL RULES - FOLLOW EXACTLY:

1. Make ONLY ONE database query per user request
2. Return EXACTLY 3-5 products maximum
3. STOP after providing recommendations - DO NOT make follow-up queries
4. Use LIMIT 5 in every SELECT query
5. After the query completes, format results and STOP

CONTEXT AWARENESS - CRITICAL:
- ALWAYS check CONVERSATION HISTORY before responding
- If user asks "cheapest one", "best one", "recommend one", look at PREVIOUS messages to understand what product category they're referring to
- If previous message showed headphones, "cheapest one" means cheapest headphone
- If previous message showed cameras, "best one" means best camera
- Extract the category/product type from conversation history and use it in your query
- For "other brands": Query diverse products in the same category from history
- For "similar items": Query the same category with similar characteristics
- For "different price range": Provide both budget and premium options

MANDATORY QUERY FORMAT:
```sql
SELECT "productId", product_description as name, price, stars, reviews, 
       category_name as category, quantity, "imgUrl" as image_url
FROM bedrock_integration.product_catalog 
WHERE product_description ILIKE '%SEARCH_TERM%' 
  AND price > 0
  AND quantity > 0
ORDER BY stars DESC, reviews DESC
LIMIT 5
```

RESPONSE FORMAT (output this ONCE and STOP):

[Friendly 1-2 sentence explanation]

Products:
```json
[
  {
    "productId": "B001",
    "name": "Product Name",
    "price": 399.00,
    "stars": 5.0,
    "reviews": 834,
    "category": "Category",
    "quantity": 10,
    "image_url": "url"
  }
]
```

Suggestions:
- "Show similar laptops"
- "Budget laptops under $500"
- "Gaming laptops"

CONTEXTUAL SUGGESTIONS - Generate 3 relevant suggestions based on the search:
- For laptops: "Gaming laptops", "Budget laptops", "Business laptops"
- For headphones: "Wireless headphones", "Noise cancelling", "Gaming headsets"
- For cameras: "DSLR cameras", "Mirrorless cameras", "Action cameras"
- Always make suggestions specific to the product category found

STOP IMMEDIATELY after providing this response. Do not query again. Do not ask follow-up questions."""
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enhanced chat that returns structured product data
        
        Uses Strands orchestrator with specialized agents.
        Agents access database via direct asyncpg connection.
        Context Manager tracks tokens for conversation state.
        
        Returns:
            {
                "response": "text response",
                "products": [array of product objects],
                "suggestions": [array of quick action strings],
                "success": true,
                "context_tracking": true
            }
        """
        try:
            logger.info(f"💬 Enhanced chat processing: '{message[:60]}...'")
            
            # Require Strands
            if not self.strands_available:
                raise RuntimeError(
                    "Strands SDK not available. Install with: "
                    "pip install strands-agents strands-agents-tools"
                )
            
            return await self._strands_enhanced_chat(message, conversation_history, session_id)
            
        except Exception as e:
            logger.error(f"❌ Chat failed: {e}", exc_info=True)
            return self._error_response(str(e))
    
    async def _strands_enhanced_chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Enhanced chat using Strands Orchestrator with specialized agents"""
        logger.info(f"🤖 Processing query with Strands Orchestrator")
        
        # Get context manager for token tracking
        from services.context_manager import get_context_manager
        context_manager = get_context_manager()
        
        # Track user message
        context_manager.add_message("user", message)
        
        try:
            # Import orchestrator
            from agents.orchestrator import create_orchestrator
            
            # Create session manager if session_id provided
            session_manager = None
            if session_id:
                from services.aurora_session_manager import AuroraSessionManager
                from config import settings
                
                # Build connection string
                conn_string = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
                
                session_manager = AuroraSessionManager(
                    session_id=session_id,
                    conn_string=conn_string,
                    agent_name="blaize_orchestrator"
                )
                logger.info(f"🗄️ Aurora session manager created: {session_id}")
            
            # Create orchestrator (agents use direct asyncpg via agent_tools.py)
            logger.info(f"🎯 Creating agent orchestrator...")
            orchestrator = create_orchestrator()
            
            # Add OpenTelemetry trace attributes
            orchestrator.trace_attributes = {
                "session.id": session_id or "anonymous",
                "user.query": message[:100],
                "workshop": "DAT406",
                "service": "blaize-bazaar"
            }
            
            logger.info(f"🔍 Orchestrator created with OTEL tracing")
            
            # Add session manager if provided
            if session_manager:
                orchestrator.session_manager = session_manager
                session_manager.register_hooks(orchestrator)
            
            # Build conversation context
            conversation_context = ""
            if conversation_history:
                recent_history = conversation_history[-6:]
                for msg in recent_history:
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    if len(content) > 300:
                        content = content[:300] + "..."
                    conversation_context += f"{role.upper()}: {content}\n\n"
            
            # Prepare message for orchestrator
            full_message = message
            if conversation_context:
                full_message = f"""CONVERSATION HISTORY:
{conversation_context}
---
CURRENT REQUEST: {message}"""
            
            # Invoke orchestrator with timing
            import time
            start_time = time.time()
            
            logger.info(f"🔄 Invoking orchestrator with query: {message[:100]}...")
            response = orchestrator(full_message)
            response_text = str(response)
            
            # Track assistant response in context manager
            context_manager.add_message("assistant", response_text)
            
            logger.info(f"✅ Orchestrator completed with agent chain")
            logger.info(f"📝 Final response length: {len(response_text)} chars")
            
            # Extract agent execution from OpenTelemetry traces
            from services.otel_trace_extractor import extract_agent_execution_from_otel, infer_agent_from_query
            
            agent_execution = extract_agent_execution_from_otel()
            
            # Log OTEL trace info if available
            if agent_execution.get("otel_enabled") and agent_execution.get("trace_id"):
                logger.info(f"✨ OpenTelemetry trace_id: {agent_execution['trace_id']}")
            
            # Fallback to inference if OTEL not available
            if not agent_execution.get("otel_enabled"):
                agent_execution = infer_agent_from_query(message, start_time)
                logger.info("📊 Using inferred agent execution (OTEL not active)")
            
            # Extract structured data from response
            parsed = self._parse_agent_response(response_text, message, conversation_history)
            
            result = {
                "response": parsed["text"],
                "products": parsed["products"],
                "suggestions": parsed["suggestions"],
                "success": True,
                "context_tracking": True,
                "orchestrator_enabled": True,
                "agent_execution": agent_execution,
                "model": self.model_id
            }
            
            logger.info(f"📦 Agent execution: {len(agent_execution['agent_steps'])} steps, {len(agent_execution['tool_calls'])} tool calls | OTEL: {agent_execution.get('otel_enabled', False)}")
            logger.info(f"✅ Response generated ({agent_execution['total_duration_ms']}ms)")
            return result
            
        except Exception as e:
            logger.error(f"❌ Orchestrator execution failed: {e}", exc_info=True)
            raise RuntimeError(f"Agent execution failed: {str(e)}")
    
    def _parse_agent_response(self, response_text: str, query: str = "", conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Parse agent response to extract:
        - Text response
        - Product data (from JSON blocks or database query results)
        - Contextual suggestions based on query type
        """
        # Initialize result
        result = {
            "text": "",
            "products": [],
            "suggestions": []
        }
        
        # Aggressive JSON extraction - try multiple patterns
        json_patterns = [
            r'```json\s*(\[[\s\S]*?\])\s*```',  # Standard markdown json block
            r'```\s*(\[[\s\S]*?\])\s*```',       # Generic code block
            r'(\[\s*\{[^\[]*"productId"[^\]]*\])',  # Raw JSON array with productId
            r'(\[\s*\{[^\[]*"product_description"[^\]]*\])'  # Raw JSON with product_description
        ]
        
        products_data = None
        for pattern in json_patterns:
            json_matches = re.findall(pattern, response_text, re.DOTALL)
            if json_matches:
                try:
                    logger.info(f"🔍 Found JSON match with pattern {pattern[:30]}...")
                    products_data = json.loads(json_matches[0])
                    result["products"] = self._format_products(products_data)
                    logger.info(f"📦 Extracted {len(result['products'])} products from JSON")
                    logger.info(f"🛍️ Products extracted: {len(result['products'])} products")
                    break
                except json.JSONDecodeError as e:
                    logger.warning(f"⚠️ Failed to parse JSON with pattern: {e}")
                    continue
        
        # Extract intro text before "Products:" section
        intro_match = re.search(r'^(.*?)(?=Products:|```json|$)', response_text, re.DOTALL | re.IGNORECASE)
        if intro_match and not result["text"]:
            intro_text = intro_match.group(1).strip()
            if intro_text and len(intro_text) > 10:
                result["text"] = intro_text
        
        # Fallback: if products found but no text, use brief intro
        if result["products"]:
            if not result["text"]:
                result["text"] = "Here are some great options for you!"
            logger.info(f"🛍️ Products extracted: {len(result['products'])} products")
        
        if not products_data:
            logger.debug("No JSON product data in response (pricing/inventory queries may not return products)")
        
        # Extract suggestions from "Suggestions:" section only
        suggestions_section = re.search(r'Suggestions?:\s*\n(.*?)(?:\n\n|$)', response_text, re.DOTALL | re.IGNORECASE)
        if suggestions_section:
            suggestions_text = suggestions_section.group(1)
            # Extract lines starting with - and containing quotes
            suggestion_lines = re.findall(r'^-\s*"([^"]+)"', suggestions_text, re.MULTILINE)
            result["suggestions"] = suggestion_lines[:3]  # Limit to 3 suggestions
        
        # If no suggestions found, generate contextual ones
        if not result["suggestions"]:
            result["suggestions"] = self._generate_contextual_suggestions(query, conversation_history)
        
        # Clean text (remove JSON blocks and suggestions section)
        clean_text = response_text
        for pattern in json_patterns:
            clean_text = re.sub(pattern, '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'Suggestions?:.*$', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = clean_text.strip()
        
        result["text"] = clean_text if clean_text else response_text
        
        return result
    
    def _format_products(self, products_data: List[Dict]) -> List[Dict]:
        """Format products for frontend display with URL mapping"""
        formatted = []
        
        for product in products_data:
            product_id = product.get("productId", "")
            # Map product_url to url with fallback
            product_url = product.get("product_url") or product.get("productURL") or f"https://www.amazon.com/dp/{product_id}"
            
            formatted.append({
                "id": product_id,
                "name": product.get("name", product.get("product_description", ""))[:50],
                "price": float(product.get("price", 0)),
                "stars": float(product.get("stars", 0)),
                "reviews": int(product.get("reviews", 0)),
                "category": product.get("category", product.get("category_name", "")),
                "inStock": product.get("quantity", 0) > 0 if "quantity" in product else product.get("inStock", True),
                "image": product.get("image_url", product.get("imgUrl", product.get("imgurl", "📦"))),
                "url": product_url
            })
        
        return formatted
    
    def _generate_contextual_suggestions(self, query: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> List[str]:
        """Generate contextual suggestions based on query type and conversation history"""
        # Build context from last 3 user messages + current query
        context_text = query.lower()
        if conversation_history:
            recent_user_messages = [msg['content'].lower() for msg in conversation_history[-6:] if msg.get('role') == 'user']
            context_text = ' '.join(recent_user_messages[-3:] + [query.lower()])
        
        query_lower = context_text
        
        # Deals/Pricing queries
        if any(word in query_lower for word in ['deal', 'cheap', 'budget', 'price', 'cost', 'affordable']):
            return [
                "Show pricing trends",
                "Top-rated budget items",
                "Products under $50"
            ]
        
        # Inventory queries
        if any(word in query_lower for word in ['stock', 'inventory', 'restock', 'available']):
            return [
                "Check inventory health",
                "Low stock alerts",
                "Restock recommendations"
            ]
        
        # Recommendation queries
        if any(word in query_lower for word in ['recommend', 'suggest', 'best', 'top']):
            return [
                "Show trending products",
                "Top-rated in each category",
                "Best value products"
            ]
        
        # Headphones/Audio
        if any(word in query_lower for word in ['headphone', 'earphone', 'audio', 'speaker']):
            return [
                "Show noise-cancelling options",
                "Budget headphones under $50",
                "Gaming headsets"
            ]
        
        # Laptops
        if 'laptop' in query_lower:
            return [
                "Gaming laptops",
                "Business laptops",
                "Budget laptops under $500"
            ]
        
        # Cameras
        if 'camera' in query_lower:
            return [
                "DSLR cameras",
                "Mirrorless cameras",
                "Action cameras"
            ]
        
        # Default suggestions
        return [
            "Show similar items",
            "Different price range",
            "Other brands"
        ]
    
    def _error_response(self, error: str) -> Dict[str, Any]:
        """Error response with clear diagnostic information"""
        
        # Provide helpful diagnostic info
        diagnostics = []
        
        if not self.strands_available:
            diagnostics.append("❌ Strands SDK not installed")
            diagnostics.append("   Run: pip install strands-agents strands-agents-tools")
        
        error_msg = "Configuration Error:\n\n" + "\n".join(diagnostics) if diagnostics else str(error)
        
        return {
            "response": error_msg,
            "products": [],
            "suggestions": [],
            "success": False,
            "error": str(error),
            "diagnostics": diagnostics
        }


# Alias for backward compatibility
ChatService = EnhancedChatService