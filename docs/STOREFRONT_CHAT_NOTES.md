# Storefront Chat — Implementation Notes

## Design Token List

All tokens live in `:root` in `src/index.css`:

| Token          | Value                 | Usage                                         |
| -------------- | --------------------- | --------------------------------------------- |
| `--cream-1`    | `#faf3e8`             | Primary surface                               |
| `--cream-2`    | `#f4ead6`             | Recessed surface (edition strip, user bubble) |
| `--cream-3`    | `#ede0c4`             | Deeper sand (rare)                            |
| `--cream-elev` | `#fffaf0`             | Elevated surface (input bar, artifact card)   |
| `--ink-1`      | `#1f1410`             | Primary text, espresso buttons                |
| `--ink-3`      | `rgba(31,20,16,.66)`  | Secondary text                                |
| `--ink-4`      | `rgba(31,20,16,.42)`  | Tertiary text                                 |
| `--ink-5`      | `rgba(31,20,16,.22)`  | Faint rules                                   |
| `--rule-1`     | `rgba(31,20,16,.10)`  | Hairline rules                                |
| `--rule-2`     | `rgba(31,20,16,.18)`  | Stronger rules, button borders                |
| `--red-1`      | `#a8423a`             | Burgundy accent                               |
| `--red-soft`   | `rgba(168,66,58,.12)` | Burgundy highlight underline                  |
| `--green-1`    | `#6b8c5e`             | Tool-call complete checkmark                  |
| `--serif`      | Fraunces stack        | Display, body prose, italic emphasis          |
| `--sans`       | Inter stack           | UI body, labels, eyebrows                     |
| `--mono`       | JetBrains Mono stack  | Eyebrow tags, edition marks, durations        |

## Tool Label Mapping

| Raw tool name           | Boutique label         | Meta |
| ----------------------- | ---------------------- | ---- |
| `search_products`       | Searched the boutique  | —    |
| `get_trending_products` | Pulled recommendations | —    |
| `get_recommendations`   | Pulled recommendations | —    |
| `check_inventory`       | Checked the floor      | —    |
| `get_low_stock`         | Checked the floor      | —    |
| `get_price_analysis`    | Confirmed pricing      | —    |
| `recall_session`        | Read your last visit   | —    |
| `restock_product`       | Flagged for restock    | —    |
| (fallback)              | Cleaned function name  | —    |

## Deviations from HTML Mockups

1. **Product artifact card** uses `ProductArtifactCard` (new component) rather than adding a `variant` prop to the existing `ProductCard`. The storefront grid card has deeply embedded parallax/observer logic that would have been disruptive to modify.

2. **Thinking block** uses native CSS show/hide rather than shadcn Collapsible. The project doesn't have shadcn installed as a dependency, and adding it for one primitive wasn't justified. The behavior is identical.

3. **Inline product mentions** (burgundy underline + click-to-open) are not yet implemented. The `MarkdownMessage` component renders markdown but doesn't have a product-mention detection pass. Flagged for follow-up.

4. **Cover image** uses CSS-only vessel composition (gradient + shapes) matching the mockup exactly. No static SVG asset was needed — the CSS stayed under 60 lines.

5. **Edition number** ("No. 06") is hardcoded per the spec's instruction. Can be made dynamic when the content team provides a rotation source.

## File Structure

| File                                 | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `components/StorefrontChat.tsx`      | Editorial chat rendering (header, edition strip, messages, input) |
| `components/StorefrontWelcome.tsx`   | Welcome state (cover, greeting, picks, P.S.)                      |
| `components/ProductArtifactCard.tsx` | In-chat product card                                              |
| `styles/storefront-chat.css`         | Active chat styles                                                |
| `styles/storefront-welcome.css`      | Welcome state styles                                              |
| `styles/product-artifact.css`        | Artifact card styles                                              |

## Flagged for Future Work

- Inline product mentions with burgundy underline + click-to-open overlay
- Dynamic edition number rotation
- Comparison and gallery variants for multi-product messages
- Error states, retry, agent timeout (currently falls through to the generic message body)
