# Personas — Implementation Notes

## Three personas

| ID         | Name          | Role       | Orders | LTM facts |
| ---------- | ------------- | ---------- | ------ | --------- |
| CUST-MARCO | Marco         | Returning  | 7      | 6         |
| CUST-ANNA  | Anna          | Gift-giver | 5      | 5         |
| CUST-FRESH | A new visitor | Empty      | 0      | 0         |

Canonical definitions live in `docs/personas-config.json`. Seed script: `scripts/seed_personas.py` (idempotent).

## Data flow

```
Frontend: usePersona() context
  → POST /api/persona/switch { persona_id }
    → backend returns { session_id, persona { customer_id, ... } }
  → localStorage stores persona + session_id
  → chat requests include customer_id in payload
    → /api/chat/stream threads customer_id into user dict
      → chat_stream passes to AgentCore Memory + episodic_memory
        → LTM reads scope by customer_id
        → order history scopes by customer_id
```

## Surfaces

- Storefront header: "Sign in" pill (outlined) → espresso pill with avatar + name when active
- Persona modal: one component, two entry points (header pill + Atelier indicator)
- Atelier indicator: `· AS Marco` pill in DetailPageShell breadcrumb row, inherited by all 8 architecture pages
- WorkshopChat dropdown: updated to show the 3 personas (CUST-MARCO, CUST-ANNA, CUST-FRESH)

## Session management

- Switching personas generates a new session_id (`persona-{id}-{uuid8}`)
- Chat persistence is cleared on switch (localStorage keys removed)
- The fresh visitor gets a real customer row with empty children — distinct from the "anonymous" short-circuit in episodic_memory.py

## Endpoints

- `GET /api/atelier/personas` — list (no customer_ids exposed)
- `POST /api/persona/switch` — switch, returns new session + persona snapshot with customer_id
- `GET /api/persona/current?session_id=` — resolve active persona for a session
- `GET /api/atelier/personas/reload` — dev helper, force re-read of config

## CSS tokens

- `--rule-3: rgba(31, 20, 16, 0.28)` — dashed border for fresh visitor avatar
- `--persona-marco: #5a3528` — Marco avatar background
- `--persona-anna: #6b3d2a` — Anna avatar background

## Known limitations

- No real auth. Personas are workshop affordances, not user accounts.
- Persona switch resets the session. No state merge between personas.
- The in-memory `_session_persona` dict in app.py is lost on backend restart. Frontend localStorage preserves the persona; the session_id mapping is re-established on next switch.
- Phase 4 (context propagation) is not yet verified end-to-end. The wiring is in place but the 5 acceptance demos need a live backend to confirm.
- The gift-concierge skill's router description may not reliably trigger for Anna's queries — flagged for tuning in a separate PR.

## Curated query catalog

See `docs/persona-demo-queries.md` for 5 queries per persona, each mapped to an architectural concept.
