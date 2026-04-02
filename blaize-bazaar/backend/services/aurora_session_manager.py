"""
Aurora PostgreSQL Session Manager for Strands SDK

Production-grade session management using Aurora PostgreSQL with ACID guarantees.
Implements the Strands SDK SessionManager interface.
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)


class AuroraSessionManager:
    """
    Aurora PostgreSQL-based session manager for Strands agents.
    
    Stores conversation history in Aurora with:
    - conversations: Session metadata
    - messages: User/assistant messages
    - tool_uses: Tool invocations and results
    """
    
    def __init__(self, session_id: str, conn_string: str, agent_name: str = "aurora_agent"):
        """
        Initialize Aurora session manager.
        
        Args:
            session_id: Unique session identifier
            conn_string: PostgreSQL connection string
            agent_name: Name of the agent using this session
        """
        self.session_id = session_id
        self.conn_string = conn_string
        self.agent_name = agent_name
        self._ensure_session_exists()
    
    def _ensure_session_exists(self):
        """Create session record if it doesn't exist"""
        try:
            with psycopg.connect(self.conn_string) as conn:
                with conn.cursor() as cur:
                    # Check if session already exists
                    cur.execute("""
                        SELECT session_id, created_at FROM blaize_bazaar.conversations
                        WHERE session_id = %s
                    """, (self.session_id,))
                    existing = cur.fetchone()
                    
                    if existing:
                        logger.info(f"♻️  Reusing existing session: {self.session_id} (created: {existing[1]})")
                    else:
                        logger.info(f"🆕 Creating new session: {self.session_id}")
                        cur.execute("""
                            INSERT INTO blaize_bazaar.conversations (session_id, agent_name, context, created_at)
                            VALUES (%s, %s, %s, %s)
                        """, (self.session_id, self.agent_name, json.dumps({}), datetime.now()))
                        conn.commit()
                        logger.info(f"✅ Session created successfully: {self.session_id}")
        except Exception as e:
            logger.error(f"Failed to initialize session: {e}")
            raise
    
    def add_message(self, role: str, content: str):
        """
        Add a message to the conversation history.
        
        Args:
            role: 'user' or 'assistant'
            content: Message content
        """
        try:
            with psycopg.connect(self.conn_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO blaize_bazaar.messages (session_id, role, content, timestamp)
                        VALUES (%s, %s, %s, %s)
                    """, (self.session_id, role, content, datetime.now()))
                    conn.commit()
            logger.debug(f"Added {role} message to session {self.session_id}")
        except Exception as e:
            logger.error(f"Failed to add message: {e}")
            raise
    
    def add_tool_use(self, tool_name: str, tool_input: Dict, tool_output: Any):
        """
        Record a tool invocation.
        
        Args:
            tool_name: Name of the tool called
            tool_input: Tool input parameters
            tool_output: Tool execution result
        """
        try:
            with psycopg.connect(self.conn_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO blaize_bazaar.tool_uses (session_id, tool_name, tool_input, tool_output, timestamp)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (self.session_id, tool_name, json.dumps(tool_input), json.dumps(tool_output), datetime.now()))
                    conn.commit()
            logger.debug(f"Recorded tool use: {tool_name}")
        except Exception as e:
            logger.error(f"Failed to record tool use: {e}")
            raise
    
    def get_messages(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieve conversation history.
        
        Args:
            limit: Maximum number of messages to retrieve
            
        Returns:
            List of message dictionaries with role, content, timestamp
        """
        try:
            with psycopg.connect(self.conn_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT role, content, timestamp
                        FROM blaize_bazaar.messages
                        WHERE session_id = %s
                        ORDER BY timestamp ASC
                        LIMIT %s
                    """, (self.session_id, limit))
                    messages = cur.fetchall()
            return messages
        except Exception as e:
            logger.error(f"Failed to retrieve messages: {e}")
            return []
    
    def get_context(self) -> Dict[str, Any]:
        """
        Get session context/metadata.
        
        Returns:
            Session context dictionary
        """
        try:
            with psycopg.connect(self.conn_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT context FROM blaize_bazaar.conversations
                        WHERE session_id = %s
                    """, (self.session_id,))
                    result = cur.fetchone()
                    return result['context'] if result else {}
        except Exception as e:
            logger.error(f"Failed to get context: {e}")
            return {}
    
    def update_context(self, context: Dict[str, Any]):
        """
        Update session context/metadata.
        
        Args:
            context: Context dictionary to store
        """
        try:
            with psycopg.connect(self.conn_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE blaize_bazaar.conversations
                        SET context = %s, updated_at = %s
                        WHERE session_id = %s
                    """, (json.dumps(context), datetime.now(), self.session_id))
                    conn.commit()
            logger.debug(f"Updated context for session {self.session_id}")
        except Exception as e:
            logger.error(f"Failed to update context: {e}")
            raise
    
    def clear(self):
        """Clear all messages and tool uses for this session"""
        try:
            with psycopg.connect(self.conn_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM blaize_bazaar.messages WHERE session_id = %s", (self.session_id,))
                    cur.execute("DELETE FROM blaize_bazaar.tool_uses WHERE session_id = %s", (self.session_id,))
                    conn.commit()
            logger.info(f"Cleared session {self.session_id}")
        except Exception as e:
            logger.error(f"Failed to clear session: {e}")
            raise
    
    def register_hooks(self, agent):
        """Register hooks with Strands agent for automatic session tracking"""
        # This method is called by Strands SDK to set up event hooks
        # We don't need to implement hooks since we're manually tracking
        # in add_message and add_tool_use methods
        logger.debug(f"Hooks registered for agent with session {self.session_id}")
        pass
