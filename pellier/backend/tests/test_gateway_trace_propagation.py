"""The Gateway call carries the caller's trace context.

Strands runs the MCP transport on a background thread, where no span is
current, so the dispatcher captures the OpenTelemetry context on the calling
thread and hands it to the transport. The headers then carry a W3C
``traceparent`` for the turn, which is what lets a Gateway or Lambda span join
the same trace as the Runtime invocation instead of starting a fresh one.
"""

from __future__ import annotations

from opentelemetry import context as otel_context
from opentelemetry.sdk.trace import TracerProvider

from services import agentcore_gateway as gateway


def test_headers_carry_the_active_span_as_traceparent() -> None:
    tracer = TracerProvider().get_tracer("pellier-test")
    with tracer.start_as_current_span("pellier.turn") as span:
        headers = gateway._gateway_headers(
            "token-123",
            trace_context=otel_context.get_current(),
        )
        trace_id = format(span.get_span_context().trace_id, "032x")

    assert headers["Authorization"] == "Bearer token-123"
    assert trace_id in headers["traceparent"]


def test_headers_stay_clean_without_a_context() -> None:
    headers = gateway._gateway_headers("token-123")

    assert headers == {"Authorization": "Bearer token-123"}


def test_headers_stay_clean_when_the_context_has_no_span() -> None:
    headers = gateway._gateway_headers(
        "token-123",
        trace_context=otel_context.get_current(),
    )

    assert "traceparent" not in headers
