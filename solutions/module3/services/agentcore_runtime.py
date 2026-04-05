"""
AgentCore Runtime — Lambda deployment entrypoint for Lab 4e.

Wire It Live: Participants create the @app.entrypoint handler that wraps
the orchestrator for execution in an AgentCore Runtime Lambda microVM.

Deploy with:
    agentcore configure
    agentcore launch
"""
import logging

logger = logging.getLogger(__name__)


# === WIRE IT LIVE (Lab 4e) ===
try:
    from bedrock_agentcore.runtime import BedrockAgentCoreApp

    app = BedrockAgentCoreApp()

    @app.entrypoint
    def invoke(payload):
        """
        AgentCore Runtime entrypoint.

        Receives a payload from the AgentCore Runtime service and
        runs the orchestrator agent to produce a response.

        Args:
            payload: dict with keys like {"prompt": "...", "session_id": "..."}

        Returns:
            dict with {"response": "...", "products": [...]}
        """
        from agents.orchestrator import create_orchestrator

        prompt = payload.get("prompt", "Hello")
        session_id = payload.get("session_id", "runtime-session")

        orchestrator = create_orchestrator()
        if orchestrator is None:
            return {"response": "Orchestrator not implemented yet — complete Module 3b", "products": []}
        orchestrator.trace_attributes = {
            "session.id": session_id,
            "runtime": "agentcore-lambda",
            "workshop": "blaize-bazaar",
        }

        response = orchestrator(prompt)
        return {"response": str(response), "products": []}

except ImportError:
    logger.info("bedrock-agentcore not installed — Runtime entrypoint disabled")
    app = None
# === END WIRE IT LIVE ===


if __name__ == "__main__":
    if app:
        app.run()
    else:
        print("Install bedrock-agentcore to run: pip install bedrock-agentcore")
