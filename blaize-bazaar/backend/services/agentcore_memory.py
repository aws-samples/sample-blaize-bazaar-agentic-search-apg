"""
AgentCore Memory — Persistent user preferences via Bedrock AgentCore Memory.

Wire It Live: Participants implement create_agentcore_session_manager() using
AgentCoreMemorySessionManager from the bedrock-agentcore SDK to replace the
local AuroraSessionManager with managed, persistent memory.
"""
import logging
from typing import Optional, Dict, Any, List

from config import settings

logger = logging.getLogger(__name__)


def create_agentcore_session_manager(
    session_id: str,
    user_id: str = "anonymous"
):
    """
    TODO (Module 4): Create an AgentCore Memory session manager.

    AgentCore Memory replaces the local AuroraSessionManager with a managed
    service that automatically extracts user preferences, maintains conversation
    summaries, and persists context across sessions.

    Steps:
        1. Check if settings.AGENTCORE_MEMORY_ID is set (return None if not)
        2. Import AgentCoreMemoryConfig and AgentCoreMemorySessionManager:
           - from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig
           - from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager
        3. Create config = AgentCoreMemoryConfig(
               memory_id=settings.AGENTCORE_MEMORY_ID,
               session_id=session_id,
               actor_id=user_id,
               batch_size=5,
           )
        4. Create session_manager = AgentCoreMemorySessionManager(
               config, region_name=settings.AWS_REGION
           )
        5. Return session_manager
        6. Handle ImportError (package not installed) and general exceptions

    Args:
        session_id: Unique session identifier
        user_id: User ID from Cognito (sub claim)

    Returns:
        AgentCoreMemorySessionManager instance, or None if not configured

    ⏩ SHORT ON TIME? Run:
       cp solutions/module4/services/agentcore_memory.py blaize-bazaar/backend/services/agentcore_memory.py
    """
    # === CHALLENGE 6: AgentCore Memory (STM) — START ===
    # TODO: Implement AgentCore Memory session manager
    #
    # Steps:
    #   1. Check settings.AGENTCORE_MEMORY_ID is set (return None if not)
    #   2. Import AgentCoreMemoryConfig and AgentCoreMemorySessionManager
    #   3. Create config with memory_id, session_id, actor_id, batch_size=5
    #   4. Create and return AgentCoreMemorySessionManager(config, region_name=settings.AWS_REGION)
    #   5. Handle ImportError and general exceptions
    #
    # ⏩ SHORT ON TIME? Run:
    #    cp solutions/module3/services/agentcore_memory.py blaize-bazaar/backend/services/agentcore_memory.py
    return None
    # === CHALLENGE 6: AgentCore Memory (STM) — END ===


def get_user_memories(user_id: str) -> List[Dict[str, Any]]:
    """
    Retrieve stored memories/preferences for a user.

    Calls the AgentCore Memory API to fetch extracted preferences,
    conversation summaries, and semantic facts.
    """
    if not settings.AGENTCORE_MEMORY_ID:
        return []

    try:
        import boto3
        client = boto3.client("bedrock-agentcore", region_name=settings.AWS_REGION)
        response = client.retrieve_memories(
            memoryId=settings.AGENTCORE_MEMORY_ID,
            actorId=user_id,
            maxResults=20,
        )
        memories = []
        for item in response.get("memories", []):
            memories.append({
                "id": item.get("memoryId", ""),
                "type": item.get("memoryType", "unknown"),
                "content": item.get("content", ""),
                "created_at": str(item.get("createdAt", "")),
                "metadata": item.get("metadata", {}),
            })
        return memories

    except ImportError:
        logger.warning("bedrock-agentcore not installed")
        return []
    except Exception as e:
        logger.warning(f"Failed to retrieve memories: {e}")
        return []


def search_episodic_memories(
    user_id: str,
    query: str,
    session_id: Optional[str] = None,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Search episodic memories for relevant past experiences.

    Episodic memory captures structured experiences:
    - Goal: what the agent was trying to accomplish
    - Reasoning: the steps it took
    - Actions: which tools were called
    - Outcome: what happened
    - Reflection: what was learned

    This enables agents to learn from past interactions and improve
    decision-making over time — e.g., "last time this user asked about
    running shoes, they preferred Nike under $80."

    Args:
        user_id: User ID (Cognito sub claim)
        query: Natural language query to search memories
        session_id: Optional session scope
        top_k: Maximum memories to return

    Returns:
        List of episodic memory records
    """
    if not settings.AGENTCORE_MEMORY_ID:
        return []

    try:
        from bedrock_agentcore.memory import MemorySessionManager

        # Use raw user_id as actor_id (consistent with get_user_memories)
        mgr = MemorySessionManager(
            memory_id=settings.AGENTCORE_MEMORY_ID,
            region_name=settings.AWS_REGION,
        )
        memory_session = mgr.create_memory_session(
            actor_id=user_id,
            session_id=session_id or "search",
        )

        # Search long-term memories (includes episodic if configured)
        records = memory_session.search_long_term_memories(
            query=query,
            namespace_prefix="/",
            top_k=top_k,
        )

        episodes = []
        for record in records:
            content = record.get("content", {})
            episodes.append({
                "text": content.get("text", ""),
                "type": record.get("memoryType", "unknown"),
                "score": record.get("score", 0),
                "created_at": str(record.get("createdAt", "")),
            })

        logger.info(f"Found {len(episodes)} episodic memories for query: {query[:50]}")
        return episodes

    except ImportError:
        logger.warning("bedrock-agentcore not installed — episodic memory unavailable")
        return []
    except Exception as e:
        logger.warning(f"Episodic memory search failed: {e}")
        return []
