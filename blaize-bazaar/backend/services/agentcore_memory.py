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


# === WIRE IT LIVE (Lab 4b) ===
def create_agentcore_session_manager(
    session_id: str,
    user_id: str = "anonymous"
):
    """
    Create an AgentCore Memory session manager for Strands SDK.

    This replaces the local AuroraSessionManager with Bedrock AgentCore's
    managed memory service, which persists user preferences, conversation
    summaries, and extracted facts across sessions.

    Args:
        session_id: Unique session identifier
        user_id: User ID from Cognito (sub claim)

    Returns:
        AgentCoreMemorySessionManager instance, or None if not configured
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
# === END WIRE IT LIVE ===


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
