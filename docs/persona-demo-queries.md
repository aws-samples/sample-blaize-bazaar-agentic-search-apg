# Persona Demo Queries

Curated queries guaranteed to demo well for each persona. Each maps to a specific architectural concept the workshop demonstrates.

---

## Marco (returning · linen · 7 orders)

**Query:** "a linen piece for slow Sundays"
**What demos:** LTM recall + style-advisor skill. Memory page shows his oat-tones, natural-fibers facts.
**Expected reply shape:** References past Maren purchase; recommends Pellier shirt; size M assumed.

**Query:** "something that travels well"
**What demos:** LTM + order history continuity. Agent sees his Lisbon trip browsing history.
**Expected reply shape:** Leans into wrinkle-resistant fabrics; references his travel-fabric inquiry.

**Query:** "what did I buy last time?"
**What demos:** Order history tool. Procedural memory panel shows 7 orders.
**Expected reply shape:** Lists his recent purchases by name; no fabrication.

**Query:** "compare the Pellier and the Maren"
**What demos:** compare_products tool. Tool Registry page shows the grant firing.
**Expected reply shape:** Side-by-side on weight, drape, price; references his size M.

**Query:** "place an order for the Pellier in M"
**What demos:** Approvals queue (Grounding page). State-changing tool call gets queued.
**Expected reply shape:** Confirmation card in chat; Grounding audit log shows the queued item.

---

## Anna (gift-giver · 5 orders)

**Query:** "a linen piece for slow Sundays"
**What demos:** Same query as Marco, different reply. LTM signals gift-shaped history.
**Expected reply shape:** Asks clarifying question ("is this for you, or for someone else?") rather than assuming.

**Query:** "a birthday gift for my mother, around $200"
**What demos:** gift-concierge skill activation. Skills page shows the skill loading.
**Expected reply shape:** Gift-framed recommendations with wrapping/timing mentions; price band respected.

**Query:** "something for an anniversary, she likes warm tones"
**What demos:** LTM + skill interaction. Gift-concierge shapes the voice; LTM provides the milestone context.
**Expected reply shape:** Milestone-appropriate pieces; editorial tone with gift-occasion awareness.

**Query:** "what have I ordered before?"
**What demos:** Order history scoped to Anna. 5 orders, all gift-shaped.
**Expected reply shape:** Lists her past gift purchases; varied recipients visible.

**Query:** "show me what's trending"
**What demos:** trending_products tool. Same tool, different context than Marco.
**Expected reply shape:** Editorial picks; no personalization lean since trending is catalog-wide.

---

## A new visitor (empty memory)

**Query:** "a linen piece for slow Sundays"
**What demos:** Cold-start contrast. Memory page shows 0 facts. The visceral demo.
**Expected reply shape:** Editorial fallback picks; asks grounding questions (size, color preference).

**Query:** "what did I buy last time?"
**What demos:** Empty order history. Agent handles gracefully.
**Expected reply shape:** Honest "nothing in your history yet" response; suggests browsing.

**Query:** "recommend something for a gift"
**What demos:** gift-concierge may or may not load (no LTM signal to trigger it reliably).
**Expected reply shape:** Generic gift suggestions; asks who it's for and the occasion.

**Query:** "show me linen shirts under $130"
**What demos:** search_products tool with price filter. Works identically regardless of persona.
**Expected reply shape:** Filtered results; no personalization overlay.

**Query:** "what size should I get?"
**What demos:** No size preference in LTM. Contrast with Marco who has "sizes consistently M."
**Expected reply shape:** Asks for measurements or usual size; cannot assume.

---

## Cross-persona comparison (the headline demo)

Run "a linen piece for slow Sundays" as all three personas in sequence. The three replies side by side are the workshop's most legible argument for personalization. See `docs/persona-comparison.html` for the visual mockup of this exact comparison.
