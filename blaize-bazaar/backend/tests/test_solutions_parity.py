"""test_solutions_parity.py — drop-in solutions parity lint (Task 7.4).

Validates Requirements 2.7.1 through 2.7.3 of the
``blaize-bazaar-storefront`` spec: every challenge file in
``blaize-bazaar/backend/`` and ``blaize-bazaar/frontend/src/`` must
carry a ``CHALLENGE N: START`` / ``CHALLENGE N: END`` block whose body
matches the same-numbered block inside the corresponding
``solutions/moduleM/<relative path>`` drop-in file byte-for-byte
(ignoring a single trailing newline and normalising CRLF → LF).

Why this exists
---------------

Requirement 2.7.1 promises participants that ``cp solutions/moduleN/...
blaize-bazaar/backend/...`` will drop in the complete solution code
identical to what lives inside the ``# === CHALLENGE N: START/END ===``
block. If the live challenge block drifts away from the solutions file
(or vice versa), the workshop flow silently breaks: participants paste
a stale file, restart the backend, and the verification step fails
with no obvious cause. This test is the CI tripwire that catches the
drift the moment a PR touches either side of the pair.

Scanner contract
----------------

Scope. The test hard-codes the 13 challenge ↔ solution file pairs
documented in ``.kiro/specs/blaize-bazaar-storefront/tasks.md``:

    C1          hybrid_search.py         module1/services/
    C2          agent_tools.py           module2/services/
    C3          recommendation_agent.py  module2/agents/
    C4          orchestrator.py          module2/agents/
    C5          agentcore_runtime.py     module3/services/
    C6          agentcore_memory.py      module3/services/
    C7          agentcore_gateway.py     module3/services/
    C8          otel_trace_extractor.py  module3/services/
    C9.1        cognito_auth.py          module3/services/
    C9.2        agentcore_identity.py    module3/services/
    C9.3        frontend/src/utils/auth.ts              module3/frontend/utils/
    C9.4 (a)    frontend/src/components/AuthModal.tsx   module3/frontend/components/
    C9.4 (b)    frontend/src/components/PreferencesModal.tsx  module3/frontend/components/

Marker format. Python files use ``# === CHALLENGE N: ... START ===``
and ``# === CHALLENGE N: ... END ===``. TypeScript / TSX files use
``// === CHALLENGE N: ... START ===`` and ``// === CHALLENGE N: ...
END ===``. Some markers include a label between the number and
``START`` (for example ``# === CHALLENGE 4: Multi-Agent Orchestrator
— START ===``); the extractor matches on the ``START`` / ``END``
tokens so every label variant is accepted.

Extraction. For each pair we read both files as UTF-8, normalise line
endings to ``\\n``, strip a single trailing newline, then find the
first line that ends with ``START ===`` and the first line that ends
with ``END ===`` after it. The body is everything between those two
marker lines, exclusive on both ends (the marker lines themselves are
comments that can legitimately differ in label — only the code between
them has to match).

Comparison. Bodies are compared with plain ``==``. On mismatch we
surface a unified diff so the failing PR shows exactly which lines
drifted.

Self-verification. ``test_extract_block_roundtrip`` pins the extractor
against a synthetic Python source and a synthetic TypeScript source so
a regression in the regex or the line-ending normaliser surfaces even
if every real pair happens to be in sync.
"""

from __future__ import annotations

import difflib
import re
from pathlib import Path
from typing import Optional

import pytest


# ---------------------------------------------------------------------------
# Repo layout constants
# ---------------------------------------------------------------------------

# ``tests/test_solutions_parity.py`` → parents[0]=tests, [1]=backend,
# [2]=blaize-bazaar, [3]=repo root.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_BACKEND = _REPO_ROOT / "blaize-bazaar" / "backend"
_FRONTEND_SRC = _REPO_ROOT / "blaize-bazaar" / "frontend" / "src"
_SOLUTIONS = _REPO_ROOT / "solutions"


# ---------------------------------------------------------------------------
# Challenge ↔ solution pair table
# ---------------------------------------------------------------------------
#
# Each entry is ``(challenge_id, live_file, solution_file)``. ``challenge_id``
# is the string that will appear in the START/END marker lines (including
# the dot for 9.1 / 9.2 / 9.3 / 9.4). The ``live_file`` and ``solution_file``
# paths are absolute ``Path`` objects. We build the list lazily so a
# rearrangement of the repo only needs to touch this one table.


def _pairs() -> list[tuple[str, Path, Path]]:
    return [
        (
            "1",
            _BACKEND / "services" / "hybrid_search.py",
            _SOLUTIONS / "module1" / "services" / "hybrid_search.py",
        ),
        (
            "2",
            _BACKEND / "services" / "agent_tools.py",
            _SOLUTIONS / "module2" / "services" / "agent_tools.py",
        ),
        (
            "3",
            _BACKEND / "agents" / "recommendation_agent.py",
            _SOLUTIONS / "module2" / "agents" / "recommendation_agent.py",
        ),
        (
            "4",
            _BACKEND / "agents" / "orchestrator.py",
            _SOLUTIONS / "module2" / "agents" / "orchestrator.py",
        ),
        (
            "5",
            _BACKEND / "services" / "agentcore_runtime.py",
            _SOLUTIONS / "module3" / "services" / "agentcore_runtime.py",
        ),
        (
            "6",
            _BACKEND / "services" / "agentcore_memory.py",
            _SOLUTIONS / "module3" / "services" / "agentcore_memory.py",
        ),
        (
            "7",
            _BACKEND / "services" / "agentcore_gateway.py",
            _SOLUTIONS / "module3" / "services" / "agentcore_gateway.py",
        ),
        (
            "8",
            _BACKEND / "services" / "otel_trace_extractor.py",
            _SOLUTIONS / "module3" / "services" / "otel_trace_extractor.py",
        ),
        (
            "9.1",
            _BACKEND / "services" / "cognito_auth.py",
            _SOLUTIONS / "module3" / "services" / "cognito_auth.py",
        ),
        (
            "9.2",
            _BACKEND / "services" / "agentcore_identity.py",
            _SOLUTIONS / "module3" / "services" / "agentcore_identity.py",
        ),
        (
            "9.3",
            _FRONTEND_SRC / "utils" / "auth.ts",
            _SOLUTIONS / "module3" / "frontend" / "utils" / "auth.ts",
        ),
        (
            "9.4-AuthModal",
            _FRONTEND_SRC / "components" / "AuthModal.tsx",
            _SOLUTIONS / "module3" / "frontend" / "components" / "AuthModal.tsx",
        ),
        (
            "9.4-PreferencesModal",
            _FRONTEND_SRC / "components" / "PreferencesModal.tsx",
            _SOLUTIONS / "module3" / "frontend" / "components" / "PreferencesModal.tsx",
        ),
    ]


# ---------------------------------------------------------------------------
# Challenge-block extractor
# ---------------------------------------------------------------------------

# Accept both ``# === CHALLENGE ... START ===`` (Python) and ``// === CHALLENGE
# ... START ===`` (TypeScript / TSX). Anchor on the literal ``START ===`` /
# ``END ===`` tokens so any label variant between the challenge number and
# ``START`` (for example ``# === CHALLENGE 4: Multi-Agent Orchestrator —
# START ===``) still matches.
_START_RE = re.compile(r"^\s*(?:#|//)\s*===\s*CHALLENGE\b.*START\s*===\s*$")
_END_RE = re.compile(r"^\s*(?:#|//)\s*===\s*CHALLENGE\b.*END\s*===\s*$")


def _normalise(text: str) -> str:
    """Normalise line endings (CRLF / CR → LF) and strip a single trailing
    newline so byte-for-byte comparison is resilient to editor quirks."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if text.endswith("\n"):
        text = text[:-1]
    return text


def extract_block(source: str, challenge_id: str) -> Optional[str]:
    """Return the body between the first matching START marker and the next
    END marker, exclusive on both ends.

    ``challenge_id`` is the token right after ``CHALLENGE`` in the marker
    line (for example ``"1"``, ``"9.1"``, or the synthetic ``"9.4-AuthModal"``
    used in the pair table). Only the numeric portion before the first
    ``-`` is matched against the marker text; the suffix is metadata for
    the caller. Returns ``None`` if either marker is missing.
    """
    numeric = challenge_id.split("-", 1)[0]

    # Build a challenge-number-aware matcher so we don't accidentally cross
    # a different challenge block (for example a file that carries both
    # CHALLENGE 9.1 and CHALLENGE 9.2 blocks).
    start_re = re.compile(
        rf"^\s*(?:#|//)\s*===\s*CHALLENGE\s+{re.escape(numeric)}\b.*START\s*===\s*$"
    )
    end_re = re.compile(
        rf"^\s*(?:#|//)\s*===\s*CHALLENGE\s+{re.escape(numeric)}\b.*END\s*===\s*$"
    )

    lines = source.splitlines()
    start_idx: Optional[int] = None
    end_idx: Optional[int] = None
    for i, line in enumerate(lines):
        if start_idx is None and start_re.match(line):
            start_idx = i
            continue
        if start_idx is not None and end_re.match(line):
            end_idx = i
            break

    if start_idx is None or end_idx is None:
        return None
    body_lines = lines[start_idx + 1 : end_idx]
    return "\n".join(body_lines)


def _read(path: Path) -> str:
    return _normalise(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Parametrised parity test
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "challenge_id, live_path, solution_path",
    _pairs(),
    ids=[p[0] for p in _pairs()],
)
def test_challenge_block_matches_solution(
    challenge_id: str, live_path: Path, solution_path: Path
) -> None:
    assert live_path.exists(), f"Challenge file missing: {live_path}"
    assert solution_path.exists(), f"Solution file missing: {solution_path}"

    live_src = _read(live_path)
    sol_src = _read(solution_path)

    live_block = extract_block(live_src, challenge_id)
    sol_block = extract_block(sol_src, challenge_id)

    assert live_block is not None, (
        f"Challenge {challenge_id}: missing START/END markers in "
        f"{live_path.relative_to(_REPO_ROOT)}"
    )
    assert sol_block is not None, (
        f"Challenge {challenge_id}: missing START/END markers in "
        f"{solution_path.relative_to(_REPO_ROOT)}"
    )

    if live_block != sol_block:
        diff = "\n".join(
            difflib.unified_diff(
                sol_block.splitlines(),
                live_block.splitlines(),
                fromfile=str(solution_path.relative_to(_REPO_ROOT)),
                tofile=str(live_path.relative_to(_REPO_ROOT)),
                lineterm="",
            )
        )
        pytest.fail(
            f"Challenge {challenge_id} block drift between\n"
            f"  {solution_path.relative_to(_REPO_ROOT)}\n"
            f"  {live_path.relative_to(_REPO_ROOT)}\n\n"
            f"{diff}"
        )


# ---------------------------------------------------------------------------
# Self-verification — the extractor itself
# ---------------------------------------------------------------------------


def test_extract_block_roundtrip_python() -> None:
    source = (
        "prologue\n"
        "# === CHALLENGE 1: START ===\n"
        "def f():\n"
        "    return 42\n"
        "# === CHALLENGE 1: END ===\n"
        "epilogue\n"
    )
    body = extract_block(source, "1")
    assert body == "def f():\n    return 42"


def test_extract_block_roundtrip_typescript_with_label() -> None:
    source = (
        "import x from 'y'\n"
        "// === CHALLENGE 9.4: Auth Modal — START ===\n"
        "export const Foo = () => null\n"
        "// === CHALLENGE 9.4: Auth Modal — END ===\n"
    )
    body = extract_block(source, "9.4")
    assert body == "export const Foo = () => null"


def test_extract_block_missing_markers_returns_none() -> None:
    assert extract_block("no markers here\n", "1") is None


def test_extract_block_handles_crlf() -> None:
    source = _normalise(
        "# === CHALLENGE 2: START ===\r\n"
        "x = 1\r\n"
        "# === CHALLENGE 2: END ===\r\n"
    )
    assert extract_block(source, "2") == "x = 1"


def test_extract_block_respects_challenge_number() -> None:
    """Confirm the extractor doesn't cross into a different challenge's
    block when two challenges live in the same file."""
    source = (
        "# === CHALLENGE 9.1: START ===\n"
        "a = 1\n"
        "# === CHALLENGE 9.1: END ===\n"
        "\n"
        "# === CHALLENGE 9.2: START ===\n"
        "b = 2\n"
        "# === CHALLENGE 9.2: END ===\n"
    )
    assert extract_block(source, "9.1") == "a = 1"
    assert extract_block(source, "9.2") == "b = 2"
