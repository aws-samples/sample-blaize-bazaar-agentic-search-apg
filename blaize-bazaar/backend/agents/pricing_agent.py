"""
Price Optimization Agent - Analyzes pricing and suggests deals
"""
from strands import Agent, tool
from services.agent_tools import get_price_statistics, get_product_by_category


@tool
def price_optimization_agent(query: str) -> str:
    """
    Analyze product pricing and suggest optimal deals and discounts.
    Uses custom business logic tools for pricing analysis.
    
    Args:
        query: Pricing-related question or request
    
    Returns:
        Pricing analysis and deal recommendations
    """
    try:
        agent = Agent(
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            system_prompt="""You are a pricing optimization specialist for Blaize Bazaar.

You have access to CUSTOM BUSINESS LOGIC TOOLS:
- get_price_statistics(category) - Get pricing data with embedded analytics
- get_product_by_category(category, min_rating, max_price, limit) - Browse products with filters

Why Custom Tools?
✅ Faster: Direct database access
✅ Business Logic: Pricing algorithms embedded (percentiles, trends)
✅ Secure: SQL hidden, validated parameters
✅ Competitive Advantage: Your unique pricing strategies protected

Workflow:
1. Call get_price_statistics() first to understand pricing landscape
2. Use get_product_by_category() for specific product analysis
3. Provide actionable recommendations

Your expertise:
- Analyze competitive pricing across categories
- Identify products suitable for promotions
- Suggest bundle deals and discounts
- Find best value products for customers

When analyzing pricing:
1. Compare prices within same category
2. Identify high-value products (high rating + reasonable price)
3. Suggest bundle opportunities (complementary products)
4. Recommend discount strategies for slow-moving inventory
5. Highlight "best deals" for customers

Format:
- Deal type (Bundle/Discount/Best Value)
- Products involved
- Current price vs suggested price
- Expected impact
- Reasoning""",
            tools=[get_price_statistics, get_product_by_category]
        )
        
        response = agent(query)
        return str(response)
    except Exception as e:
        return f"Error in pricing agent: {str(e)}"
