# Storefront Chat Drawer

The storefront's chat experience is a right-side drawer that slides in from the right. It replaces the centered ConciergeModal that previously served both storefront and atelier routes.

## Component API

**`ChatDrawer`** (`src/components/ChatDrawer.tsx`)

Mounts at the App root inside BrowserRouter. Renders via `createPortal(..., document.body)` — mandatory because the storefront header's `backdrop-filter: blur(12px)` creates a containing block that traps `position: fixed` descendants (same bug we hit with PersonaModal).

Props: none. Reads all state from context:

- `UIContext.activeModal === 'drawer'` → open/close
- `UIContext.consumePendingQuery()` → seeded query from suggestion pills
- `useAgentChat({ mode: 'storefront', persistKey: 'blaize-drawer-storefront' })` → chat state
- `usePersona()` → persona indicator in header

## Three entry points

1. **Floating CommandPill click** — `toggleDrawer()` from UIContext. Pill hides while drawer is open; returns when drawer closes.

2. **⌘K / Ctrl+K shortcut** — UIProvider's global handler reads `chatSurface` to toggle the right surface. StorefrontPage sets `chatSurface('drawer')` on mount; WorkshopPage sets `'concierge'`.

3. **Suggestion pill click** (IntentTicker chips) — `onOpenDrawer(intent.query)` calls `openDrawerWithQuery(text)` which sets `pendingConciergeQuery` + opens the drawer. The drawer consumes the query via `useLayoutEffect` (not `useEffect`) so `sendMessage` fires before the browser's first paint — no empty-state flicker.

## Mobile variant

Below 768px viewport: drawer becomes a bottom sheet. `transform: translateY(100%) → translateY(0)`. Takes 80dvh height (uses `dvh` for iOS Safari address-bar resilience). Decorative drag handle at the top (36×4px rounded bar). No drag-to-dismiss in v1.

## Portal requirement

The drawer MUST use `createPortal(..., document.body)`. The storefront header has `backdrop-filter: blur(12px)` which per CSS spec establishes a containing block for `position: fixed` descendants. Without the portal, the drawer's `position: fixed; top: 0; right: 0; bottom: 0` would anchor to the header's stacking context instead of the viewport. Same bug we fixed for PersonaModal.

## Persistence

Conversation persists within session via `useAgentChat`'s `persistKey: 'blaize-drawer-storefront'`. Closing the drawer does not clear; reopening shows the same history. The atelier's ConciergeModal uses a separate key (`'blaize-concierge-atelier'`) — the two surfaces have independent conversation histories by design.

## What was removed

- **Inline SearchPill** — the search bar that overlaid the bottom of the hero cover photo. Redundant with the floating pill; visually competed with the photography. Deleted from `HeroStage.tsx`.
- **StorefrontChat.tsx** — the old modal-mode storefront chat rendering. Its body content was extracted into `StorefrontChatBody.tsx` (shared by the drawer); the header/footer moved into `ChatDrawer`'s own shell.
- **ConciergeModal's storefront branch** — the `mode === 'storefront'` ternary that rendered `StorefrontChat` inside the centered modal. ConciergeModal now only renders on atelier routes.

## Naming note

`activeModal` in UIContext now includes `'drawer'` as a value. This is a naming inconsistency — a drawer in a field called `activeModal`. Future cleanup: rename `activeModal` → `activeSurface` for accuracy. Not blocking.

## Carousel-jump + drawer-open

When a suggestion pill is clicked, two things happen: the hero carousel jumps to that intent AND the drawer opens with the query streaming. The carousel jump gives immediate visual feedback before the drawer slides in. If workshop testing shows the double-state-change feels weird, remove `onSelect(i)` from the IntentTicker click handler — one-line change.

## Files

```
src/components/ChatDrawer.tsx          — drawer shell (portal, backdrop, slide, header, footer)
src/components/StorefrontChatBody.tsx  — body-only message rendering (shared with drawer)
src/styles/chat-drawer.css             — drawer-specific styles
src/contexts/UIContext.tsx              — gained 'drawer' modal type + chatSurface routing
src/components/CommandPill.tsx          — toggles drawer on storefront, concierge on atelier
src/components/HeroStage.tsx           — IntentTicker gains onOpenDrawer prop
src/components/ConciergeModal.tsx      — gated to atelier-only
```
