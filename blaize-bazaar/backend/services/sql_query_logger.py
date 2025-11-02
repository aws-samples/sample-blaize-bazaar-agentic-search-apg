"""
SQL Query Logger - Captures and analyzes pgvector queries for inspection
Middleware for tracking query performance, execution plans, and index usage
"""
import time
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class QueryLog:
    """Individual query log entry"""
    def __init__(
        self,
        query_type: str,
        sql: str,
        params: List[Any],
        execution_time_ms: float,
        timestamp: datetime,
        rows_returned: int = 0,
        index_used: Optional[str] = None,
        query_plan: Optional[Dict] = None
    ):
        self.query_type = query_type
        self.sql = sql
        self.params = params
        self.execution_time_ms = execution_time_ms
        self.timestamp = timestamp
        self.rows_returned = rows_returned
        self.index_used = index_used
        self.query_plan = query_plan
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "query_type": self.query_type,
            "sql": self.sql,
            "params": [self._serialize_param(p) for p in self.params],
            "execution_time_ms": round(self.execution_time_ms, 2),
            "timestamp": self.timestamp.isoformat(),
            "rows_returned": self.rows_returned,
            "index_used": self.index_used,
            "query_plan": self.query_plan
        }
    
    def _serialize_param(self, param: Any) -> str:
        """Serialize parameters for display (truncate vectors)"""
        if isinstance(param, list) and len(param) > 10:
            # Vector parameter - show first 3 and last 3 dimensions
            return f"[{param[0]:.4f}, {param[1]:.4f}, {param[2]:.4f}, ... (1024 dims) ..., {param[-3]:.4f}, {param[-2]:.4f}, {param[-1]:.4f}]"
        return str(param)


class SQLQueryLogger:
    """
    Middleware for logging SQL queries with performance metrics
    Designed for pgvector query inspection and optimization
    """
    
    def __init__(self, max_logs: int = 100):
        self.queries: List[QueryLog] = []
        self.max_logs = max_logs
        self.enabled = True
    
    @contextmanager
    def log_query(
        self,
        query_type: str,
        sql: str,
        params: List[Any],
        connection
    ):
        """
        Context manager for logging query execution
        
        Args:
            query_type: Type of query (e.g., 'semantic_search', 'image_search')
            sql: SQL query string
            params: Query parameters
            connection: Database connection (for EXPLAIN)
        
        Yields:
            Query metadata dictionary
        """
        start_time = time.time()
        query_metadata = {
            "rows_returned": 0,
            "index_used": None,
            "query_plan": None
        }
        
        try:
            # Execute the query (happens in the with block)
            yield query_metadata
            
        finally:
            if not self.enabled:
                return
            
            # Calculate execution time
            execution_time_ms = (time.time() - start_time) * 1000
            
            # Try to get query plan (only for SELECT queries)
            if sql.strip().upper().startswith('SELECT'):
                try:
                    query_plan = self._get_query_plan(connection, sql, params)
                    query_metadata["query_plan"] = query_plan
                    query_metadata["index_used"] = self._extract_index_name(query_plan)
                except Exception as e:
                    logger.debug(f"Could not get query plan: {e}")
            
            # Create log entry
            log_entry = QueryLog(
                query_type=query_type,
                sql=sql,
                params=params,
                execution_time_ms=execution_time_ms,
                timestamp=datetime.now(),
                rows_returned=query_metadata.get("rows_returned", 0),
                index_used=query_metadata.get("index_used"),
                query_plan=query_metadata.get("query_plan")
            )
            
            # Add to queue (keep only max_logs most recent)
            self.queries.append(log_entry)
            if len(self.queries) > self.max_logs:
                self.queries.pop(0)
            
            logger.info(
                f"📊 Query logged: {query_type} | "
                f"{execution_time_ms:.2f}ms | "
                f"{query_metadata.get('rows_returned', 0)} rows | "
                f"Index: {query_metadata.get('index_used', 'None')}"
            )
    
    def _get_query_plan(
        self,
        connection,
        sql: str,
        params: List[Any]
    ) -> Optional[Dict]:
        """
        Get EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output
        
        Args:
            connection: Database connection
            sql: SQL query
            params: Query parameters
        
        Returns:
            Parsed query plan as dictionary
        """
        try:
            # Create EXPLAIN query
            explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}"
            
            # Execute EXPLAIN
            cursor = connection.cursor()
            cursor.execute(explain_sql, params)
            result = cursor.fetchone()
            
            if result and result[0]:
                plan_json = result[0]
                if isinstance(plan_json, str):
                    plan_json = json.loads(plan_json)
                return plan_json
            
            return None
            
        except Exception as e:
            logger.debug(f"Failed to get query plan: {e}")
            return None
    
    def _extract_index_name(self, query_plan: Optional[Dict]) -> Optional[str]:
        """
        Extract index name from query plan
        
        Args:
            query_plan: Parsed EXPLAIN output
        
        Returns:
            Index name if found, None otherwise
        """
        if not query_plan:
            return None
        
        try:
            # Navigate the plan structure
            if isinstance(query_plan, list) and len(query_plan) > 0:
                plan = query_plan[0].get("Plan", {})
            else:
                plan = query_plan.get("Plan", {})
            
            # Check for index scan
            node_type = plan.get("Node Type", "")
            if "Index" in node_type:
                index_name = plan.get("Index Name")
                if index_name:
                    return index_name
            
            # Check for bitmap index scan
            if "Bitmap" in node_type:
                # Look for child nodes
                plans = plan.get("Plans", [])
                for child_plan in plans:
                    child_type = child_plan.get("Node Type", "")
                    if "Index" in child_type:
                        index_name = child_plan.get("Index Name")
                        if index_name:
                            return index_name
            
            return None
            
        except Exception as e:
            logger.debug(f"Failed to extract index name: {e}")
            return None
    
    def get_recent_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent query logs
        
        Args:
            limit: Maximum number of queries to return
        
        Returns:
            List of query log dictionaries
        """
        recent = self.queries[-limit:] if len(self.queries) > limit else self.queries
        return [q.to_dict() for q in reversed(recent)]  # Most recent first
    
    def get_summary_stats(self) -> Dict[str, Any]:
        """
        Get summary statistics for all logged queries
        
        Returns:
            Dictionary with aggregate statistics
        """
        if not self.queries:
            return {
                "total_queries": 0,
                "avg_time_ms": 0,
                "min_time_ms": 0,
                "max_time_ms": 0,
                "total_rows": 0
            }
        
        times = [q.execution_time_ms for q in self.queries]
        rows = [q.rows_returned for q in self.queries]
        
        return {
            "total_queries": len(self.queries),
            "avg_time_ms": round(sum(times) / len(times), 2),
            "min_time_ms": round(min(times), 2),
            "max_time_ms": round(max(times), 2),
            "total_rows": sum(rows),
            "queries_by_type": self._count_by_type()
        }
    
    def _count_by_type(self) -> Dict[str, int]:
        """Count queries by type"""
        counts = {}
        for q in self.queries:
            counts[q.query_type] = counts.get(q.query_type, 0) + 1
        return counts
    
    def clear_logs(self):
        """Clear all query logs"""
        self.queries.clear()
        logger.info("🗑️ Query logs cleared")
    
    def set_enabled(self, enabled: bool):
        """Enable or disable query logging"""
        self.enabled = enabled
        logger.info(f"📊 Query logging {'enabled' if enabled else 'disabled'}")


# Global query logger instance
_query_logger: Optional[SQLQueryLogger] = None


def get_query_logger() -> SQLQueryLogger:
    """Get or create the global query logger instance"""
    global _query_logger
    if _query_logger is None:
        _query_logger = SQLQueryLogger(max_logs=100)
    return _query_logger


def init_query_logger(max_logs: int = 100) -> SQLQueryLogger:
    """Initialize the query logger (call during app startup)"""
    global _query_logger
    _query_logger = SQLQueryLogger(max_logs=max_logs)
    logger.info(f"✅ SQL Query Logger initialized (max_logs={max_logs})")
    return _query_logger