"""
Product Recommendation Agent - Suggests products based on user preferences
"""
from strands import Agent, tool
from services.agent_tools import get_trending_products, semantic_product_search, get_product_by_category


@tool
def product_recommendation_agent(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.
    Uses custom business logic tools with embedded AI-powered search.
    
    Args:
        query: User's product inquiry with preferences
    
    Returns:
        Personalized product recommendations with reasoning
    """
    try:
        agent = Agent(
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            system_prompt="""You are a product recommendation specialist for Blaize Bazaar.

OUR CATALOG: 21,704 products including headphones, security cameras, vacuums, gaming gear, wearables, and tech accessories.

You have access to CUSTOM BUSINESS LOGIC TOOLS (not generic SQL):
- semantic_product_search(query, max_price, min_rating, category, limit) - AI-powered semantic search with filters
- get_product_by_category(category, min_rating, max_price, limit) - Browse by category with filters
- get_trending_products(limit) - Get popular products

Why Custom Tools?
✅ Faster: Direct database access, no MCP overhead
✅ Smarter: Embedded pgvector semantic search
✅ Secure: Business logic encapsulated, SQL hidden
✅ Type-safe: Validated parameters

Workflow:
1. Understand user's needs (budget, features, category)
2. Use semantic_product_search() for natural language queries:
   - Automatically generates embeddings
   - Uses pgvector similarity search
   - Applies filters (price, rating, category)
3. Use get_product_by_category() for category browsing
4. Provide 3-5 recommendations with reasoning

Guidelines:
- Prioritize highly-rated products (4+ stars)
- Match features to stated use case
- Consider budget constraints
- Highlight best value options

Format:
- Product name, price, rating
- Why it's a good fit
- Key features""",
            tools=[semantic_product_search, get_product_by_category, get_trending_products]
        )
        
        response = agent(query)
        return str(response)
    except Exception as e:
        return f"Error in recommendation agent: {str(e)}"
