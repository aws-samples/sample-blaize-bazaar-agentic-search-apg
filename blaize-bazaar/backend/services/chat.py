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


def _safe_float(val, default=0.0):
    """Safely convert a value to float, stripping currency symbols."""
    try:
        return float(str(val).replace("$", "").replace(",", "").strip())
    except (ValueError, TypeError):
        return default


def _safe_int(val, default=0):
    """Safely convert a value to int, stripping currency symbols."""
    try:
        return int(float(str(val).replace("$", "").replace(",", "").strip()))
    except (ValueError, TypeError):
        return default


GUARDRAILS_SUFFIX = """

GUARDRAILS (ACTIVE):
- Do NOT recommend products related to weapons, alcohol, or tobacco
- Do NOT provide medical, legal, or financial advice
- Flag inappropriate requests politely
- Keep all responses family-friendly"""


def _repair_json(raw: str) -> str:
    """Best-effort repair of common LLM JSON quirks."""
    # Remove trailing commas before ] or }
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    # Add missing commas between }{ or }"
    raw = re.sub(r'(\})\s*(\{)', r'\1,\2', raw)
    raw = re.sub(r'(\})\s*"', r'\1,"', raw)
    # Fix single quotes to double quotes (only around keys/values)
    raw = re.sub(r"(?<=[\[{,:])\s*'([^']*?)'\s*(?=[,\]}:])", r'"\1"', raw)
    # Remove control chars that break JSON
    raw = re.sub(r'[\x00-\x1f]+', ' ', raw)
    return raw

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
    
    def __init__(self, db_service=None):
        """Initialize with Strands SDK for multi-agent orchestration"""
        from config import settings
        
        self.model_id = settings.BEDROCK_CHAT_MODEL
        self.region = settings.AWS_REGION
        self.bedrock = boto3.client('bedrock-runtime', region_name=self.region)
        self.session_storage_dir = "/tmp/blaize-sessions"
        self.db_service = db_service
        self._agent_stats: Dict[str, Any] = {
            "query_count": 0,
            "products_found": 0,
            "agent_calls_by_type": {},
            "total_response_time_ms": 0,
            "avg_response_time_ms": 0,
        }

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
    

    
    def _track_query(self, products_count: int = 0, duration_ms: int = 0, agent_type: str = "general"):
        """Update per-session agent stats after a query."""
        self._agent_stats["query_count"] += 1
        self._agent_stats["products_found"] += products_count
        self._agent_stats["agent_calls_by_type"][agent_type] = self._agent_stats["agent_calls_by_type"].get(agent_type, 0) + 1
        self._agent_stats["total_response_time_ms"] += duration_ms
        qc = self._agent_stats["query_count"]
        self._agent_stats["avg_response_time_ms"] = round(self._agent_stats["total_response_time_ms"] / qc) if qc else 0

    def get_agent_stats(self) -> Dict[str, Any]:
        """Return current session agent stats."""
        return dict(self._agent_stats)

    def _get_system_prompt(self, guardrails_enabled: bool = False) -> str:
        """Premium concise system prompt for product recommendations"""
        base = """You are Blaize AI, the shopping assistant for Blaize Bazaar — a premium AI-powered e-commerce platform.

You have direct access to an Aurora PostgreSQL database with 21,000+ products.

TONE & VOICE:
- Be confident, concise, and helpful — like a knowledgeable store associate
- NEVER apologize. NEVER say "I apologize", "unfortunately", or "I'm sorry"
- If a product isn't found, immediately suggest the closest alternatives
- Keep text responses to 1-2 SHORT sentences max. Let the products speak for themselves
- Sound premium and assured, not robotic or overly formal

CRITICAL RULES:
1. Make ONLY ONE database query per user request
2. Return 3-5 products maximum
3. STOP after providing recommendations — no follow-up queries
4. Use LIMIT 5 in every SELECT query
5. After the query completes, format results and STOP

WHEN NO EXACT MATCH IS FOUND:
- Do NOT write paragraphs explaining what's missing
- Instead, broaden the search terms and show the closest alternatives
- Example: If "wireless headphones" returns nothing, try "watch" or "shoes" or "laptop"
- Say something like: "Here's what we have:" — then show products

CONTEXT AWARENESS:
- Check CONVERSATION HISTORY for follow-up queries
- "cheapest one" / "best one" = refer to the product category from the previous message
- "other brands" / "similar items" = same category, different products
- "different price range" = same category, varied pricing

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

RESPONSE FORMAT (output ONCE, then STOP):

[1-2 sentence intro — confident, no apologies]

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
- "Suggestion 1"
- "Suggestion 2"
- "Suggestion 3"

Generate 3 follow-up suggestions that help the user take a NEXT ACTION. Good suggestions:
- Narrow results: "Under $50" or "With 4.5+ stars"
- Explore adjacent: "Show wireless options" or "Compare top 3"
- Change direction: "What about [related category]?"
Bad suggestions: "Show similar items" (too vague), repeating the original query.
Base suggestions on the actual products returned — reference price ranges, categories, or features you found.

STOP IMMEDIATELY after this. No follow-up queries. No follow-up questions."""

        if guardrails_enabled:
            base += GUARDRAILS_SUFFIX

        return base
    
    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        workshop_mode: Optional[str] = None,
        guardrails_enabled: bool = False
    ) -> Dict[str, Any]:
        """
        Enhanced chat that returns structured product data

        Routes based on workshop_mode:
        - 'legacy'/'semantic': Chat disabled
        - 'tools': Single agent with basic tools (Lab 2)
        - 'full'/None: Full orchestrator (Lab 3)
        """
        try:
            # Workshop mode routing
            if workshop_mode in ("legacy", "semantic"):
                return {
                    "response": "Chat is not available in this workshop mode. Progress to Lab 2 to unlock agent tools.",
                    "products": [],
                    "suggestions": [],
                    "tool_calls": [],
                    "success": True,
                    "context_tracking": False,
                    "orchestrator_enabled": False,
                    "model": self.model_id
                }

            logger.info(f"💬 Enhanced chat processing: '{message[:60]}...' (mode={workshop_mode or 'full'})")

            # Require Strands
            if not self.strands_available:
                raise RuntimeError(
                    "Strands SDK not available. Install with: "
                    "pip install strands-agents strands-agents-tools"
                )

            if workshop_mode == "tools":
                return await self._single_agent_chat(message, conversation_history, session_id, guardrails_enabled)

            return await self._strands_enhanced_chat(message, conversation_history, session_id, guardrails_enabled)
            
        except Exception as e:
            logger.error(f"❌ Chat failed: {e}", exc_info=True)
            return self._error_response(str(e))
    
    async def _strands_enhanced_chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        guardrails_enabled: bool = False
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

            # Inject guardrails into orchestrator system prompt when enabled
            if guardrails_enabled:
                orchestrator.system_prompt = (orchestrator.system_prompt or "") + GUARDRAILS_SUFFIX

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
                recent_history = conversation_history[-16:]
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
            import asyncio
            response = await asyncio.to_thread(orchestrator, full_message)
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
            parsed = await self._parse_agent_response(response_text, message, conversation_history)
            
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
    
    async def _single_agent_stream(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        guardrails_enabled: bool = False
    ):
        """Streaming single-agent mode for Lab 2."""
        import asyncio
        import time

        from services.context_manager import get_context_manager
        context_manager = get_context_manager()
        context_manager.add_message("user", message)

        try:
            from strands import Agent
            from strands.models.bedrock import BedrockModel
            from services.agent_tools import (
                semantic_product_search,
                get_trending_products,
                get_category_price_analysis,
            )

            single_prompt = (
                "You are a product search assistant for Blaize Bazaar.\n"
                "Use the available tools to find products, trends, and pricing info.\n"
                "Return results as JSON with product details. Be concise."
            )
            if guardrails_enabled:
                single_prompt += GUARDRAILS_SUFFIX

            agent = Agent(
                model=BedrockModel(model_id=self.model_id, max_tokens=8192, temperature=0.0),
                system_prompt=single_prompt,
                tools=[semantic_product_search, get_trending_products, get_category_price_analysis]
            )

            # Build conversation context
            conversation_context = ""
            if conversation_history:
                for msg in conversation_history[-16:]:
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')[:300]
                    conversation_context += f"{role.upper()}: {content}\n\n"

            full_message = message
            if conversation_context:
                full_message = f"CONVERSATION HISTORY:\n{conversation_context}\n---\nCURRENT REQUEST: {message}"

            yield {"type": "start", "content": "Initializing single agent..."}
            yield {"type": "agent_step", "agent": "SearchAssistant", "action": "Analyzing query", "status": "in_progress"}

            # Queue-based streaming bridge
            loop = asyncio.get_running_loop()
            queue: asyncio.Queue = asyncio.Queue()

            def streaming_callback(**kwargs):
                if "data" in kwargs:
                    try:
                        asyncio.run_coroutine_threadsafe(queue.put({"_text": kwargs["data"]}), loop).result(timeout=10)
                    except Exception:
                        pass

            agent.callback_handler = streaming_callback

            # Hook tool events
            try:
                from strands.hooks.events import BeforeToolCallEvent, AfterToolCallEvent

                def on_before_tool(event: BeforeToolCallEvent):
                    tool_name = ""
                    if hasattr(event, 'tool_use') and isinstance(event.tool_use, dict):
                        tool_name = event.tool_use.get("name", "")
                    if tool_name:
                        try:
                            asyncio.run_coroutine_threadsafe(queue.put({"_tool_start": tool_name}), loop).result(timeout=5)
                        except Exception:
                            pass

                def on_after_tool(event: AfterToolCallEvent):
                    tool_name = ""
                    if hasattr(event, 'tool_use') and isinstance(event.tool_use, dict):
                        tool_name = event.tool_use.get("name", "")
                    result_str = str(event.result) if hasattr(event, 'result') and event.result else ""
                    try:
                        asyncio.run_coroutine_threadsafe(queue.put({"_tool_done": tool_name, "_result": result_str}), loop).result(timeout=10)
                    except Exception:
                        pass

                agent.add_hook(on_before_tool)
                agent.add_hook(on_after_tool)
            except (ImportError, AttributeError):
                pass

            start_time = time.time()
            agent_result = [None]
            agent_error = [None]

            async def run_agent():
                try:
                    agent_result[0] = await asyncio.to_thread(agent, full_message)
                except Exception as e:
                    agent_error[0] = e
                finally:
                    await queue.put({"_done": True})

            task = asyncio.create_task(run_agent())
            products_sent = []

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=120)
                except asyncio.TimeoutError:
                    yield {"type": "error", "error": "Agent execution timed out"}
                    break

                if "_done" in event:
                    break

                if "_tool_start" in event:
                    yield {"type": "agent_step", "agent": "SearchAssistant", "action": "Searching", "status": "in_progress"}
                    yield {"type": "tool_call", "tool": event["_tool_start"], "status": "executing"}

                elif "_tool_done" in event:
                    result_str = event.get("_result", "")
                    if result_str:
                        raw_products = self._extract_products_from_result(result_str)
                        if raw_products:
                            formatted = await self._format_products(raw_products)
                            sent_ids = {p.get("id") or p.get("productId") for p in products_sent}
                            sent_names = {p.get("name") or p.get("product_description") for p in products_sent}
                            new_products = [
                                p for p in formatted
                                if (p.get("id") or p.get("productId")) not in sent_ids
                                and (p.get("name") or p.get("product_description")) not in sent_names
                            ]
                            for i, product in enumerate(new_products):
                                yield {"type": "product", "product": product, "index": i, "total": len(new_products)}
                            products_sent.extend(new_products)

                    yield {"type": "agent_step", "agent": "SearchAssistant", "action": "Done", "status": "completed"}

            await task

            if agent_error[0]:
                yield {"type": "error", "error": str(agent_error[0])}
                return

            response_text = str(agent_result[0]) if agent_result[0] else ""
            context_manager.add_message("assistant", response_text)
            parsed = await self._parse_agent_response(response_text, message, conversation_history)

            if parsed["text"]:
                yield {"type": "content", "content": parsed["text"]}

            if not products_sent and parsed["products"]:
                for i, product in enumerate(parsed["products"]):
                    yield {"type": "product", "product": product, "index": i, "total": len(parsed["products"])}
                products_sent = parsed["products"]

            duration_ms = int((time.time() - start_time) * 1000)
            token_count, estimated_cost, cost_breakdown = self._estimate_cost(response_text)
            self._track_query(products_count=len(products_sent), duration_ms=duration_ms, agent_type="SearchAssistant")
            yield {
                "type": "complete",
                "response": {
                    "response": parsed["text"],
                    "products": products_sent,
                    "suggestions": parsed["suggestions"],
                    "success": True,
                    "context_tracking": True,
                    "orchestrator_enabled": False,
                    "agent_execution": {
                        "agent_steps": [{"agent": "SearchAssistant", "action": "Processing", "status": "completed", "timestamp": start_time, "duration_ms": duration_ms}],
                        "tool_calls": [], "reasoning_steps": [],
                        "total_duration_ms": duration_ms, "success_rate": 1.0
                    },
                    "model": self.model_id,
                    "token_count": token_count,
                    "estimated_cost_usd": estimated_cost,
                    "cost_breakdown": cost_breakdown
                }
            }

        except Exception as e:
            logger.error(f"❌ Single-agent stream failed: {e}", exc_info=True)
            yield {"type": "error", "error": str(e)}

    async def _single_agent_chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        guardrails_enabled: bool = False
    ) -> Dict[str, Any]:
        """Single-agent mode for Lab 2 — basic tools, no orchestrator routing."""
        import asyncio
        import time

        logger.info(f"🔧 Single-agent mode: '{message[:60]}...'")

        from services.context_manager import get_context_manager
        context_manager = get_context_manager()
        context_manager.add_message("user", message)

        try:
            from strands import Agent
            from strands.models.bedrock import BedrockModel
            from services.agent_tools import (
                semantic_product_search,
                get_trending_products,
                get_category_price_analysis,
            )

            single_prompt = (
                "You are a product search assistant for Blaize Bazaar.\n"
                "Use the available tools to find products, trends, and pricing info.\n"
                "Return results as JSON with product details.\n"
                "Be concise and helpful."
            )
            if guardrails_enabled:
                single_prompt += GUARDRAILS_SUFFIX

            agent = Agent(
                model=BedrockModel(
                    model_id=self.model_id,
                    max_tokens=8192,
                    temperature=0.0
                ),
                system_prompt=single_prompt,
                tools=[semantic_product_search, get_trending_products, get_category_price_analysis]
            )

            # Build conversation context
            conversation_context = ""
            if conversation_history:
                for msg in conversation_history[-16:]:
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')[:300]
                    conversation_context += f"{role.upper()}: {content}\n\n"

            full_message = message
            if conversation_context:
                full_message = f"CONVERSATION HISTORY:\n{conversation_context}\n---\nCURRENT REQUEST: {message}"

            start_time = time.time()
            response = await asyncio.to_thread(agent, full_message)
            duration_ms = int((time.time() - start_time) * 1000)

            response_text = str(response) if response else ""
            context_manager.add_message("assistant", response_text)

            parsed = await self._parse_agent_response(response_text, message, conversation_history)

            return {
                "response": parsed["text"],
                "products": parsed["products"],
                "suggestions": parsed["suggestions"],
                "success": True,
                "context_tracking": True,
                "orchestrator_enabled": False,
                "agent_execution": {
                    "agent_steps": [{"agent": "SearchAssistant", "action": "Processing", "status": "completed", "timestamp": start_time, "duration_ms": duration_ms}],
                    "tool_calls": [],
                    "reasoning_steps": [],
                    "total_duration_ms": duration_ms,
                    "success_rate": 1.0
                },
                "model": self.model_id
            }

        except Exception as e:
            logger.error(f"❌ Single-agent chat failed: {e}", exc_info=True)
            raise RuntimeError(f"Single-agent execution failed: {str(e)}")

    async def _parse_agent_response(self, response_text: str, query: str = "", conversation_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
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
                raw = json_matches[0]
                logger.info(f"🔍 Found JSON match with pattern {pattern[:50]}...")
                # Try raw first, then repaired
                for attempt, text in enumerate([raw, _repair_json(raw)]):
                    try:
                        products_data = json.loads(text)
                        result["products"] = await self._format_products(products_data)
                        if attempt == 1:
                            logger.info("🔧 JSON repaired successfully")
                        logger.info(f"📦 Extracted {len(result['products'])} products from JSON")
                        break
                    except json.JSONDecodeError as e:
                        if attempt == 1:
                            logger.warning(f"⚠️ Failed to parse JSON even after repair: {e}")
                if products_data:
                    break
        
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
    
    async def _format_products(self, products_data: List[Dict]) -> List[Dict]:
        """Format products for frontend display with URL mapping"""
        formatted = []

        for product in products_data:
            product_id = product.get("productId", "")
            # Map product_url to url with fallback
            product_url = product.get("product_url") or product.get("productURL") or f"https://www.amazon.com/dp/{product_id}"

            raw_price = str(product.get("price", "0")).replace("$", "").replace(",", "").strip()
            try:
                price = float(raw_price)
            except (ValueError, TypeError):
                price = 0.0

            # Synthesize original price: ~40% of products show a discount (10-25%)
            original_price = None
            discount_percent = 0
            if product_id:
                # Deterministic "discount" based on product ID hash
                pid_hash = sum(ord(c) for c in str(product_id))
                if pid_hash % 5 < 2:  # ~40% of products
                    discount_pct = 10 + (pid_hash % 16)  # 10-25%
                    original_price = round(price / (1 - discount_pct / 100), 2)
                    discount_percent = discount_pct

            formatted.append({
                "id": product_id,
                "name": (product.get("name", product.get("product_description", "")).split(" — ")[0].split(" - ")[0])[:80],
                "price": price,
                "stars": _safe_float(product.get("stars", 0)),
                "reviews": _safe_int(product.get("reviews", 0)),
                "category": product.get("category", product.get("category_name", "")),
                "quantity": _safe_int(product.get("quantity", 0)),
                "inStock": _safe_int(product.get("quantity", 0)) > 0 if "quantity" in product else product.get("inStock", True),
                "image": product.get("image_url", product.get("image", product.get("imgUrl", product.get("imgurl", product.get("thumbnail", ""))))),
                "url": product_url,
                "originalPrice": original_price,
                "discountPercent": discount_percent,
            })

        # Always backfill images from database — LLM often drops image URLs
        if formatted and self.db_service:
            try:
                names = [p.get("name", "")[:60] for p in formatted if p.get("name")]
                if names:
                    placeholders = " OR ".join(["product_description ILIKE %s"] * len(names))
                    params = [f"%{n[:30]}%" for n in names]
                    rows = await self.db_service.fetch_all(
                        f'SELECT "productId", product_description, "imgUrl" FROM bedrock_integration.product_catalog WHERE {placeholders}',
                        *params
                    )
                    img_lookup = {}
                    for r in rows:
                        desc = (r.get("product_description") or "").split(" — ")[0].split(" - ")[0][:30].lower()
                        url = r.get("imgUrl") or ""
                        if desc and url:
                            img_lookup[desc] = url
                    
                    for p in formatted:
                        name_key = (p.get("name") or "")[:30].lower()
                        if name_key in img_lookup:
                            p["image"] = img_lookup[name_key]
            except Exception as e:
                logger.error(f"🖼️ BACKFILL FAILED: {e}", exc_info=True)

        return formatted
    
    def _generate_contextual_suggestions(self, query: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> List[str]:
        """Generate contextual suggestions based on query, results, and conversation history."""
        query_lower = query.lower()

        # Build context from recent conversation
        mentioned_categories = set()
        mentioned_prices = []
        if conversation_history:
            for msg in conversation_history[-12:]:
                text = msg.get('content', '').lower()
                # Extract price mentions
                import re
                prices = re.findall(r'\$(\d+)', text)
                mentioned_prices.extend(int(p) for p in prices)
                # Track categories mentioned
                for cat in ['watch', 'laptop', 'phone', 'smartphone', 'shoe', 'sneaker', 'furniture', 'sofa', 'fragrance', 'perfume', 'sunglasses', 'kitchen', 'bag', 'dress', 'shirt', 'sports', 'tablet']:
                    if cat in text:
                        mentioned_categories.add(cat)

        # Price-aware suggestions
        if mentioned_prices:
            max_price = max(mentioned_prices)
            price_suggestions = []
            if max_price > 100:
                price_suggestions.append(f"Budget options under ${max_price // 2}")
            if max_price < 200:
                price_suggestions.append(f"Premium options up to ${max_price * 3}")

        # Category-specific follow-ups based on what was actually discussed
        if any(w in query_lower for w in ['watch', 'rolex', 'timepiece']):
            suggestions = ["Luxury watches under $500", "Best everyday watches", "Show all watches"]
        elif any(w in query_lower for w in ['laptop', 'macbook', 'notebook']):
            suggestions = ["Best for programming", "Lightweight laptops", "Show all laptops"]
        elif any(w in query_lower for w in ['phone', 'smartphone', 'iphone', 'samsung']):
            suggestions = ["Latest models under $300", "Best camera phones", "Show all smartphones"]
        elif any(w in query_lower for w in ['shoe', 'sneaker', 'nike', 'jordan']):
            suggestions = ["Running shoes under $100", "Best rated sneakers", "Show all shoes"]
        elif any(w in query_lower for w in ['fragrance', 'perfume', 'cologne']):
            suggestions = ["Top fragrances under $80", "Best for everyday wear", "Show all fragrances"]
        elif any(w in query_lower for w in ['furniture', 'sofa', 'bed', 'table']):
            suggestions = ["Living room essentials", "Best rated furniture", "Under $500"]
        elif any(w in query_lower for w in ['kitchen', 'cook', 'pan', 'knife']):
            suggestions = ["Essential kitchen tools", "Best rated cookware", "Under $30"]
        elif any(w in query_lower for w in ['sunglasses', 'glasses']):
            suggestions = ["Classic styles under $50", "Best for summer", "Compare top brands"]
        elif any(w in query_lower for w in ['bag', 'handbag', 'backpack']):
            suggestions = ["Leather bags under $100", "Best everyday bags", "Compare styles"]
        elif any(w in query_lower for w in ['sports', 'football', 'basketball', 'tennis']):
            suggestions = ["Best sports gear", "Equipment under $30", "Compare top brands"]
        elif any(w in query_lower for w in ['deal', 'cheap', 'budget', 'price', 'affordable']):
            suggestions = ["Highest rated under $25", "Best value across all categories", "Flash deals today"]
        elif any(w in query_lower for w in ['stock', 'inventory', 'restock']):
            suggestions = ["Which categories are low?", "High-demand items running out", "Restock the top seller"]
        elif any(w in query_lower for w in ['trending', 'popular', 'best seller']):
            suggestions = ["Trending in electronics", "Most reviewed this month", "Hidden gems with 5 stars"]
        elif any(w in query_lower for w in ['recommend', 'suggest', 'gift']):
            suggestions = ["Gifts under $50", "Top picks for tech lovers", "Most wishlisted items"]
        else:
            # Smart defaults based on conversation context
            if mentioned_categories:
                cat = list(mentioned_categories)[-1]
                suggestions = [
                    f"More {cat}s with better ratings",
                    f"Alternatives in a different price range",
                    "What's trending right now?"
                ]
            else:
                suggestions = [
                    "What's trending right now?",
                    "Best rated products under $50",
                    "Show me something surprising"
                ]

        return suggestions[:3]
    
    @staticmethod
    def _estimate_cost(text: str) -> tuple:
        """Estimate token count and cost. Returns (token_count, cost_usd, breakdown)."""
        from services.embeddings import get_cache_stats
        token_count = int(len(text.split()) * 1.3)
        llm_cost = round(token_count * 0.000003, 6)
        embedding_cost = get_cache_stats().get("total_embedding_cost_usd", 0.0)
        total_cost = round(llm_cost + embedding_cost, 6)
        breakdown = {"llm_cost": llm_cost, "embedding_cost": embedding_cost}
        return token_count, total_cost, breakdown

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

    @staticmethod
    def _tool_to_agent_name(tool_name: str) -> str:
        """Map tool function names to user-facing agent names."""
        return {
            'product_recommendation_agent': 'Search Agent',
            'price_optimization_agent': 'Pricing Agent',
            'inventory_restock_agent': 'Inventory Agent',
            'semantic_product_search': 'Search Agent',
        }.get(tool_name, 'Search Agent')

    def _extract_products_from_result(self, result_str: str) -> list:
        """Extract product list from a tool result string."""
        patterns = [
            r'```json\s*(\[[\s\S]*?\])\s*```',
            r'```\s*(\[[\s\S]*?\])\s*```',
            r'(\[\s*\{[^\[]*"productId"[^\]]*\])',
            r'(\[\s*\{[^\[]*"product_description"[^\]]*\])',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, result_str, re.DOTALL)
            if matches:
                raw = matches[0]
                for text in [raw, _repair_json(raw)]:
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        continue
        return []

    async def chat_stream(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        workshop_mode: Optional[str] = None,
        guardrails_enabled: bool = False
    ):
        """
        Async generator yielding SSE events with real-time agent streaming.

        Uses asyncio.Queue to bridge the synchronous orchestrator thread
        with the async SSE generator. Hooks capture tool results so products
        are sent the moment a tool completes, not after the full chain finishes.
        """
        import asyncio
        import time

        # Workshop mode: chat disabled for legacy/semantic
        if workshop_mode in ("legacy", "semantic"):
            yield {"type": "content", "content": "Chat is not available in this workshop mode. Progress to Lab 2 to unlock agent tools."}
            yield {"type": "complete", "response": {"response": "Chat is not available in this workshop mode.", "products": [], "suggestions": [], "success": True}}
            return

        # Workshop mode: single-agent for tools mode
        if workshop_mode == "tools":
            async for event in self._single_agent_stream(message, conversation_history, session_id, guardrails_enabled):
                yield event
            return

        if not self.strands_available:
            yield {"type": "error", "error": "Strands SDK not available"}
            return

        # --- Setup (mirrors _strands_enhanced_chat) ---
        from services.context_manager import get_context_manager
        context_manager = get_context_manager()
        context_manager.add_message("user", message)

        from agents.orchestrator import create_orchestrator

        session_manager = None
        if session_id:
            try:
                from services.aurora_session_manager import AuroraSessionManager
                from config import settings
                conn_string = (
                    f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}"
                    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
                )
                session_manager = AuroraSessionManager(
                    session_id=session_id,
                    conn_string=conn_string,
                    agent_name="blaize_orchestrator"
                )
            except Exception as e:
                logger.warning(f"Session manager setup failed: {e}")

        orchestrator = create_orchestrator()

        # Inject guardrails into orchestrator system prompt when enabled
        if guardrails_enabled:
            orchestrator.system_prompt = (orchestrator.system_prompt or "") + GUARDRAILS_SUFFIX

        orchestrator.trace_attributes = {
            "session.id": session_id or "anonymous",
            "user.query": message[:100],
            "workshop": "DAT406",
            "service": "blaize-bazaar"
        }

        if session_manager:
            orchestrator.session_manager = session_manager
            session_manager.register_hooks(orchestrator)

        # Build conversation context
        conversation_context = ""
        if conversation_history:
            for msg in conversation_history[-16:]:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if len(content) > 300:
                    content = content[:300] + "..."
                conversation_context += f"{role.upper()}: {content}\n\n"

        full_message = message
        if conversation_context:
            full_message = (
                f"CONVERSATION HISTORY:\n{conversation_context}\n---\n"
                f"CURRENT REQUEST: {message}"
            )

        # --- Queue-based streaming bridge ---
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()

        # Callback handler: forward text tokens from the orchestrator thread
        def streaming_callback(**kwargs):
            if "data" in kwargs:
                try:
                    asyncio.run_coroutine_threadsafe(
                        queue.put({"_text": kwargs["data"]}), loop
                    ).result(timeout=10)
                except Exception:
                    pass

        orchestrator.callback_handler = streaming_callback

        # Register hooks for tool lifecycle events
        try:
            from strands.hooks.events import BeforeToolCallEvent, AfterToolCallEvent

            def on_before_tool(event: BeforeToolCallEvent):
                tool_name = ""
                if hasattr(event, 'tool_use') and isinstance(event.tool_use, dict):
                    tool_name = event.tool_use.get("name", "")
                if tool_name:
                    try:
                        asyncio.run_coroutine_threadsafe(
                            queue.put({"_tool_start": tool_name}), loop
                        ).result(timeout=5)
                    except Exception:
                        pass

            def on_after_tool(event: AfterToolCallEvent):
                tool_name = ""
                if hasattr(event, 'tool_use') and isinstance(event.tool_use, dict):
                    tool_name = event.tool_use.get("name", "")
                result_str = ""
                if hasattr(event, 'result') and event.result is not None:
                    result_str = str(event.result)
                try:
                    asyncio.run_coroutine_threadsafe(
                        queue.put({"_tool_done": tool_name, "_result": result_str}), loop
                    ).result(timeout=10)
                except Exception:
                    pass

            orchestrator.add_hook(on_before_tool)
            orchestrator.add_hook(on_after_tool)
        except (ImportError, AttributeError) as e:
            logger.warning(f"Strands hooks not available, falling back: {e}")

        # --- Yield initial SSE events ---
        yield {"type": "start", "content": "Initializing agent..."}
        yield {
            "type": "agent_step",
            "agent": "Orchestrator",
            "action": "Analyzing query",
            "status": "in_progress"
        }

        # --- Run orchestrator in background thread ---
        start_time = time.time()
        orchestrator_result = [None]
        orchestrator_error = [None]

        async def run_orchestrator():
            try:
                orchestrator_result[0] = await asyncio.to_thread(orchestrator, full_message)
            except Exception as e:
                orchestrator_error[0] = e
            finally:
                await queue.put({"_done": True})

        task = asyncio.create_task(run_orchestrator())

        # --- Process events from queue in real-time ---
        products_sent = []
        current_tool = None

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=120)
            except asyncio.TimeoutError:
                yield {"type": "error", "error": "Agent execution timed out"}
                break

            if "_done" in event:
                break

            # Tool started (from BeforeToolCallEvent hook)
            if "_tool_start" in event:
                tool_name = event["_tool_start"]
                if tool_name != current_tool:
                    current_tool = tool_name
                    agent_name = self._tool_to_agent_name(tool_name)
                    yield {
                        "type": "agent_step",
                        "agent": agent_name,
                        "action": "Searching",
                        "status": "in_progress"
                    }
                    yield {"type": "tool_call", "tool": tool_name, "status": "executing"}

            # Tool completed (from AfterToolCallEvent hook) — send products NOW
            elif "_tool_done" in event:
                result_str = event.get("_result", "")
                if result_str:
                    raw_products = self._extract_products_from_result(result_str)
                    if raw_products:
                        formatted = await self._format_products(raw_products)
                        # Deduplicate: skip products already sent (by id or name)
                        sent_ids = {p.get("id") or p.get("productId") for p in products_sent}
                        sent_names = {p.get("name") or p.get("product_description") for p in products_sent}
                        new_products = [
                            p for p in formatted
                            if (p.get("id") or p.get("productId")) not in sent_ids
                            and (p.get("name") or p.get("product_description")) not in sent_names
                        ]
                        for i, product in enumerate(new_products):
                            yield {
                                "type": "product",
                                "product": product,
                                "index": i,
                                "total": len(new_products)
                            }
                        products_sent.extend(new_products)

                agent_name = self._tool_to_agent_name(event.get("_tool_done", ""))
                yield {
                    "type": "agent_step",
                    "agent": agent_name,
                    "action": "Done",
                    "status": "completed"
                }

            # Text tokens — accumulated for clean text at end
            # (Streaming raw tokens would expose JSON blocks in the chat)

        # --- Await orchestrator completion ---
        await task

        if orchestrator_error[0]:
            yield {"type": "error", "error": str(orchestrator_error[0])}
            return

        # --- Parse and send final response ---
        response_text = str(orchestrator_result[0]) if orchestrator_result[0] else ""
        context_manager.add_message("assistant", response_text)

        parsed = await self._parse_agent_response(response_text, message, conversation_history)

        # Send clean text content
        if parsed["text"]:
            yield {"type": "content", "content": parsed["text"]}

        # Send products if not already sent via hook
        if not products_sent and parsed["products"]:
            for i, product in enumerate(parsed["products"]):
                yield {
                    "type": "product",
                    "product": product,
                    "index": i,
                    "total": len(parsed["products"])
                }
            products_sent = parsed["products"]

        # OTEL extraction
        try:
            from services.otel_trace_extractor import extract_agent_execution_from_otel, infer_agent_from_query
            agent_execution = extract_agent_execution_from_otel()
            if not agent_execution.get("otel_enabled"):
                agent_execution = infer_agent_from_query(message, start_time)
        except Exception:
            agent_execution = {
                "agent_steps": [], "tool_calls": [], "reasoning_steps": [],
                "total_duration_ms": int((time.time() - start_time) * 1000),
                "success_rate": 1.0
            }

        # Cost estimation
        token_count, estimated_cost, cost_breakdown = self._estimate_cost(response_text)
        self._track_query(products_count=len(products_sent), duration_ms=int((time.time() - start_time) * 1000), agent_type="Orchestrator")

        # Complete event with full response payload
        try:
            yield {
                "type": "complete",
                "response": {
                    "response": parsed["text"],
                    "products": products_sent,
                    "suggestions": parsed["suggestions"],
                    "success": True,
                    "context_tracking": True,
                    "orchestrator_enabled": True,
                    "agent_execution": agent_execution,
                    "model": self.model_id,
                    "token_count": token_count,
                    "estimated_cost_usd": estimated_cost,
                    "cost_breakdown": cost_breakdown
                }
            }
        except Exception as e:
            logger.error(f"Failed to serialize complete event: {e}")
            yield {
                "type": "complete",
                "response": {
                    "response": parsed["text"],
                    "products": products_sent,
                    "suggestions": parsed["suggestions"],
                    "success": True
                }
            }


# Alias for backward compatibility
ChatService = EnhancedChatService