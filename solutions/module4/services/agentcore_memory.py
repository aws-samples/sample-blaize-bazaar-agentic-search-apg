"""
AgentCore Memory — Persistent user preferences via Bedrock AgentCore Memory.

Solution: create_agentcore_session_manager() implemented with
AgentCoreMemoryConfig and AgentCoreMemorySessionManager.
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
    Create an AgentCore Memory session manager for Strands SDK.
    """
    if not settings.AGENTCORE_MEMORY_ID:
        logger.info("AGENTCORE_MEMORY_ID not set — memory disabled")
        return None

    try:
        from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig
        from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager

        config = AgentCoreMemoryConfig(
            memory_id=settings.AGENTCORE_MEMORY_ID,
            session_id=session_id,
            actor_id=user_id,
            batch_size=5,
        )

        session_manager = AgentCoreMemorySessionManager(
            config,
            region_name=settings.AWS_REGION,
        )

        logger.info(f"✅ AgentCore Memory session created (memory_id={settings.AGENTCORE_MEMORY_ID}, user={user_id})")
        return session_manager

    except ImportError:
        logger.warning("bedrock-agentcore package not installed — pip install bedrock-agentcore")
        return None
    except Exception as e:
        logger.warning(f"AgentCore Memory setup failed: {e}")
        return None


def get_user_memories(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve stored memories/preferences for a user."""
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
    session_id: str = None,
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
    """
    if not settings.AGENTCORE_MEMORY_ID:
        return []

    try:
        from bedrock_agentcore.memory import MemorySessionManager

        actor_id = user_id.replace("@", "-").replace(".", "-")
        mgr = MemorySessionManager(
            memory_id=settings.AGENTCORE_MEMORY_ID,
            region_name=settings.AWS_REGION,
        )
        memory_session = mgr.create_memory_session(
            actor_id=actor_id,
            session_id=session_id or "search",
        )

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
