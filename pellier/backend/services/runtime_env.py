"""Resolve the resource names the AgentCore CLI injects into the Runtime.

``@aws/agentcore`` names the variables it injects after the resource in the
project: ``AGENTCORE_GATEWAY_<NAME>_URL`` for a gateway and ``MEMORY_<NAME>_ID``
for a memory. Those names come from the renderer, and a deployment whose names
carry a suffix (``PELLIER_DEPLOYMENT_SUFFIX``) injects different variables than
the default one. The application reads one spelling, ``AGENTCORE_GATEWAY_URL``
and ``AGENTCORE_MEMORY_ID``, so the entrypoint resolves by shape rather than by
a hardcoded name.

Packaged into the Runtime image: it must import nothing the package does not
ship.
"""
from __future__ import annotations

import logging
from typing import Dict, Mapping

logger = logging.getLogger(__name__)

GATEWAY_URL = "AGENTCORE_GATEWAY_URL"
MEMORY_ID = "AGENTCORE_MEMORY_ID"
LEGACY_GATEWAY_URL = "MCP_GATEWAY_URL"


def injected_resource(environ: Mapping[str, str], prefix: str, suffix: str) -> str:
    """The value of the one ``<prefix><NAME><suffix>`` variable, or ``""``.

    ``<NAME>`` must be non-empty, so the application's own ``AGENTCORE_GATEWAY_URL``
    never matches the gateway shape. Several matches mean several resources of
    one kind were attached; the first name in sorted order wins and the choice
    is logged, so a mistaken second attachment is visible rather than silent.
    """
    names = sorted(
        name
        for name in environ
        if name.startswith(prefix)
        and name.endswith(suffix)
        and len(name) > len(prefix) + len(suffix)
    )
    if not names:
        return ""
    if len(names) > 1:
        logger.warning(
            "%d %s*%s variables injected; using %s", len(names), prefix, suffix, names[0]
        )
    return str(environ[names[0]]).strip()


def bridge_cli_injected_names(environ: Mapping[str, str]) -> Dict[str, str]:
    """The application-facing variables to set, derived from the injected ones.

    An explicit application variable always wins and is never rewritten.
    ``MCP_GATEWAY_URL`` remains the compatibility fallback for runtimes
    provisioned before the CLI project existed. Only variables that are unset
    and resolvable are returned.
    """
    derived: Dict[str, str] = {}
    if not str(environ.get(GATEWAY_URL, "")).strip():
        url = injected_resource(environ, "AGENTCORE_GATEWAY_", "_URL") or str(
            environ.get(LEGACY_GATEWAY_URL, "")
        ).strip()
        if url:
            derived[GATEWAY_URL] = url
    if not str(environ.get(MEMORY_ID, "")).strip():
        memory = injected_resource(environ, "MEMORY_", "_ID")
        if memory:
            derived[MEMORY_ID] = memory
    return derived
