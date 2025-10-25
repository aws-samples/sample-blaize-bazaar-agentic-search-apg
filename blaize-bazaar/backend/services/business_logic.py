"""
Business Logic Layer for Blaize Bazaar
Contains custom business logic for inventory, pricing, and trending analysis
"""
from typing import Dict, Any, List
from decimal import Decimal
import json


def convert_decimals(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    return obj


class BusinessLogic:
    """Business logic layer for custom analytics and operations"""
    
    def __init__(self, db_service):
        self.db = db_service
    
    async def get_trending_products(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get trending products based on reviews, ratings, and popularity.
        
        Trending score = (reviews * stars) with high-rated products prioritized
        
        Args:
            limit: Number of trending products to return
            
        Returns:
            Dictionary with trending products and metadata
        """
        query = """
            SELECT 
                "productId",
                product_description,
                price,
                stars,
                reviews,
                category_name,
                quantity,
                (reviews * stars) as trending_score
            FROM bedrock_integration.product_catalog
            WHERE quantity > 0 
              AND stars >= 4.0
              AND reviews > 50
            ORDER BY trending_score DESC, stars DESC
            LIMIT %s
        """
        
        results = await self.db.fetch_all(query, limit)
        
        products = [convert_decimals(dict(row)) for row in results]
        
        return {
            "status": "success",
            "count": len(products),
            "products": products,
            "metadata": {
                "criteria": "reviews * stars, min 4.0 stars, min 50 reviews",
                "limit": limit
            }
        }
    
    async def get_inventory_health(self) -> Dict[str, Any]:
        """
        Get overall inventory health statistics.
        
        Returns:
            Dictionary with inventory health metrics and alerts
        """
        # Get inventory statistics
        stats_query = """
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN quantity > 0 AND quantity < 10 THEN 1 END) as low_stock,
                COUNT(CASE WHEN quantity >= 10 THEN 1 END) as healthy_stock,
                AVG(quantity) as avg_quantity,
                SUM(quantity) as total_quantity
            FROM bedrock_integration.product_catalog
        """
        
        stats = await self.db.fetch_one(stats_query)
        stats_dict = convert_decimals(dict(stats))
        
        # Get critical items (low stock with high demand)
        critical_query = """
            SELECT 
                "productId",
                product_description,
                stars,
                reviews,
                quantity
            FROM bedrock_integration.product_catalog
            WHERE quantity < 10
              AND stars >= 4.0
              AND reviews > 100
            ORDER BY quantity ASC, reviews DESC
            LIMIT 10
        """
        
        critical_items = await self.db.fetch_all(critical_query)
        
        # Calculate health score (0-100)
        total = stats_dict['total_products']
        healthy = stats_dict['healthy_stock']
        health_score = int((healthy / total * 100)) if total > 0 else 0
        
        return {
            "status": "success",
            "health_score": health_score,
            "statistics": stats_dict,
            "critical_items": [convert_decimals(dict(row)) for row in critical_items],
            "alerts": self._generate_inventory_alerts(stats_dict)
        }
    
    async def get_price_statistics(self, category: str = None) -> Dict[str, Any]:
        """
        Get price statistics by category or overall.
        
        Args:
            category: Optional category filter
            
        Returns:
            Dictionary with price statistics and insights
        """
        if category:
            query = """
                SELECT 
                    category_name,
                    COUNT(*) as product_count,
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    AVG(price) as avg_price,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
                FROM bedrock_integration.product_catalog
                WHERE category_name ILIKE %s
                  AND quantity > 0
                GROUP BY category_name
            """
            results = await self.db.fetch_all(query, f"%{category}%")
        else:
            query = """
                SELECT 
                    category_name,
                    COUNT(*) as product_count,
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    AVG(price) as avg_price,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
                FROM bedrock_integration.product_catalog
                WHERE quantity > 0
                GROUP BY category_name
                ORDER BY product_count DESC
                LIMIT 10
            """
            results = await self.db.fetch_all(query)
        
        categories = [convert_decimals(dict(row)) for row in results]
        
        # Calculate overall statistics
        overall_query = """
            SELECT 
                COUNT(*) as total_products,
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(price) as avg_price,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
            FROM bedrock_integration.product_catalog
            WHERE quantity > 0
        """
        
        overall = await self.db.fetch_one(overall_query)
        overall_dict = convert_decimals(dict(overall))
        
        return {
            "status": "success",
            "overall": overall_dict,
            "by_category": categories,
            "filter": category if category else "all"
        }
    
    async def restock_product(self, product_id: str, quantity: int) -> Dict[str, Any]:
        """
        Add stock to a product.
        
        Args:
            product_id: Product ID to restock
            quantity: Quantity to add
            
        Returns:
            Dictionary with restock confirmation
        """
        # Get current product info
        product_query = """
            SELECT "productId", product_description, quantity
            FROM bedrock_integration.product_catalog
            WHERE "productId" = %s
        """
        
        product = await self.db.fetch_one(product_query, product_id)
        
        if not product:
            return {
                "status": "error",
                "message": f"Product {product_id} not found"
            }
        
        old_quantity = product['quantity']
        new_quantity = old_quantity + quantity
        
        # Update quantity
        update_query = """
            UPDATE bedrock_integration.product_catalog
            SET quantity = quantity + %s
            WHERE "productId" = %s
        """
        
        await self.db.execute_query(update_query, quantity, product_id)
        
        return {
            "status": "success",
            "product_id": product_id,
            "product_name": product['product_description'],
            "old_quantity": old_quantity,
            "added_quantity": quantity,
            "new_quantity": new_quantity,
            "message": f"✅ Added {quantity} units to {product['product_description']}"
        }
    
    async def semantic_product_search(
        self,
        query: str,
        max_price: float = None,
        min_rating: float = 4.0,
        category: str = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Search products using semantic embeddings and pgvector similarity.
        
        Args:
            query: Natural language search query
            max_price: Maximum price filter
            min_rating: Minimum star rating
            category: Category filter
            limit: Number of results
        """
        from services.embeddings import EmbeddingService
        
        # Generate query embedding
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.embed_query(query)
        
        # Build SQL with filters - embedding first, then filters, then limit
        conditions = ["quantity > 0"]
        params = [str(query_embedding)]  # Embedding as first param
        
        if max_price:
            conditions.append("price <= %s")
            params.append(max_price)
        
        if min_rating:
            conditions.append("stars >= %s")
            params.append(min_rating)
        
        if category:
            conditions.append("category_name ILIKE %s")
            params.append(f"%{category}%")
        
        params.append(limit)  # Limit as last param
        where_clause = " AND ".join(conditions)
        
        # Use CTE to define embedding once and reuse it
        search_query = f"""
            WITH query_embedding AS (SELECT %s::vector as emb)
            SELECT 
                "productId",
                product_description,
                price,
                stars,
                reviews,
                category_name,
                quantity,
                "imgUrl",
                1 - (embedding <=> (SELECT emb FROM query_embedding)) as similarity
            FROM bedrock_integration.product_catalog
            WHERE {where_clause}
            ORDER BY embedding <=> (SELECT emb FROM query_embedding)
            LIMIT %s
        """
        
        results = await self.db.fetch_all(search_query, *params)
        products = [convert_decimals(dict(row)) for row in results]
        
        return {
            "status": "success",
            "query": query,
            "count": len(products),
            "products": products,
            "filters": {
                "max_price": max_price,
                "min_rating": min_rating,
                "category": category
            }
        }
    
    async def get_products_by_category(
        self,
        category: str,
        min_rating: float = 4.0,
        max_price: float = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get products by category with filters.
        
        Args:
            category: Product category
            min_rating: Minimum star rating
            max_price: Maximum price
            limit: Number of results
        """
        conditions = ["category_name ILIKE %s", "quantity > 0"]
        params = [f"%{category}%"]
        
        if min_rating:
            conditions.append("stars >= %s")
            params.append(min_rating)
        
        if max_price:
            conditions.append("price <= %s")
            params.append(max_price)
        
        params.append(limit)
        where_clause = " AND ".join(conditions)
        
        query = f"""
            SELECT 
                "productId",
                product_description,
                price,
                stars,
                reviews,
                category_name,
                quantity,
                "imgUrl"
            FROM bedrock_integration.product_catalog
            WHERE {where_clause}
            ORDER BY stars DESC, reviews DESC
            LIMIT %s
        """
        
        results = await self.db.fetch_all(query, *params)
        products = [convert_decimals(dict(row)) for row in results]
        
        return {
            "status": "success",
            "category": category,
            "count": len(products),
            "products": products,
            "filters": {
                "min_rating": min_rating,
                "max_price": max_price
            }
        }
    
    def _generate_inventory_alerts(self, stats: Dict) -> List[str]:
        """Generate inventory alerts based on statistics"""
        alerts = []
        
        if stats['out_of_stock'] > 0:
            alerts.append(f"🚨 {stats['out_of_stock']} products out of stock")
        
        if stats['low_stock'] > 100:
            alerts.append(f"⚠️ {stats['low_stock']} products low stock (<10 units)")
        elif stats['low_stock'] > 0:
            alerts.append(f"⚠️ {stats['low_stock']} products need monitoring")
        
        if not alerts:
            alerts.append("✅ Inventory healthy")
        
        return alerts
