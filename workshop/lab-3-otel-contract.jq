# Lab 3 provided check: what "traced" means for one managed turn.
#
# Four predicates over the spans of one trace, each ruling out a different way
# a trace can be useless: telemetry from something that is not the agent, a
# turn that called no model, a turn that touched no system, and someone else's
# session. This is a check the guide runs, not a build. It reads structure, not
# text: the Runtime redacts model content from spans, so no predicate here can
# depend on a prompt or a completion.
#
# Run with:
#   jq --arg trace "$TRACE_ID" --arg session "$RUNTIME_SESSION" \
#     -f workshop/lab-3-otel-contract.jq /tmp/pellier-runtime-trace.json

[
  .[]
  | .["@message"]
  | if type == "string" then fromjson else . end
  | select(.traceId == $trace)
] as $spans
| {
    traceId: $trace,
    runtimeSession: $session,
    spanCount: ($spans | length),
    agentSpan: any(
      $spans[];
      (.name // "") | startswith("invoke_agent")
    ),
    modelSpan: any(
      $spans[];
      .name == "chat"
      and (.attributes["gen_ai.request.model"] // "") != ""
    ),
    toolSpan: any(
      $spans[];
      ((.name // "") | startswith("execute_tool"))
      and (.attributes["gen_ai.tool.name"] // "") != ""
    ),
    sessionCorrelated: any(
      $spans[];
      (.attributes["session.id"] // "") == $session
    )
  }
| . + {
    allPassed: (
      .spanCount >= 3
      and .agentSpan
      and .modelSpan
      and .toolSpan
      and .sessionCorrelated
    )
  }
