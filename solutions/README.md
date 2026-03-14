# Solutions — Drop-in Replacements

Short on time? Copy the solution file over the TODO file and restart the server.

Each solution is the **complete, working version** of the file you're editing.
The folder structure mirrors `blaize-bazaar/backend/` so the `cp` command is straightforward.

---

## Module 2: Semantic Search

```bash
cp solutions/module2/services/hybrid_search.py blaize-bazaar/backend/services/hybrid_search.py
cp solutions/module2/services/business_logic.py blaize-bazaar/backend/services/business_logic.py
```

## Module 3a: First Agent Tool

```bash
cp solutions/module3a/services/agent_tools.py blaize-bazaar/backend/services/agent_tools.py
```

## Module 3b: Agent Team & Orchestrator

```bash
cp solutions/module3b/agents/recommendation_agent.py blaize-bazaar/backend/agents/recommendation_agent.py
cp solutions/module3b/agents/orchestrator.py blaize-bazaar/backend/agents/orchestrator.py
```

## Module 4: AgentCore (Memory, Gateway, Policy)

```bash
cp solutions/module4/services/agentcore_memory.py blaize-bazaar/backend/services/agentcore_memory.py
cp solutions/module4/services/agentcore_gateway.py blaize-bazaar/backend/services/agentcore_gateway.py
cp solutions/module4/services/agentcore_policy.py blaize-bazaar/backend/services/agentcore_policy.py
```

---

After copying, restart the backend:

```bash
source blaize-bazaar/START_BACKEND.sh
```
