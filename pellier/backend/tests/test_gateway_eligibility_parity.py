"""Eligibility parity: the Gateway search Lambda must exclude what in-process excludes.

``scripts/seed_pellier_catalog.py`` seeds rows tagged ``archive`` on purpose, as
retrieval-quality distractors. Every in-process catalog read filters them out
with ``NOT (tags ? 'archive')``. The Gateway Lambda promises that swapping the
rail is "invisible to the agent's prompt", so its catalog reads must carry the
same predicate; otherwise the managed rail can surface retired pieces the
storefront never would, and Lab 2's strategy comparison is no longer comparing
like with like.

Both sides are checked from source, the way ``test_rrf_parity`` pins the RRF
constant, so the alarm fires on the file a participant deploys rather than on a
fake that happens to agree.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BACKEND = _REPO_ROOT / "pellier" / "backend"
_LAMBDA_PATH = _REPO_ROOT / "scripts" / "deploy" / "pellier_search_server.py"

ARCHIVE_PREDICATE = "NOT (tags ? 'archive')"

# In-process catalog reads that the Lambda mirrors, one per Gateway tool.
_IN_PROCESS_REFERENCES = (
    (_BACKEND / "services" / "vector_search.py", "vector_search"),
    (_BACKEND / "services" / "hybrid_search.py", "_vector_branch_sql"),
    (_BACKEND / "services" / "business_logic.py", "get_products_by_category"),
)

# Gateway Lambda functions that read the catalog for a shopper.
_LAMBDA_CATALOG_READERS = (
    "semantic_search",
    "search_products_hybrid",
    "browse_category",
)


def _function_source(path: Path, name: str) -> str:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            segment = ast.get_source_segment(source, node)
            assert segment, f"{path.name}::{name} has no source segment"
            return segment
    raise AssertionError(f"{path.name} defines no function named {name}")


@pytest.mark.parametrize(("path", "name"), _IN_PROCESS_REFERENCES)
def test_in_process_catalog_reads_exclude_archived_rows(path: Path, name: str) -> None:
    assert ARCHIVE_PREDICATE in _function_source(path, name), (
        f"{path.name}::{name} no longer excludes archived rows; the Lambda parity "
        "check below mirrors this predicate, so update both or neither"
    )


@pytest.mark.parametrize("name", _LAMBDA_CATALOG_READERS)
def test_gateway_lambda_catalog_reads_exclude_archived_rows(name: str) -> None:
    assert ARCHIVE_PREDICATE in _function_source(_LAMBDA_PATH, name), (
        f"pellier_search_server.py::{name} reads the catalog without "
        f"{ARCHIVE_PREDICATE!r}; the managed rail would return seeded archive "
        "distractors that every in-process path excludes"
    )
