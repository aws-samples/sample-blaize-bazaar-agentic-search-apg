# Troubleshooting OpenTelemetry

When the inspector shows **"Telemetry unavailable: Strands' TracerProvider
is not SDK-backed"**, the in-memory span exporter never attached — every
chat turn runs fine, but the waterfall has no spans to read. This guide
walks through the three common causes and how to verify each.

## Required initialization order

`blaize-bazaar/backend/app.py` lifespan must do these in this exact order:

1. **Construct `StrandsTelemetry`** — this installs an SDK-backed
   `TracerProvider` as the global. If another caller (including a
   transitive import) has already called
   `opentelemetry.trace.set_tracer_provider(...)` or has read
   `get_tracer_provider()` with lazy initialization, Strands cannot
   swap in its provider and silently keeps the default no-op one.
2. **Call `strands_telemetry.setup_otlp_exporter()`** — only if
   `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Optional for workshop use.
3. **Call `init_span_capture()`** from
   `services.otel_trace_extractor`. This reads
   `trace.get_tracer_provider()`, checks it is SDK-backed (the
   `isinstance(provider, TracerProvider)` gate), and attaches a
   `SimpleSpanProcessor(InMemorySpanExporter)`.

If step 1 happens **after** step 3, the check in step 3 fails and
`OTEL_WORKING` stays `False` for the life of the process.

## Verify the TracerProvider type in a REPL

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
p = trace.get_tracer_provider()
print(type(p).__name__)          # expect: TracerProvider
print(isinstance(p, TracerProvider))  # expect: True
```

If `type(p).__name__` is `ProxyTracerProvider` or
`NoOpTracerProvider`, Strands' telemetry was never wired. If it's
some other class, something else replaced the provider.

## Common causes

- **`strands_telemetry` import failed**. Install with
  `pip install 'strands-agents[otel]'` and restart. The
  `init_span_capture` log line will say `OpenTelemetry SDK not
  installed`.
- **A module-level side effect runs `get_tracer_provider()` before
  lifespan start.** Any `from strands import Agent` at module scope
  can cause this — Strands may pin the provider on first read.
  Move the import inside the lifespan handler.
- **Tests leak a no-op provider into the next run.** If you're running
  `pytest` against `app.py` directly, an earlier test that patched
  `trace.set_tracer_provider` may leave state behind. Use the
  `test_otel_extractor.py` fixture pattern: construct a fresh
  `TracerProvider()`, set it, then call `init_span_capture()`.

## How to validate a fix

After restarting the backend, hit `/api/traces/waterfall` with no chat
turns yet. Expected response:

```json
{ "spans": [], "otel_enabled": true, "span_count": 0, ... }
```

Then send one chat message and refresh. Expected: `span_count > 0` and
`spans` contains at least one `invoke_agent` or `execute_tool` entry.

If `otel_enabled` is still `false` after the restart, the backend ERROR
log on startup will print the exact `reason` string — copy it into an
issue or paste it here as a new row.
