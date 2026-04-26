"""
Chat Service with Product Card Support

Uses Strands SDK for multi-agent orchestration with direct asyncpg database access.
Context Manager tracks tokens and manages conversation state.
"""

import json
import logging
import os
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

SINGLE_AGENT_PROMPT = """You are Blaize AI, the shopping assistant for Blaize Bazaar.

TOOL SELECTION:
- get_trending_products → When user asks about trending, popular, or best-selling items. Pass category if they mention one (e.g. "trending in electronics" → category="Electronics").
- search_products → Descriptive or intent-based product queries (e.g. "gift for a cook", "noise-canceling headphones under $200")
- get_price_analysis → Pricing statistics and category comparisons

Call exactly one tool per query. Extract price limits and pass as max_price.
The search tool handles category mapping automatically — pass the user's words directly.

RESPONSE STYLE:
Write 1-2 short sentences as a conversational intro. Products render as visual cards
automatically — do not list them in text. Never use markdown tables, numbered lists,
headers, or emojis. Never claim products are unavailable or inventory is being refreshed.
Never ask follow-up questions. If zero results, say "I couldn't find exact matches —
try a different search term."."""


# ---------------------------------------------------------------------------
# Deterministic intent classification — replaces LLM-based routing
# ---------------------------------------------------------------------------
PRICING_KEYWORDS = {"deal", "deals", "cheap", "cheapest", "price", "pricing",
                    "discount", "affordable", "budget", "value", "cost", "save",
                    "best price", "on sale", "bargain", "compare price"}
INVENTORY_KEYWORDS = {"restock", "inventory", "stock", "out of stock",
                      "low stock", "available", "availability", "in stock",
                      "running low", "sold out", "back in stock"}
SUPPORT_KEYWORDS = {"return", "refund", "policy", "help", "support", "troubleshoot",
                    "issue", "problem", "warranty", "broken", "defective"}
SEARCH_KEYWORDS = {"search for", "looking for", "where can I", "compare", "browse"}

# Product-seeking phrases that override pricing keywords. "Find me a
# linen shirt under $150" is a search with a price filter, not a
# pricing analysis request.
PRODUCT_SEEKING_PATTERNS = re.compile(
    r'\b(find|show|get|give|suggest|recommend|looking for|want|need|buy)\b.*'
    r'\b(shirt|dress|shoe|bag|jacket|pants|top|linen|cotton|silk|leather|'
    r'cashmere|wool|sandal|sneaker|boot|tote|candle|throw|towel|hat|cuff|'
    r'earring|scarf|vest|cardigan|blazer|trench|anorak)\b',
    re.IGNORECASE,
)


def classify_intent(query: str) -> str:
    """Deterministic intent classification via keyword matching.
    Returns 'pricing', 'inventory', 'customer_support', 'search', or 'recommendation'."""
    q = query.lower()
    words = set(re.findall(r'\w+', q))

    # If the query seeks a specific product, route to search even if
    # price keywords are present. "find me a linen shirt under $150"
    # is search, not pricing.
    is_product_seeking = bool(PRODUCT_SEEKING_PATTERNS.search(query))

    # Multi-word phrases first (higher specificity)
    if not is_product_seeking:
        for phrase in PRICING_KEYWORDS:
            if ' ' in phrase and phrase in q:
                return "pricing"
    for phrase in INVENTORY_KEYWORDS:
        if ' ' in phrase and phrase in q:
            return "inventory"

    # Single-word matches — pricing only if not product-seeking
    if not is_product_seeking and words & {w for w in PRICING_KEYWORDS if ' ' not in w}:
        return "pricing"
    if words & {w for w in INVENTORY_KEYWORDS if ' ' not in w}:
        return "inventory"

    # Support keywords (single-word only)
    if words & SUPPORT_KEYWORDS:
        return "customer_support"

    # Product-seeking queries → search
    if is_product_seeking:
        return "search"

    # Search keywords (multi-word phrase matching)
    for phrase in SEARCH_KEYWORDS:
        if ' ' in phrase and phrase in q:
            return "search"
    if words & {w for w in SEARCH_KEYWORDS if ' ' not in w}:
        return "search"

    return "recommendation"


# ---------------------------------------------------------------------------
# Product extraction — single source of truth, replaces LLM JSON generation
# ---------------------------------------------------------------------------
class ProductExtractor:
    """Extract products from tool results programmatically.
    The LLM never generates product JSON — this class handles it."""

    @staticmethod
    def extract(tool_result_str: str) -> list:
        """Parse tool result JSON and return normalized product dicts."""
        try:
            data = json.loads(tool_result_str)
        except (json.JSONDecodeError, TypeError):
            return []

        products = []
        if isinstance(data, dict) and "products" in data:
            products = data["products"]
        elif isinstance(data, list):
            products = data

        return [ProductExtractor._normalize(p) for p in products if isinstance(p, dict)]

    @staticmethod
    def _normalize(p: dict) -> dict:
        """Normalize field names from various tool output formats.

        Tool results today come from the boutique catalog (``name``,
        ``category``, ``imgUrl``); legacy keys (``product_description``,
        ``category_name``, ``product_url``) are retained as fallbacks so
        older unit fixtures and any cached agent output still resolve.
        """
        return {
            "productId": p.get("productId") or p.get("product_id", ""),
            "name": (p.get("name") or p.get("product_description", ""))[:80],
            "brand": p.get("brand", ""),
            "color": p.get("color", ""),
            "price": _safe_float(p.get("price", 0)),
            "rating": _safe_float(p.get("rating") or p.get("stars", 0)),
            "reviews": _safe_int(p.get("reviews", 0)),
            "category": p.get("category") or p.get("category_name", ""),
            "imgUrl": p.get("imgUrl") or p.get("img_url", ""),
            "badge": p.get("badge"),
            "tags": list(p.get("tags") or []),
        }


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

    async def chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        workshop_mode: Optional[str] = None,
        guardrails_enabled: bool = False,
        user: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced chat that returns structured product data

        Routes based on workshop_mode:
        - 'legacy'/'search': Chat disabled
        - 'agentic'/None: Full multi-agent orchestrator (Module 2)
        - 'production': Full orchestrator + AgentCore services (Module 3)
        """
        try:
            # Workshop mode routing
            if workshop_mode in ("legacy", "search"):
                return {
                    "response": "Chat is not available in this workshop mode. Progress to Module 2 to unlock agentic AI.",
                    "products": [],
                    "suggestions": [],
                    "tool_calls": [],
                    "success": True,
                    "context_tracking": False,
                    "orchestrator_enabled": False,
                    "model": self.model_id
                }

            logger.info(f"💬 Enhanced chat processing: '{message[:60]}...' (mode={workshop_mode or 'agentic'}, user={user.get('email') if user else 'anonymous'})")

            # Require Strands
            if not self.strands_available:
                raise RuntimeError(
                    "Strands SDK not available. Install with: "
                    "pip install strands-agents strands-agents-tools"
                )

            return await self._strands_enhanced_chat(message, conversation_history, session_id, guardrails_enabled, user=user)
            
        except Exception as e:
            logger.error(f"❌ Chat failed: {e}", exc_info=True)
            return self._error_response(str(e))
    
    async def _strands_enhanced_chat(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        guardrails_enabled: bool = False,
        user: Optional[Dict[str, Any]] = None
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
            from agents.orchestrator import create_orchestrator, create_guarded_orchestrator

            # Create session manager if session_id provided
            session_manager = None
            if session_id:
                # === WIRE IT LIVE (Lab 4b) ===
                # Use AgentCore Memory for managed session persistence
                if user and settings.AGENTCORE_MEMORY_ID:
                    from services.agentcore_memory import create_agentcore_session_manager
                    session_manager = create_agentcore_session_manager(
                        session_id=session_id,
                        user_id=user.get("sub", "anonymous"),
                    )
                    if session_manager:
                        logger.info(f"🧠 AgentCore Memory session created for user={user.get('email')}")
                # === END WIRE IT LIVE ===

                # No fallback — AgentCore Memory is the only session manager.
                # If AGENTCORE_MEMORY_ID is not set, the agent runs without session memory.
                if not session_manager:
                    logger.info(f"ℹ️ No session manager — agent runs stateless (set AGENTCORE_MEMORY_ID to enable)")

            # Create orchestrator — use guarded variant when guardrails enabled (Lab 3)
            logger.info(f"🎯 Creating agent orchestrator (guardrails={'ON' if guardrails_enabled else 'OFF'})...")
            if guardrails_enabled:
                orchestrator = create_guarded_orchestrator()
            else:
                orchestrator = create_orchestrator()

            # Graceful fallback if orchestrator not implemented yet (Module 3b TODO)
            if orchestrator is None:
                return self._error_response(
                    "🔧 The AI agent orchestrator isn't wired up yet. "
                    "Complete Module 3b to enable the chat assistant."
                )

            # Add OpenTelemetry trace attributes
            orchestrator.trace_attributes = {
                "session.id": session_id or "anonymous",
                "session.user": user.get("email", "anonymous") if user else "anonymous",
                "user.query": message[:100],
                "workshop": "blaize-bazaar",
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

            # Deterministic intent classification
            intent = classify_intent(message)
            intent_hint = {
                "pricing": "price_optimization_agent",
                "inventory": "inventory_restock_agent",
                "customer_support": "customer_support_agent",
                "search": "search_agent",
                "recommendation": "product_recommendation_agent",
            }[intent]
            full_message = f"[USE: {intent_hint}] {full_message}"
            logger.info(f"🎯 Intent: {intent} → {intent_hint}")
            
            # Invoke orchestrator with timing
            import time
            start_time = time.time()
            
            logger.info(f"🔄 Invoking orchestrator with query: {message[:100]}...")
            import asyncio
            response = await asyncio.to_thread(orchestrator, full_message)
            # Strands AgentResult.__str__() extracts text from the last
            # message's content blocks. When the orchestrator's final cycle
            # is a tool_use (specialist returned but orchestrator didn't
            # generate a follow-up text), str() is empty. Fall back to
            # extracting text from tool_result content blocks.
            response_text = str(response).strip()
            if not response_text:
                try:
                    content = response.message.get("content", [])
                    for block in content:
                        if isinstance(block, dict) and "toolResult" in block:
                            tr = block["toolResult"].get("content", [])
                            for item in tr:
                                if isinstance(item, dict) and "text" in item:
                                    response_text = item["text"]
                                    break
                        if response_text:
                            break
                except Exception:
                    pass
            
            # Track assistant response in context manager
            context_manager.add_message("assistant", response_text)
            
            logger.info(f"✅ Orchestrator completed with agent chain")
            logger.info(f"📝 Final response length: {len(response_text)} chars")
            
            # Extract agent execution from OpenTelemetry traces. When
            # OTEL isn't wired correctly the payload carries
            # otel_enabled=False + reason; the frontend renders a banner
            # instead of synthesizing fake spans (see Bug 3 audit note).
            from services.otel_trace_extractor import extract_agent_execution_from_otel

            agent_execution = extract_agent_execution_from_otel()

            if agent_execution.get("otel_enabled") and agent_execution.get("trace_id"):
                logger.info(f"✨ OpenTelemetry trace_id: {agent_execution['trace_id']}")
            elif not agent_execution.get("otel_enabled"):
                logger.error(
                    f"📊 OTEL telemetry unavailable — reason: "
                    f"{agent_execution.get('reason', 'unknown')}"
                )
            
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
                search_products,
                get_trending_products,
                get_price_analysis,
            )

            single_prompt = SINGLE_AGENT_PROMPT
            if guardrails_enabled:
                single_prompt += GUARDRAILS_SUFFIX

            agent = Agent(
                model=BedrockModel(model_id=self.model_id, max_tokens=8192, temperature=0.0),
                system_prompt=single_prompt,
                tools=[search_products, get_trending_products, get_price_analysis]
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
                    # Extract the actual tool result text from the Strands SDK result structure
                    result_str = ""
                    if hasattr(event, 'result') and event.result:
                        raw = event.result
                        # Strands SDK wraps results as: {'content': [{'text': '...'}], 'status': '...'}
                        if isinstance(raw, dict) and 'content' in raw:
                            for block in raw.get('content', []):
                                if isinstance(block, dict) and 'text' in block:
                                    result_str = block['text']
                                    break
                        if not result_str:
                            result_str = str(raw)
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
            products_buffered = []  # Hold products until text streams first
            price_limit = self._extract_price_limit(message)

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

                elif "_text" in event:
                    # Stream text tokens to the client in real time
                    yield {"type": "content_delta", "delta": event["_text"]}

                elif "_tool_done" in event:
                    result_str = event.get("_result", "")
                    if result_str:
                        raw_products = ProductExtractor.extract(result_str)
                        logger.info(f"📦 Extracted {len(raw_products)} raw products from tool result")
                        if raw_products:
                            formatted = await self._format_products(raw_products)
                            # Enforce price limit from user query as safety net
                            if price_limit:
                                formatted = [p for p in formatted if p.get("price", 0) <= price_limit]
                            sent_ids = {p.get("id") or p.get("productId") for p in products_buffered}
                            sent_names = {p.get("name") or p.get("product_description") for p in products_buffered}
                            new_products = [
                                p for p in formatted
                                if (p.get("id") or p.get("productId")) not in sent_ids
                                and (p.get("name") or p.get("product_description")) not in sent_names
                            ]
                            products_buffered.extend(new_products)

                    yield {"type": "agent_step", "agent": "SearchAssistant", "action": "Done", "status": "completed"}
                    # Clear pre-tool thinking text so post-tool response doesn't concatenate
                    yield {"type": "content_reset"}

            await task

            if agent_error[0]:
                yield {"type": "error", "error": str(agent_error[0])}
                return

            response_text = str(agent_result[0]) if agent_result[0] else ""
            context_manager.add_message("assistant", response_text)
            parsed = await self._parse_agent_response(response_text, message, conversation_history, has_tool_products=bool(products_buffered))

            # Send text FIRST
            if parsed["text"]:
                yield {"type": "content", "content": parsed["text"]}

            # Then send buffered products
            if products_buffered:
                for i, product in enumerate(products_buffered):
                    yield {"type": "product", "product": product, "index": i, "total": len(products_buffered)}
                products_sent = products_buffered
            elif parsed["products"]:
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
                search_products,
                get_trending_products,
                get_price_analysis,
            )

            single_prompt = SINGLE_AGENT_PROMPT
            if guardrails_enabled:
                single_prompt += GUARDRAILS_SUFFIX

            agent = Agent(
                model=BedrockModel(
                    model_id=self.model_id,
                    max_tokens=8192,
                    temperature=0.0
                ),
                system_prompt=single_prompt,
                tools=[search_products, get_trending_products, get_price_analysis]
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

    async def _parse_agent_response(self, response_text: str, query: str = "", conversation_history: Optional[List[Dict[str, str]]] = None, has_tool_products: bool = False) -> Dict[str, Any]:
        """
        Parse agent response to extract:
        - Text response
        - Product data (from JSON blocks or database query results)
        - Contextual suggestions based on query type
        """
        result = {
            "text": "",
            "products": [],
            "suggestions": []
        }

        # Aggressive JSON extraction - try multiple patterns
        json_patterns = [
            r'```json\s*(\[[\s\S]*?\])\s*```',
            r'```\s*(\[[\s\S]*?\])\s*```',
            r'(\[\s*\{[^\[]*"productId"[^\]]*\])',
            r'(\[\s*\{[^\[]*"product_description"[^\]]*\])'
        ]

        products_data = None
        for pattern in json_patterns:
            json_matches = re.findall(pattern, response_text, re.DOTALL)
            if json_matches:
                raw = json_matches[0]
                logger.info(f"🔍 Found JSON match with pattern {pattern[:50]}...")
                for attempt, text in enumerate([raw, _repair_json(raw)]):
                    try:
                        products_data = json.loads(text)
                        result["products"] = await self._format_products(products_data)
                        # Enforce price limit from user query
                        plimit = self._extract_price_limit(query)
                        if plimit:
                            result["products"] = [p for p in result["products"] if p.get("price", 0) <= plimit]
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

        if result["products"]:
            if not result["text"]:
                result["text"] = "Here are some great options for you!"
            logger.info(f"🛍️ Products extracted: {len(result['products'])} products")

        if not products_data:
            logger.debug("No JSON product data in response (pricing/inventory queries may not return products)")

        # Extract suggestions
        suggestions_section = re.search(r'Suggestions?:\s*\n(.*?)(?:\n\n|$)', response_text, re.DOTALL | re.IGNORECASE)
        if suggestions_section:
            suggestions_text = suggestions_section.group(1)
            suggestion_lines = re.findall(r'^-\s*"([^"]+)"', suggestions_text, re.MULTILINE)
            result["suggestions"] = suggestion_lines[:3]

        if not result["suggestions"]:
            result["suggestions"] = self._generate_contextual_suggestions(query, conversation_history)

        # Determine if we have products (either from JSON extraction or tool hooks)
        have_products = bool(result["products"]) or has_tool_products

        # Clean text — strip everything the frontend renders separately
        clean_text = response_text
        # Remove JSON code blocks
        for pattern in json_patterns:
            clean_text = re.sub(pattern, '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'```[\s\S]*?```', '', clean_text)
        # Remove Suggestions section
        clean_text = re.sub(r'Suggestions?:.*$', '', clean_text, flags=re.DOTALL | re.IGNORECASE)
        # Remove "Products:" label
        clean_text = re.sub(r'^Products?:\s*$', '', clean_text, flags=re.MULTILINE | re.IGNORECASE)
        # Remove markdown tables
        clean_text = re.sub(r'^\|.*$', '', clean_text, flags=re.MULTILINE)
        # Remove horizontal rules
        clean_text = re.sub(r'^[-*_]{3,}\s*$', '', clean_text, flags=re.MULTILINE)
        # Remove markdown headers
        clean_text = re.sub(r'^#{1,4}\s+.*$', '', clean_text, flags=re.MULTILINE)
        # Remove numbered list lines (1. **Product** — $xx) — only when product cards exist
        if have_products:
            clean_text = re.sub(r'^\d+\.\s+\*\*.*$', '', clean_text, flags=re.MULTILINE)

        # Remove plain-text product listings ONLY when we have product cards to show instead.
        # When there are no product cards (e.g. inventory queries), the text IS the response.
        if have_products:
            # Lines containing price patterns like $xx.xx or $xxx.xx
            clean_text = re.sub(r'^.*\$\d+[\d,.]*\s*.*$', '', clean_text, flags=re.MULTILINE)
            # Lines with star ratings (⭐, ★, or "x.x stars")
            clean_text = re.sub(r'^.*[⭐★].*$', '', clean_text, flags=re.MULTILINE)
            clean_text = re.sub(r'^.*\d+\.\d+\s*stars?.*$', '', clean_text, flags=re.MULTILINE | re.IGNORECASE)
            # Lines with "View Product" or product links
            clean_text = re.sub(r'^.*\[View Product\].*$', '', clean_text, flags=re.MULTILINE | re.IGNORECASE)
            clean_text = re.sub(r'^.*🔗.*$', '', clean_text, flags=re.MULTILINE)
            # Lines with "reviews)" pattern
            clean_text = re.sub(r'^.*\d+[\d,]*\s*reviews?\).*$', '', clean_text, flags=re.MULTILINE | re.IGNORECASE)
            # Lines that are just product names with em dash or bullet formatting
            clean_text = re.sub(r'^[-•]\s+\*\*.*$', '', clean_text, flags=re.MULTILINE)

        # Collapse blank lines
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
        clean_text = clean_text.strip()

        # If we have products (from JSON or tool hooks), keep only brief intro
        if have_products and clean_text:
            sentences = re.split(r'(?<=[.!?])\s+', clean_text)
            intro = ' '.join(sentences[:2]).strip()
            if intro:
                clean_text = intro

        result["text"] = clean_text if clean_text else ("Here are some great options!" if have_products else response_text)

        return result
    
    async def _format_products(self, products_data: List[Dict]) -> List[Dict]:
        """Format products for frontend display."""
        formatted = []

        for product in products_data:
            product_id = product.get("productId") or product.get("product_id")

            raw_price = str(product.get("price", "0")).replace("$", "").replace(",", "").strip()
            try:
                price = float(raw_price)
            except (ValueError, TypeError):
                price = 0.0

            name = product.get("name") or product.get("product_description", "")
            name = name.split(" — ")[0].split(" - ")[0][:80]

            formatted.append({
                "id": product_id,
                "name": name,
                "brand": product.get("brand", ""),
                "color": product.get("color", ""),
                "price": price,
                "rating": _safe_float(product.get("rating") or product.get("stars", 0)),
                "reviews": _safe_int(product.get("reviews", 0)),
                "category": product.get("category") or product.get("category_name", ""),
                "image": (
                    product.get("imgUrl")
                    or product.get("image_url")
                    or product.get("image")
                    or product.get("imgurl")
                    or ""
                ),
                "badge": product.get("badge"),
                "tags": list(product.get("tags") or []),
                "originalPrice": None,
                "discountPercent": 0,
            })

        # Backfill images from database — LLM sometimes drops image URLs.
        if formatted and self.db_service:
            try:
                names = [p.get("name", "")[:60] for p in formatted if p.get("name")]
                if names:
                    placeholders = " OR ".join(["name ILIKE %s"] * len(names))
                    params = [f"%{n[:30]}%" for n in names]
                    rows = await self.db_service.fetch_all(
                        f'SELECT "productId", name, "imgUrl" FROM blaize_bazaar.product_catalog WHERE {placeholders}',
                        *params,
                    )
                    img_lookup: Dict[str, str] = {}
                    for r in rows:
                        row_name = (r.get("name") or "")[:30].lower()
                        url = r.get("imgUrl") or ""
                        if row_name and url:
                            img_lookup[row_name] = url

                    for p in formatted:
                        name_key = (p.get("name") or "")[:30].lower()
                        if name_key in img_lookup:
                            p["image"] = img_lookup[name_key]
            except Exception as e:
                logger.error(f"🖼️ BACKFILL FAILED: {e}", exc_info=True)

        return formatted
    
    def _generate_contextual_suggestions(self, query: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> List[str]:
        """Generate action-oriented follow-up suggestions that feel agentic."""
        query_lower = query.lower()

        # Extract price context from query
        import re
        price_match = re.search(r'\$(\d+)', query)
        query_price = int(price_match.group(1)) if price_match else None

        # Category-specific action-oriented follow-ups
        if any(w in query_lower for w in ['watch', 'rolex', 'timepiece']):
            suggestions = ["Find me a cheaper alternative", "Compare the top 3 watches", "Which one has the best reviews?"]
        elif any(w in query_lower for w in ['laptop', 'macbook', 'notebook', 'computer']):
            suggestions = ["Which is best for programming?", "Find me one under $800", "Compare MacBook vs Windows options"]
        elif any(w in query_lower for w in ['phone', 'smartphone', 'iphone', 'samsung']):
            suggestions = ["Which has the best camera?", "Find me the best value pick", "Compare iPhone vs Samsung"]
        elif any(w in query_lower for w in ['shoe', 'sneaker', 'nike', 'jordan', 'running']):
            suggestions = ["Find the most cushioned pair", "Show me options under $100", "Which brand has the best ratings?"]
        elif any(w in query_lower for w in ['fragrance', 'perfume', 'cologne']):
            suggestions = ["What's the best everyday scent?", "Find me a gift set under $80", "Show me the highest rated"]
        elif any(w in query_lower for w in ['furniture', 'sofa', 'bed', 'table', 'chair']):
            suggestions = ["What's the best rated piece?", "Find something under $200", "Show me the most popular"]
        elif any(w in query_lower for w in ['kitchen', 'cook', 'pan', 'knife', 'spatula']):
            suggestions = ["Build me a starter kit under $50", "What's the must-have item?", "Show me the best rated"]
        elif any(w in query_lower for w in ['sunglasses', 'glasses', 'shades']):
            suggestions = ["Find me polarized options", "What's trending in shades?", "Show me premium frames"]
        elif any(w in query_lower for w in ['bag', 'handbag', 'backpack', 'purse']):
            suggestions = ["Find me a leather option", "What's the best everyday bag?", "Show me something under $80"]
        elif any(w in query_lower for w in ['sports', 'football', 'basketball', 'yoga']):
            suggestions = ["Build me a workout kit", "What's the best rated gear?", "Find equipment under $30"]
        elif any(w in query_lower for w in ['beauty', 'makeup', 'mascara', 'lipstick']):
            suggestions = ["Build me a beauty starter kit", "What's the top rated product?", "Find me gifts under $40"]
        elif any(w in query_lower for w in ['skin care', 'lotion', 'moisturizer']):
            suggestions = ["What's the best for daily use?", "Find a skincare set under $50", "Show me the highest rated"]
        elif any(w in query_lower for w in ['deal', 'cheap', 'budget', 'affordable']):
            suggestions = ["Find the best value in electronics", "Show me hidden gems under $25", "What's on sale right now?"]
        elif any(w in query_lower for w in ['trending', 'popular', 'best seller']):
            suggestions = ["Why is this one trending?", "Find me something similar but cheaper", "What else is popular today?"]
        elif any(w in query_lower for w in ['recommend', 'suggest', 'gift']):
            suggestions = ["Gifts under $50 for anyone", "What would you pick for a tech lover?", "Show me bestsellers"]
        else:
            suggestions = [
                "Find me the best deal in this category",
                "What would you recommend instead?",
                "Show me what's trending right now"
            ]

        # If there was a price in the query, swap one suggestion for a price-adjacent action
        if query_price and query_price > 50:
            suggestions[1] = f"Find cheaper alternatives under ${query_price // 2}"

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
    def _extract_price_limit(message: str) -> float | None:
        """Extract a price ceiling from user message (e.g. 'under $50' → 50.0)."""
        import re
        patterns = [
            r'under\s+\$?\s*(\d+(?:\.\d+)?)',
            r'below\s+\$?\s*(\d+(?:\.\d+)?)',
            r'less\s+than\s+\$?\s*(\d+(?:\.\d+)?)',
            r'up\s+to\s+\$?\s*(\d+(?:\.\d+)?)',
            r'max(?:imum)?\s+\$?\s*(\d+(?:\.\d+)?)',
            r'\$\s*(\d+(?:\.\d+)?)\s+(?:or\s+)?(?:less|max|budget|limit)',
        ]
        for pat in patterns:
            m = re.search(pat, message, re.IGNORECASE)
            if m:
                return float(m.group(1))
        return None

    @staticmethod
    def _tool_to_agent_name(tool_name: str) -> str:
        """Map tool function names to user-facing agent names."""
        return {
            'product_recommendation_agent': 'Search Agent',
            'price_optimization_agent': 'Pricing Agent',
            'inventory_restock_agent': 'Inventory Agent',
            'customer_support_agent': 'Support Agent',
            'search_agent': 'Search Agent',
            'search_products': 'Search Agent',
        }.get(tool_name, 'Search Agent')

    async def chat_stream(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: Optional[str] = None,
        workshop_mode: Optional[str] = None,
        guardrails_enabled: bool = False,
        user: Optional[Dict[str, Any]] = None
    ):
        """
        Async generator yielding SSE events with real-time agent streaming.

        Uses asyncio.Queue to bridge the synchronous orchestrator thread
        with the async SSE generator. Hooks capture tool results so products
        are sent the moment a tool completes, not after the full chain finishes.
        """
        import asyncio
        import time

        # Workshop mode: chat disabled for legacy/search
        if workshop_mode in ("legacy", "search"):
            yield {"type": "content", "content": "Chat is not available in this workshop mode. Progress to Module 2 to unlock agentic AI."}
            yield {"type": "complete", "response": {"response": "Chat is not available in this workshop mode.", "products": [], "suggestions": [], "success": True}}
            return

        if not self.strands_available:
            yield {"type": "error", "error": "Strands SDK not available"}
            return

        # --- Setup (mirrors _strands_enhanced_chat) ---
        from services.context_manager import get_context_manager
        context_manager = get_context_manager()
        context_manager.add_message("user", message)

        from agents.orchestrator import create_orchestrator, create_guarded_orchestrator

        session_manager = None
        if session_id:
            # === WIRE IT LIVE (Lab 4b) ===
            if user and settings.AGENTCORE_MEMORY_ID:
                try:
                    from services.agentcore_memory import create_agentcore_session_manager
                    session_manager = create_agentcore_session_manager(
                        session_id=session_id,
                        user_id=user.get("sub", "anonymous"),
                    )
                    if session_manager:
                        logger.info(f"🧠 AgentCore Memory (stream) for user={user.get('email')}")
                except Exception as e:
                    logger.warning(f"AgentCore Memory setup failed: {e}")
            # === END WIRE IT LIVE ===

            if not session_manager:
                logger.info("ℹ️ No session manager for streaming — agent runs stateless")

        # Use guarded orchestrator when guardrails enabled (Lab 3)
        if guardrails_enabled:
            orchestrator = create_guarded_orchestrator()
        else:
            orchestrator = create_orchestrator()

        # Graceful fallback if orchestrator not implemented yet (Module 3b TODO)
        if orchestrator is None:
            yield {
                "type": "error",
                "error": "🔧 The AI agent orchestrator isn't wired up yet. "
                         "Complete Module 3b to enable the chat assistant."
            }
            return

        orchestrator.trace_attributes = {
            "session.id": session_id or "anonymous",
            "session.user": user.get("email", "anonymous") if user else "anonymous",
            "user.query": message[:100],
            "workshop": "blaize-bazaar",
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

        # Deterministic intent classification — tells the orchestrator which agent to use
        intent = classify_intent(message)
        intent_hint = {
            "pricing": "price_optimization_agent",
            "inventory": "inventory_restock_agent",
            "customer_support": "customer_support_agent",
            "search": "search_agent",
            "recommendation": "product_recommendation_agent",
        }[intent]
        full_message = f"[USE: {intent_hint}] {full_message}"
        logger.info(f"🎯 Intent: {intent} → {intent_hint}")

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
                # Extract the actual tool result text from the Strands SDK result structure
                result_str = ""
                if hasattr(event, 'result') and event.result is not None:
                    raw = event.result
                    if isinstance(raw, dict) and 'content' in raw:
                        for block in raw.get('content', []):
                            if isinstance(block, dict) and 'text' in block:
                                result_str = block['text']
                                break
                    if not result_str:
                        result_str = str(raw)
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

        # --- Per-turn telemetry bookkeeping ---
        # tool_starts stashes wall-clock start of each active tool so the
        # AfterToolCall log line can report latency without relying on the
        # Strands SDK's own cycle timers (which aren't always exposed).
        tool_starts: Dict[str, float] = {}
        tool_trace: List[Dict[str, Any]] = []

        # --- Run orchestrator in background thread ---
        start_time = time.time()
        logger.info(
            f"📨 chat_stream | intent={intent} → {intent_hint} "
            f"| session={session_id or 'anon'} | msg={message[:80]!r}"
        )
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
        products_buffered = []  # Hold products until text streams first
        current_tool = None
        price_limit = self._extract_price_limit(message)

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
                tool_starts[tool_name] = time.time()
                logger.info(f"🔧 tool_start | {tool_name}")
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

            # Tool completed (from AfterToolCallEvent hook) — buffer products for later
            elif "_tool_done" in event:
                tool_name = event.get("_tool_done", "")
                result_str = event.get("_result", "")
                result_count = 0
                if result_str:
                    raw_products = ProductExtractor.extract(result_str)
                    if raw_products:
                        result_count = len(raw_products)
                        formatted = await self._format_products(raw_products)
                        # Enforce price limit from user query as safety net
                        if price_limit:
                            formatted = [p for p in formatted if p.get("price", 0) <= price_limit]
                        # Deduplicate: skip products already buffered (by id or name)
                        sent_ids = {p.get("id") or p.get("productId") for p in products_buffered}
                        sent_names = {p.get("name") or p.get("product_description") for p in products_buffered}
                        new_products = [
                            p for p in formatted
                            if (p.get("id") or p.get("productId")) not in sent_ids
                            and (p.get("name") or p.get("product_description")) not in sent_names
                        ]
                        products_buffered.extend(new_products)

                tool_ms = int(
                    (time.time() - tool_starts.pop(tool_name, time.time())) * 1000
                )
                tool_trace.append(
                    {"tool": tool_name, "ms": tool_ms, "results": result_count}
                )
                logger.info(
                    f"✅ tool_done  | {tool_name:<30} | {tool_ms:>5}ms | results={result_count}"
                )

                agent_name = self._tool_to_agent_name(tool_name)
                yield {
                    "type": "agent_step",
                    "agent": agent_name,
                    "action": "Done",
                    "status": "completed"
                }
                # Reset streamed content — the orchestrator will now generate its final response
                # and we don't want pre-tool thinking text mixed with post-tool response
                yield {"type": "content_reset"}

            elif "_text" in event:
                # Stream text tokens to the client in real time
                yield {"type": "content_delta", "delta": event["_text"]}

        # --- Await orchestrator completion ---
        await task

        if orchestrator_error[0]:
            yield {"type": "error", "error": str(orchestrator_error[0])}
            return

        # --- Parse and send final response ---
        response_text = str(orchestrator_result[0]) if orchestrator_result[0] else ""
        context_manager.add_message("assistant", response_text)

        parsed = await self._parse_agent_response(response_text, message, conversation_history, has_tool_products=bool(products_buffered))

        # Send clean text content FIRST (before product cards)
        if parsed["text"]:
            yield {"type": "content", "content": parsed["text"]}

        # Now send buffered products (collected from tool hooks during execution)
        if products_buffered:
            for i, product in enumerate(products_buffered):
                yield {
                    "type": "product",
                    "product": product,
                    "index": i,
                    "total": len(products_buffered)
                }
            products_sent = products_buffered
        elif parsed["products"]:
            # Fallback: send products extracted from response text
            for i, product in enumerate(parsed["products"]):
                yield {
                    "type": "product",
                    "product": product,
                    "index": i,
                    "total": len(parsed["products"])
                }
            products_sent = parsed["products"]

        # OTEL extraction. On failure the payload carries otel_enabled=False
        # + reason so the frontend banner fires (Bug 3); we do NOT
        # synthesize agent_steps.
        try:
            from services.otel_trace_extractor import extract_agent_execution_from_otel
            agent_execution = extract_agent_execution_from_otel()
        except Exception as e:
            logger.error(f"OTEL extraction raised: {e}")
            agent_execution = {
                "agent_steps": [], "tool_calls": [], "reasoning_steps": [],
                "waterfall": [], "spans": [], "totalMs": 0,
                "specialistRoute": "",
                "total_duration_ms": int((time.time() - start_time) * 1000),
                "success_rate": 0,
                "otel_enabled": False,
                "reason": f"OTEL extraction raised: {e}",
            }

        # Cost estimation
        token_count, estimated_cost, cost_breakdown = self._estimate_cost(response_text)
        total_ms = int((time.time() - start_time) * 1000)
        self._track_query(products_count=len(products_sent), duration_ms=total_ms, agent_type="Orchestrator")

        # End-of-turn telemetry: total latency, product count, tool waterfall.
        # Compact one-liner so the workshop terminal stays legible without
        # tail -f tricks.
        tool_summary = " → ".join(
            f"{t['tool']}({t['ms']}ms,{t['results']})" for t in tool_trace
        ) or "no-tools"
        logger.info(
            f"📤 chat_stream done | {total_ms}ms | products={len(products_sent)} "
            f"| tokens={token_count} | {tool_summary}"
        )

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