# Blaize Bazaar Architecture Changes

## Summary
Removed generic `run_query` MCP tool and replaced with custom business logic tools that directly execute SQL. This demonstrates the key architectural pattern: **custom tools with embedded business logic > generic SQL tools**.

## Key Benefits
✅ **Lower Latency**: Direct database access without MCP layer overhead  
✅ **Business Logic Encapsulation**: SQL and algorithms hidden in tools  
✅ **Type Safety**: Strongly typed parameters and returns  
✅ **Competitive Advantage**: Your unique business rules protected  
✅ **Better UX**: Faster responses, clearer tool names in UI  

## Architecture Change

### Before (Generic MCP Pattern):
```
Agent → run_query(sql) → Generic MCP Tool → Database
```
**Problem**: Extra latency, SQL exposed to LLM, no business logic

### After (Custom Tools Pattern):
```
Agent → semantic_product_search() → Custom Tool (embedded SQL) → Database
```
**Benefit**: Direct access, business logic encapsulated, faster

## Changes Made

### Backend Changes

#### 1. New Custom Tools (`services/agent_tools.py`)
- ✅ Added `semantic_product_search()` - AI-powered product search with filters
- ✅ Added `get_product_by_category()` - Category browsing with filters
- ❌ Removed `run_query()` - Generic SQL execution

#### 2. New Business Logic Methods (`services/business_logic.py`)
- ✅ Added `semantic_product_search()` - Embeddings + pgvector similarity
- ✅ Added `get_products_by_category()` - Filtered category queries

#### 3. Updated Agents

**Recommendation Agent** (`agents/recommendation_agent.py`):
- ❌ Removed: `run_query(sql)`
- ✅ Added: `semantic_product_search()`, `get_product_by_category()`
- Updated prompt to emphasize custom tools

**Inventory Agent** (`agents/inventory_agent.py`):
- ❌ Removed: `run_query(sql)`
- Tools: `get_inventory_health()`, `restock_product()`
- Updated prompt to emphasize embedded business logic

**Pricing Agent** (`agents/pricing_agent.py`):
- ❌ Removed: `run_query(sql)`
- ✅ Added: `get_product_by_category()`
- Tools: `get_price_statistics()`, `get_product_by_category()`

**Orchestrator** (`agents/orchestrator.py`):
- ❌ Removed all references to `run_query` and generic MCP tools
- Updated routing strategy to emphasize custom tools
- Added messaging about competitive advantage

### Frontend Changes

#### 1. UI Text Updates
**AIAssistant** (`components/AIAssistant.tsx`):
- Changed: "Powered by AWS Strands SDK & MCP" → "Powered by AWS Strands SDK & Custom Tools"

**AgentWorkflowVisualizer** (`components/AgentWorkflowVisualizer.tsx`):
- Changed: "🔧 MCP Tool Calls" → "🔧 Custom Tool Calls"

#### 2. Backend API Updates
**app.py** - User-facing changes:
- Changed: "Multi-Agent System with MCP" → "Multi-Agent System with Custom Tools"
- Changed: Health check field "mcp" → "custom_tools"
- Changed: API endpoints `/api/mcp/*` → `/api/tools/*`
  - `/api/tools` (list custom tools)
  - `/api/tools/trending`
  - `/api/tools/inventory-health`
  - `/api/tools/price-stats`
  - `/api/tools/restock`
- Changed: Streaming tool call "run_query" → "semantic_product_search"
- Updated: Chat endpoint description to reference "Custom Tools" instead of "MCP"

## Tool Comparison

### Old Generic Tool
```python
@tool
def run_query(sql: str) -> str:
    """Execute arbitrary SQL query"""
    # Problem: SQL exposed, no business logic, security risk
```

### New Custom Tools
```python
@tool
def semantic_product_search(
    query: str,
    max_price: float = None,
    min_rating: float = 4.0,
    category: str = None,
    limit: int = 5
) -> str:
    """Search products using semantic understanding with filters
    
    Benefits:
    - SQL hidden inside tool
    - Business logic encapsulated (pgvector, filters)
    - Type-safe parameters
    - Clear intent for LLM
    """
```

## Teaching Point

**This is the fundamental lesson of the workshop:**

> Generic MCP tools like Aurora PostgreSQL MCP Server are great for **exploration and prototyping**, but production AI systems need **custom tools that encode YOUR business logic and competitive advantage**.

### Why Custom Tools Win:
1. **Performance**: Direct database access, no MCP overhead
2. **Security**: SQL hidden from LLM, validated parameters
3. **Business Logic**: Your algorithms (trending score, inventory rules) protected
4. **Maintainability**: Changes in one place, not scattered SQL
5. **LLM Clarity**: Clear tool names vs generic "run_query"

## Testing

To verify the changes work:

1. Start backend: `./start-backend.sh`
2. Start frontend: `./start-frontend.sh`
3. Test queries:
   - "Find wireless headphones under $50" → Uses `semantic_product_search()`
   - "What's trending?" → Uses `get_trending_products()`
   - "Check inventory" → Uses `get_inventory_health()`
4. Verify in UI:
   - Tool names show as "semantic_product_search" not "run_query"
   - No MCP references in UI
   - Faster response times

## Files Modified

### Backend (7 files)
- `services/agent_tools.py` - Replaced run_query with custom tools
- `services/business_logic.py` - Added semantic search methods
- `agents/recommendation_agent.py` - Updated tools and prompt
- `agents/inventory_agent.py` - Removed run_query
- `agents/pricing_agent.py` - Updated tools
- `agents/orchestrator.py` - Updated routing strategy
- `app.py` - Updated API endpoints and user-facing messages

### Frontend (2 files)
- `components/AIAssistant.tsx` - Updated title
- `components/AgentWorkflowVisualizer.tsx` - Updated tool section name

## Result

Blaize Bazaar now demonstrates the **production-ready pattern** for AI agents:
- ✅ Custom tools with embedded business logic
- ✅ Direct database access for performance
- ✅ Type-safe, validated parameters
- ✅ Business rules encapsulated and protected
- ✅ Clear, semantic tool names for LLMs
- ❌ No generic SQL tools exposed to agents
