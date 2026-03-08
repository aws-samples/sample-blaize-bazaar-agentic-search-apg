"""
Product Recommendation Agent - Suggests products based on user preferences
"""
from strands import Agent, tool
from services.agent_tools import get_trending_products, semantic_product_search, get_product_by_category


@tool
def product_recommendation_agent(query: str) -> str:
    """
    Provide personalized product recommendations based on user preferences.
    Analyzes the full query (including conversation history) to personalize results.
    
    Args:
        query: User's product inquiry (may include conversation history)
    
    Returns:
        JSON array of personalized products
    """
    import json
    import re
    
    # Extract user preferences from the query (which includes conversation history)
    preferences = _extract_user_preferences(query)
    
    # Extract the actual current request
    current_request = query
    if "CURRENT REQUEST:" in query:
        current_request = query.split("CURRENT REQUEST:")[-1].strip()
    
    # Build personalized query
    if preferences['categories']:
        enhanced_query = current_request
        
        for cat in preferences['categories'][:2]:
            if cat.lower() not in current_request.lower():
                enhanced_query += f" {cat}"
        
        if preferences['price_range']:
            if 'under' not in current_request.lower():
                enhanced_query += f" under ${preferences['price_range']}"
    else:
        enhanced_query = current_request
    
    # Search with enhanced query and price filter
    result = semantic_product_search(
        query=enhanced_query,
        max_price=preferences['price_range'],
        limit=5
    )
    result_dict = json.loads(result)
    products = result_dict.get('products', [])
    
    return f"```json\n{json.dumps(products, indent=2)}\n```"


def _extract_user_preferences(text: str) -> dict:
    """Extract user preferences from conversation text"""
    import re
    
    preferences = {
        'categories': [],
        'keywords': [],
        'price_range': None
    }
    
    # Extract categories from past searches
    category_keywords = {
        'laptop': 'laptops',
        'headphone': 'headphones',
        'earbud': 'headphones',
        'camera': 'cameras',
        'gaming': 'gaming',
        'smart home': 'smart home',
        'cable': 'cables',
        'charger': 'chargers'
    }
    
    text_lower = text.lower()
    
    for keyword, category in category_keywords.items():
        if keyword in text_lower and category not in preferences['categories']:
            preferences['categories'].append(category)
    
    # Extract price preferences (look for highest mentioned price)
    price_matches = re.findall(r'under \$?(\d+)', text_lower)
    if price_matches:
        preferences['price_range'] = max([int(p) for p in price_matches])
    
    # Extract common keywords
    keywords = ['wireless', 'gaming', 'portable', 'professional', 'budget', 'noise cancel']
    for kw in keywords:
        if kw in text_lower:
            preferences['keywords'].append(kw)
    
    return preferences
