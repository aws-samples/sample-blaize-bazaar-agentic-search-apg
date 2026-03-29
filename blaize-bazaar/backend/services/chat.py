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
        guardrails_enabled: bool = False,
        user: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced chat that returns structured product data

        Routes based on workshop_mode:
        - 'legacy'/'semantic': Chat disabled
        - 'tools': Single agent with basic tools (Lab 2)
        - 'full'/None: Full orchestrator (Lab 3)
        - 'agentcore': Full orchestrator + AgentCore services (Lab 4)
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

            logger.info(f"💬 Enhanced chat processing: '{message[:60]}...' (mode={workshop_mode or 'full'}, user={user.get('email') if user else 'anonymous'})")

            # Require Strands
            if not self.strands_available:
                raise RuntimeError(
                    "Strands SDK not available. Install with: "
                    "pip install strands-agents strands-agents-tools"
                )

            if workshop_mode == "tools":
                return await self._single_agent_chat(message, conversation_history, session_id, guardrails_enabled)

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
                # When in agentcore mode with authenticated user, use AgentCore Memory
                # instead of AuroraSessionManager for persistent cross-session preferences
                if user and settings.AGENTCORE_MEMORY_ID:
                    from services.agentcore_memory import create_agentcore_session_manager
                    session_manager = create_agentcore_session_manager(
                        session_id=session_id,
                        user_id=user.get("sub", "anonymous"),
                    )
                    if session_manager:
                        logger.info(f"🧠 AgentCore Memory session created for user={user.get('email')}")
                # === END WIRE IT LIVE ===

                # Fallback to Aurora session manager
                if not session_manager:
                    from services.aurora_session_manager import AuroraSessionManager

                    conn_string = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

                    session_manager = AuroraSessionManager(
                        session_id=session_id,
                        conn_string=conn_string,
                        agent_name="blaize_orchestrator"
                    )
                    logger.info(f"🗄️ Aurora session manager created: {session_id}")

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
                get_price_analysis,
            )

            single_prompt = (
                "You are Blaize AI, the shopping assistant for Blaize Bazaar.\n"
                "Use the available tools to find products, trends, and pricing info.\n\n"
                "TOOL USAGE RULES:\n"
                "- Use semantic_product_search for ALL product search queries. It uses hybrid AI search with reranking.\n"
                "- ONLY use get_trending_products when the user explicitly asks about trending/popular items across ALL categories.\n"
                "- NEVER call both semantic_product_search AND get_trending_products for the same query.\n"
                "- Call ONE tool per query, then respond.\n"
                "- CRITICAL: When the user mentions a price limit (e.g. 'under $50', 'below $200', 'less than $100'), "
                "ALWAYS pass the max_price parameter to semantic_product_search. Extract the number from the query.\n\n"
                "RESPONSE RULES:\n"
                "- Products are displayed as visual cards automatically from tool results.\n"
                "- Your text response should ONLY be a brief 1-2 sentence conversational intro.\n"
                "- Do NOT list, repeat, or summarize individual product names, prices, ratings, or details in your text.\n"
                "- NEVER use markdown tables, horizontal rules, numbered lists, or section headers.\n"
                "- Be confident and concise, like a knowledgeable store associate.\n"
                "- NEVER apologize or say 'unfortunately'.\n"
                "- Example good response: 'Here are some great smartphones under $500!'\n"
                "- Example bad response: '1. iPhone SE — $429.99 ⭐ 4.3 ...'"
            )
            if guardrails_enabled:
                single_prompt += GUARDRAILS_SUFFIX

            agent = Agent(
                model=BedrockModel(model_id=self.model_id, max_tokens=8192, temperature=0.0),
                system_prompt=single_prompt,
                tools=[semantic_product_search, get_trending_products, get_price_analysis]
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
                        raw_products = self._extract_products_from_result(result_str)
                        logger.info(f"📦 Extracted {len(raw_products)} raw products from tool result")
                        if raw_products:
                            formatted = await self._format_products(raw_products)
                            # Enforce price limit from user query as safety net
                            if price_limit:
                                formatted = [p for p in formatted if p.get("price", 0) <= price_limit]
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
            parsed = await self._parse_agent_response(response_text, message, conversation_history, has_tool_products=bool(products_sent))

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
                get_price_analysis,
            )

            single_prompt = (
                "You are Blaize AI, the shopping assistant for Blaize Bazaar.\n"
                "Use the available tools to find products, trends, and pricing info.\n\n"
                "TOOL USAGE RULES:\n"
                "- Use semantic_product_search for ALL product search queries. It uses hybrid AI search with reranking.\n"
                "- ONLY use get_trending_products when the user explicitly asks about trending/popular items across ALL categories.\n"
                "- NEVER call both semantic_product_search AND get_trending_products for the same query.\n"
                "- Call ONE tool per query, then respond.\n"
                "- CRITICAL: When the user mentions a price limit (e.g. 'under $50', 'below $200', 'less than $100'), "
                "ALWAYS pass the max_price parameter to semantic_product_search. Extract the number from the query.\n\n"
                "RESPONSE RULES:\n"
                "- Products are displayed as visual cards automatically from tool results.\n"
                "- Your text response should ONLY be a brief 1-2 sentence conversational intro.\n"
                "- Do NOT list, repeat, or summarize individual product names, prices, ratings, or details in your text.\n"
                "- NEVER use markdown tables, horizontal rules, numbered lists, or section headers.\n"
                "- Be confident and concise, like a knowledgeable store associate.\n"
                "- NEVER apologize or say 'unfortunately'.\n"
                "- Example good response: 'Here are some great smartphones under $500!'\n"
                "- Example bad response: '1. iPhone SE — $429.99 ⭐ 4.3 ...'"
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
                tools=[semantic_product_search, get_trending_products, get_price_analysis]
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
        # Remove numbered list lines (1. **Product** — $xx)
        clean_text = re.sub(r'^\d+\.\s+\*\*.*$', '', clean_text, flags=re.MULTILINE)

        # Remove plain-text product listings (price patterns, star ratings, view links)
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
                "originalPrice": None,
                "discountPercent": 0,
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
            'semantic_product_search': 'Search Agent',
        }.get(tool_name, 'Search Agent')

    def _extract_products_from_result(self, result_str: str) -> list:
        """Extract product list from a tool result string."""
        # First, try to parse as a JSON object with a "products" key
        try:
            obj = json.loads(result_str)
            if isinstance(obj, dict) and "products" in obj and isinstance(obj["products"], list):
                return obj["products"]
            if isinstance(obj, list):
                return obj
        except (json.JSONDecodeError, TypeError):
            pass

        # Fallback: regex extraction for embedded JSON arrays
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
                try:
                    from services.aurora_session_manager import AuroraSessionManager
                    from config import settings as _settings
                    conn_string = (
                        f"postgresql://{_settings.DB_USER}:{_settings.DB_PASSWORD}"
                        f"@{_settings.DB_HOST}:{_settings.DB_PORT}/{_settings.DB_NAME}"
                    )
                    session_manager = AuroraSessionManager(
                        session_id=session_id,
                        conn_string=conn_string,
                        agent_name="blaize_orchestrator"
                    )
                except Exception as e:
                    logger.warning(f"Session manager setup failed: {e}")

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
                        # Enforce price limit from user query as safety net
                        if price_limit:
                            formatted = [p for p in formatted if p.get("price", 0) <= price_limit]
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