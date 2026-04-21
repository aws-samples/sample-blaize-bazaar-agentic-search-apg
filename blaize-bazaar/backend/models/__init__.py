"""
Pydantic models for Blaize Bazaar Backend
"""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel

from .product import Product, ProductWithScore, ProductSearchResult, ProductFilters
from .search import (
    CategoryTag,
    ColorTag,
    OccasionTag,
    ReasoningChip,
    ReasoningStyle,
    SearchRequest,
    SearchResponse,
    SearchResult,
    StorefrontBadge,
    StorefrontCategory,
    StorefrontProduct,
    StorefrontSearchResponse,
    VibeTag,
)


# === STOREFRONT MODELS (Task 1.3 / Design Data Models) ===
#
# `Preferences` and `VerifiedUser` mirror the TypeScript types added in
# Task 1.2 (frontend/src/services/types.ts). Both emit camelCase keys on
# the wire and accept either casing on input.


class Preferences(BaseModel):
    """User preferences captured by the onboarding modal.

    Mirrors the TypeScript `Preferences` shape: four multi-select tag groups
    keyed by the four `*Tag` literal types re-exported from `models.search`.
    """

    vibe: List[VibeTag] = Field(default_factory=list)
    colors: List[ColorTag] = Field(default_factory=list)
    occasions: List[OccasionTag] = Field(default_factory=list)
    categories: List[CategoryTag] = Field(default_factory=list)

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class VerifiedUser(BaseModel):
    """Verified Cognito user returned by `CognitoAuthService.validate_jwt`.

    Field names use snake_case in Python and camelCase on the wire to match
    the frontend `User` type. `given_name` serializes as `givenName`.
    """

    user_id: str
    email: EmailStr
    given_name: str

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


__all__ = [
    # Legacy models
    "Product",
    "ProductWithScore",
    "ProductSearchResult",
    "ProductFilters",
    "SearchRequest",
    "SearchResponse",
    "SearchResult",
    # Storefront tag literal types
    "VibeTag",
    "ColorTag",
    "OccasionTag",
    "CategoryTag",
    # Storefront reasoning and product models
    "ReasoningStyle",
    "ReasoningChip",
    "StorefrontCategory",
    "StorefrontBadge",
    "StorefrontProduct",
    "StorefrontSearchResponse",
    # Storefront user + preferences
    "Preferences",
    "VerifiedUser",
]
