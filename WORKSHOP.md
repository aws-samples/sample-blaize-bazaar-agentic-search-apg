# Pellier L400 Workshop - Co-Speaker Brief

> **Working draft.** This is the staff-facing story of the workshop as it is
> taking shape. The participant guide, recovery steps, and detailed instructions are
> still being refined in Workshop Studio. Use this brief to understand the
> experience we are building and how to present it coherently.

## The workshop in one minute

**4 labs, 8 bounded builds, 2 workflows on the participant path.**

Pellier is a governed agentic retail experience. A shopper asks for help in a
premium storefront; a Strands dispatcher selects a bounded specialist; and
Aurora PostgreSQL supplies the facts behind the answer. Participants then move
from an answer that looks credible to evidence that can be queried, measured,
and governed: PostgreSQL proves what is true, AgentCore provides managed
capabilities, and durable receipts make it possible to reconstruct what
happened.

The central idea is simple: a good agent response is not enough. We want people
to distinguish four things:

1. What is true in the system of record.
2. What retrieval or an agent proposed.
3. What identity and policy permitted.
4. What actually executed and what evidence remains.

## Pellier Storefront

The experience starts with **Pellier**, not a dashboard. Marco, Anna, and Theo
make the system feel like a real retail interaction before we reveal the
architecture behind it. Jessica then anchors the governed customer case in
Pellier Operator. Start the room in the Storefront, then use one named customer
anchor per lab.

Each Storefront shopper has a coherent multi-turn conversation. Marco's
warehouse check anchors Lab 1, Anna's bounded gift request anchors Lab 2, and
Theo's three-turn ceramic and morning-ritual thread anchors Lab 3. Jessica is
not added to the Storefront selector; her customer identity and service case
anchor Lab 4. The designed experiences remain the participant's reason to build
and prove the underlying paths.

The rehearsal scripts are fixed because the history depth is part of the
architecture demonstration:

| Lab anchor | Three-turn script |
|---|---|
| **Marco · Lab 1** | "What linen do you have for 10 days in Goa?"<br>"What would go with the Hadley Linen Shirt?"<br>"How many Hadley Linen Shirts are available at the Brooklyn warehouse, and what ship window is recorded?" |
| **Anna · Lab 2** | "A housewarming gift for someone who loves slow morning rituals."<br>"Keep it under $100 and in stock. Show me the strongest two options."<br>"Which one should I choose? Compare the two options using their current prices and availability." |
| **Theo · Lab 3** | "Hand-thrown ceramics for a slower morning routine"<br>"What goes well with the pour-over set, keeping to the same materials and morning routine?"<br>"My Wabi-Sabi Bowl arrived chipped. Please help me return it." |
| **Jessica · Lab 4 Operator close** | "Investigate Jessica's open service issue (TKT-2026-3015) and recommend the next fair step. Distinguish what the records establish from what a source reports."<br>"Which customer, order, return, and identity records are authoritative for this decision? Separate confirmed facts from notes and assumptions."<br>"Prepare the fairest next step for human review without executing it. Name any missing facts the reviewer must resolve." |

For each Storefront script, the requests carry 0, then 2, then 4 prior
dialogue messages. Theo's third turn closes the managed thread with a
consequential return request: the session history is available to AgentCore
Memory, while the identity, policy, Aurora, and human-review boundaries remain
separate. Jessica's Operator script uses a separate authenticated staff session
and stops at the human checkpoint.

### What the room sees in the Storefront (updated 2026-09-03)

- A first visit opens a short welcome tour. Once it is dismissed, the persona
  choice lives in the header pill. Signed out, that pill opens the same
  three-card chooser ("Choose who enters Pellier") as the signed-in pill; the
  old compact dropdown is gone. The hero no longer repeats the question.
- Before Lab 1 is built, Marco's warehouse question returns a quiet card,
  "Still being set up", with the reference code `workshop_build_required`.
  That is the designed state, not an error: the inventory tool does not exist
  yet. After Lab 1 the same question returns live stock. Tell the room this
  before they try it. Anna's third turn ("prove it stayed in budget and in
  stock") needs the same tool, so it shows the same card until Lab 1 is
  built: run the labs in order.
- Rehearsal timing: an editorial turn (Marco or Anna's first two, Theo's
  first two) takes about 30 to 35 seconds to answer on Opus. Theo's return
  and the build-state card come back in a second or two. Keep talking while
  the first answer streams.
- Shopper copy never names Aurora, Cognito, agents or tools. The product page
  says "Checked just now" and "Counts by warehouse"; the persona card says the
  choice "does not sign you in as that customer". The Observatory is where
  the architecture words live.
- The product page title, the home hero and every Observatory page title use
  the same display typeface, so the three surfaces read as one product. The
  product photograph opens enlarged on click; Escape closes it. Stories and
  About in the header are real pages again rather than links back home.
- About names all three surfaces in plain words: the boutique, the Operator
  desk (where a return, a credit or a held action is decided by a person and
  the decision is kept) and the Observatory (which specialist took the
  request, what it read, what it was allowed to do, what the database
  changed). The stack chips are the real stack; Amazon Transcribe is gone
  and Cohere Rerank is listed. Stories carries three volumes and four field
  notes; the notes now match the seeded orders (Marco's linen-then-travel
  run, Anna's gift under a hundred, Theo's incense holder to wabi-sabi bowl).
  The three Stories photographs and the About photograph are our own
  generated stills, served as local WebP and AVIF, so neither page needs the
  internet in the room.
- The header's Pellier Operator and Pellier Observatory links are the same
  size as the primary nav, still in the muted colour.
- Marco, Anna and Theo have new portraits from one shoot (warm plaster wall,
  raking light, linen and knit in their own palettes). The chooser's photo
  row is taller so each face is a full headshot. Jessica keeps her
  client-book portrait: she is the Lab 4 customer, not a shopper persona,
  and her photo must stay the same face in the client book and the lab
  cards.
- The chooser blurbs now match the seeded orders (migration 045: Marco's
  "seven orders of linen and leather", no invented "Maren tunic", no em
  dashes). Fresh boxes get it from bootstrap; an existing cluster needs the
  migration applied once.
- Signed out, "Ask Pellier" in the header and the search icon open the
  persona chooser instead of doing nothing, because the concierge needs a
  shopper. The hero card and the chooser use the same words: "Choose who
  enters Pellier."
- Shopper copy no longer says Aurora, "workshop profile" or "tag weights".
  The chat eyebrow reads "Signed in as Marco", the hero badge "Live
  catalog". The Observatory is still where the architecture words live.

### Agent and tool model

The Storefront production path is a deterministic Strands dispatcher. Each
shopper turn is routed to exactly one bounded specialist:

- **Search** for catalog discovery and comparison.
- **Personalization** for recommendations and curated choices.
- **Pricing** for price and offer questions.
- **Inventory** for availability and fulfillment facts.
- **Customer Service** for order, return, and support requests.

Each specialist is a Strands agent with an explicit, small tool allowlist.
The tools are typed server-side operations, not an invitation for the model to
invent data or take arbitrary actions. Lab 1 makes this concrete by building
the Inventory Agent's inventory-check path; Lab 2 applies the same discipline
to retrieval and eligibility.

The Live Workbench exposes three response settings without changing the
deterministic routing or authorization path: **Balanced** uses the established
Opus/Sonnet specialist mix, **Editorial** selects the configured Opus profile for
the responding specialist, and **Fast** selects the configured Claude Haiku
4.5 profile for a concise grounded response. The Workbench records the exact
model identifier used by each turn rather than relying on the selected label.

| Concern | Fixed model contract | What the presenter should show |
|---|---|---|
| Dispatcher, routing, structured extraction, reporting | Claude Sonnet 4.6, global profile | The route is deterministic. Changing a response setting does not reroute the request. |
| Search, Personalization, Customer Service | Claude Opus 4.6, global profile by default | Balanced preserves the editorial/reporting split; Editorial uses the configured Opus profile for the responding specialist. |
| Fast response composition | Claude Haiku 4.5, global profile | Fast is concise composition after the same routing and tool boundary, not a shortcut around grounding. |
| Retrieval | Cohere Embed v4 and Cohere Rerank v3.5 | These remain retrieval infrastructure, not a Run setup option. |

The Bedrock preflight verifies required Sonnet, Haiku, embedding, and rerank
profiles and resolves the editorial Opus-or-Sonnet path before the workshop is
marked ready. Say that Run setup changes *how the selected specialist composes
the answer*. Do not say that Fast disables retrieval, Memory, policy, telemetry,
Aurora enforcement, or authentication; those boundaries remain fixed and must
be proven independently.

Labs 1 and 2 begin on the in-process rail so participants can build and measure
the application boundary directly. In Lab 3, they first verify Gateway and
Runtime, then move the Storefront onto the managed path before running Theo's
three-turn journey.

That managed Storefront proof requires a signed-in Cognito user. Selecting a
shopper persona is a scenario choice, not authentication, and an unsigned turn
must not be described as a managed fallback. The Runtime status indicator
proves the resource's lifecycle state; a managed-path receipt proves that a
request actually used the Runtime and Gateway path.

### Identity and proof guardrails

- A persona supplies workshop scenario context; a verified Cognito principal
  supplies authorization. Customer-specific reads require that verified scope.
- Fresh Gateway policies bind the verified user to the requested
  customer. A deny must be observed before target execution, then paired with
  PostgreSQL evidence that no execution or canonical write occurred.
- Only the current managed read paths are demonstrated; older migrated paths
  remain deliberately unavailable until their scoped policies converge.
- Lab 4's return-ownership rule is deliberately participant-authored. It
  exercises the condition without weakening the shipped row-level-security
  backstop.
- Local tests validate the contract, not the deployed AWS path. The live
  rehearsal must capture a real Gateway denial before Lambda and the matching
  Aurora non-execution evidence.
- A successful Runtime invocation does not prove the participant's revision
  ran. The invoke response carries no version and `qualifier=DEFAULT` is an
  alias, so a green answer is equally consistent with a silently failed deploy
  and yesterday's package. The Proof Board's managed receipt carries a build
  fingerprint for exactly this: **This checkout** means the deployed package
  was built from their source, **Older deployment** names both digests, and
  **Not reported** means the runtime predates the mechanism, which is not the
  same finding as stale.
- Lab 4's RLS proof now asserts its own preconditions before claiming a
  denial. A policy decides nothing if the role holds BYPASSRLS or SUPERUSER,
  if the proof runs as the table owner (`pellier.returns` is ENABLE, not
  FORCE), or if a second permissive policy has been added — permissive
  policies are OR-ed, so they can only widen. Each of those now fails with a
  named diagnosis rather than a bare "out-of-scope write succeeded", which
  reads as a broken policy rather than a skipped one.

## Pellier Operator

**Pellier Operator** is the authenticated service and human-decision surface.
Use Jessica's client record and ticket **TKT-2026-3015** to close Lab 4. A separately authorized operator
investigates the same business subject after the identity and database boundaries
have been proven.

The Operator uses a separate bounded investigation flow that orders **Case
Investigator** before **Resolution Planner**. It produces an
investigation and a proposed plan. It does not approve a review, authorize a
write, or mutate business data.

What the desk looks like now (updated 2026-09-07): the sign-in control is the
same round pill as the Storefront's. It opens Pellier's dedicated `/signin`
page, which verifies credentials with Cognito and returns to the requested record. Each browser tab is titled by the desk view (Clients, Action
Queue, Client, Review). Action Queue rows carry an outcome glyph and word,
pending, declined, approved, refused or executed, so a policy refusal and a
carried-out write never look alike in the list, and the queue can be filtered
by those outcomes. The client book has a name filter beside the membership
ladder. On a phone the review record stacks every card, including the
proposed action's parameters, above the decision buttons. Every signed-out
desk view, including the Action Queue and a single review, carries its own
Sign in button, and a decision that fails for a reason other than changed
parameters or an expired sign-in reads as a sentence, not a raw error code.

The dedicated sign-in page uses Cognito `USER_PASSWORD_AUTH`; the app client must
allow `ALLOW_USER_PASSWORD_AUTH`. Passwords pass transiently through the server;
verified tokens use the existing Secure, HTTP-only session cookies. Deploy behind
HTTPS (the local browser preview uses loopback). Recovery uses Cognito's registered
recovery contact. Additional verification and federated providers continue through
the hosted flow, whose callback and logout URLs must include the preview origin.
Changing a workshop persona never grants Operator access: the authenticated user
still needs the configured Operator group.

Jessica is not a fourth Storefront persona. She is a real Cognito customer
principal and the required Lab 4 business subject, while the separate
operator sign-in remains the only account authorized for the staff desk.
Marco-for-Jessica demonstrates the cross-customer denial; Jessica-for-Jessica
is the positive control. The required Operator close then runs three turns:

1. Investigate Jessica's service issue, keeping established records separate
   from what the support source reports.
2. Identify which customer, order, return, and identity records are
   authoritative for the decision.
3. Prepare the fairest next step for human review without executing it. Name any missing facts the reviewer must resolve.

The staff investigation is a separate request and fact from the direct Gateway
proof. It stops at the human checkpoint; no approval or mutation is implied.
The Operator deep link keeps that boundary visible: an unsigned visitor is
asked to sign in to the staff desk, while an unavailable governed service is
reported as unavailable rather than leaving the case in a permanent loading
state.

After the terminal shopper receipt, the Evidence Ledger can project the
Operator lifecycle as a separate typed follow-up: **review opened**, **review
confirmed or declined**, and, only when a reviewed action is attempted, the
resulting **execution receipt**. Those events stay after the immutable shopper
turn. They do not make a staff action look like a Storefront mutation, and
they do not expose action arguments, principal identifiers, or customer
mapping details.

## Pellier Observatory

**Pellier Observatory** is the inspection layer across routing, tools, database
evidence, Memory, policy, receipts, and telemetry. It makes a live Storefront or Operator
run legible, but it does not replace the evidence process.

The Lab Collection and Live Workbench are one Observatory experience, not a
fourth product surface. The Lab Collection selects the current lab; the Live
Workbench carries its context into shared evidence views. Use it to orient the
room, replay a turn, and make the evidence easier to scan. For the Jessica
handoff, it also makes the boundary explicit: the shopper turn ends, then the
typed Operator review and, if one occurs, execution lifecycle follows as
separate evidence.

What to point at in the Workbench (updated 2026-09-04):

- The Evidence ledger opens with the three receipts for the turn: **Policy**
  (the decisions recorded), **Execution** (tool calls audited) and **Data**
  (Aurora receipts, with any rejected statement counted). "Not recorded" is
  printed rather than hidden.
- Every ledger event can open its receipt fields: a policy event shows the
  decision, principal, action, resource and policy; a model event shows model
  id and tokens; an Aurora event shows the database role, statement timeout,
  rows returned and whether it was accepted; a tool event shows the recorded
  arguments and result. Retrieval events show the candidate table with vector
  rank, lexical rank, RRF and rerank score, and a "Trace this retrieval" link
  that opens the Search pipeline on the shopper's own query.
- The Sessions telemetry tab shows the same details per panel, and stacks
  properly on a phone.
- Performance says "not recorded in this window" for any panel without data
  and never prints a zero as a median.
- The reference views under the Lab Collection are an index table: each view,
  what it shows and the table or service it reads from. In the live Workbench
  the same index is collapsed behind "Explore reference views" so the ledger
  keeps the space.
- Sessions can be narrowed by a typed query or a status chip. The Tool Registry
  lists tools one line each and opens a tool's signature only when selected.
  The registry reads the `pellier.tools` table; it should show the current
  `search_products` and `check_inventory` names. If it does not, re-run
  `scripts/seed_tool_registry.py` against that cluster. A fresh bootstrap
  seeds the current names.
- In the Evidence ledger the round node beside each row marks the event's
  status, not its kind: dashed ring pending, check succeeded, shield denied,
  cross failed. The kind is the small label next to it.
- Every Observatory view sits on the same warm paper as the Storefront and the
  Operator desk. The cooler grey backdrop behind the Proof Board and the
  reference views is gone; the instrument feel comes from the mono type and
  the receipts, not from a different colour.
  Lab labels read "Lab 1 · Build a PostgreSQL-Grounded Agent" and so on, with
  no dashes; small Observatory labels are never below 11px.
- The Observatory and the Operator desk now resolve to the same type scale as
  the Storefront: one display face for page and section titles, weight capped
  at 600, and one control family, where a pill is something you press and a
  4px chip is something you read. If a surface suddenly looks louder or
  smaller than its neighbour, that is a regression, not a house style.
- On the Proof Board, the managed receipt names the **executed revision**.
  Point at it in Lab 3: it is the difference between "the service answered"
  and "the service ran the code I just packaged".

The required hands-on work remains deliberately concrete:

- **Workshop workspace** is where participants inspect and make one bounded
  change.
- **PostgreSQL** is where participants query, measure, and prove Aurora
  behavior.
- **AgentCore** is where participants inspect managed Runtime, Gateway, Memory,
  and policy evidence.

The UI helps participants inspect. PostgreSQL and AgentCore evidence let them
prove. Avoid turning this into a generic API-call workshop.

### Participant delivery model

Workshop Studio exposes one Pellier link for the Storefront, Operator, and
Observatory. Development setup is an implementation detail and should not
appear in the room's instructions.

## The four-lab journey

Every lab carries two bounded builds, a and b, anchored to one person. The
difficulty climbs across the four: Lab 1 completes a capability, Lab 2 decides
what "relevant" means and measures it, Lab 3 puts the participant's own work on
the managed control plane, Lab 4 governs a consequential action and proves the
outcome four separate ways.

At a glance, which is the whole shape of the two hours on one screen:

| Lab | Person | Build a | Build b | Budget |
|---|---|---|---|---|
| **Lab 1 · Build a PostgreSQL-Grounded Agent** | Marco | Inventory Agent definition | the `check_inventory` body | 20 min |
| **Lab 2 · Build and Measure PostgreSQL Hybrid Retrieval** | Anna | the RRF fusion expression | the labelled golden set | 20 min |
| **Lab 3 · Deploy and Operate the Managed Agent Path** | Theo | publish the Gateway tool | reconcile the Runtime catalogue, then deploy | 30 min |
| **Lab 4 · Govern and Prove Agent Actions** | Jessica | the Cedar identity rule | the keyed absence query | 25 min |

Plus a 10-minute opening talk, 7 minutes of orientation, and 5 to close. The
budgets are repeated beside the labs here on purpose: a table that names the
work without naming its cost invites a room to plan four equal labs, and they
are not four equal labs. The reasoning behind 20/20/30/25 is under Time box
below.

What each lab asks of the participant, and what they leave with:

| Lab | Participant moment | What they build or prove | Takeaway |
|---|---|---|---|
| **Lab 1 · Build**<br>**Build a PostgreSQL-Grounded Agent** | Marco needs a live availability answer. | Complete the Inventory Agent's warehouse capability, then reconcile the response, warehouse rows, and execution evidence in PostgreSQL. | An agent answer is grounded only when it can be checked against the system of record and an execution receipt. |
| **Lab 2 · Build & Measure**<br>**Build and Measure PostgreSQL Hybrid Retrieval** | Anna narrows a morning-ritual gift to two in-stock options under $100, then chooses from that same shortlist. | **2a** Restore the hybrid-ranking calculation. **2b** Label the rows that count as relevant, then read the micro-eval that divides by them. Prove the returned products met price and stock constraints. | Retrieval quality is a measured tradeoff, and the measurement rests on a labeling judgment a person makes. Relevance can rank results; PostgreSQL enforces eligibility. |
| **Lab 3 · Deploy & Operate**<br>**Deploy and Operate the Managed Agent Path** | Theo's return request reaches a support specialist the managed Gateway cannot yet serve. | **3a** Publish the customer-scoped read the specialist needs, and keep the money movement deferred. **3b** Reconcile what the Runtime asks the Gateway for, and bind that read to the authenticated caller. Deploy, then verify Memory beyond the application process and confirm the build fingerprint on the managed receipt is their own. | Deploying is not the proof. The published catalogue, the executed revision, managed Memory, and the trace each prove a different part of the path, and a successful answer proves none of them. |
| **Lab 4 · Govern**<br>**Govern and Prove Agent Actions** | Jessica's return action is allowed only for Jessica; Marco is the denied control and an unordered piece is the refused one. | **4a** Define the identity-to-customer Cedar rule, then run four attempts: denied, refused, allowed, replayed. **4b** Author the keyed absence query that proves the denied call left no execution, write, or ledger row, beside a positive control. Prove policy, execution, durable-effect, and database-enforcement outcomes separately, then open Jessica's case in Operator and stop before approval. | Authentication, policy authorization, execution, database enforcement, staff access, durable effects, and human approval are separate controls and separate facts. Observability is how you find that out after the fact. |

### Time box

Two speakers open for ten minutes. The remaining 110 are hands-on, staffed by
table leads on the floor, and the room is self-paced, so these are budgets
rather than a schedule.

| Minutes | Segment | Budget | Why it costs what it costs |
|---|---|---|---|
| 0-10 | Opening talk | 10 min | Two speakers. The retail problem and the four questions the workshop separates. |
| 10-17 | Orientation and `workshop-start` | 7 min | One run id, the two surfaces, one Runtime turn. No architecture tour. |
| 17-37 | **Lab 1 · Marco** | 20 min | Two small edits, one file each, and the first receipt. Most of the cost is the first read of an unfamiliar tree. |
| 37-57 | **Lab 2 · Anna** | 20 min | One SQL expression, one labeling decision, and the comparison. Both builds are short; reading the measurement is the work. |
| 57-87 | **Lab 3 · Theo** | 30 min | Two edits plus a real deploy. The deploy has wall clock nobody can compress, so this lab gets the extra ten minutes rather than borrowing them. |
| 87-112 | **Lab 4 · Jessica** | 25 min | A Cedar rule, four attempts, the keyed absence query, and the RLS proof. Four outcomes to establish, and establishing them separately is the point. |
| 112-117 | Close | 5 min | What travels off the box. |

Three minutes are unallocated. They are the room's only float, and a single
slow deploy will use them.

Two labs at 20, one at 30 and one at 25 is deliberate. Labs 1 and 2 are bounded
edits with fast feedback. Lab 3 waits on a deploy nobody can speed up. Lab 4
waits on policy evaluation, and a room that has not been given time for it will
skip the proof and keep the answer.

The Runtime moved into orientation for the same reason. A participant used to
spend the first fifty minutes without seeing managed execution at all;
`workshop-start` now sends one turn to the deployed Runtime and prints the build
id that answered, which is the id Lab 3's own deploy has to change.

If the room is running behind, cut Lab 4's Operator turn and the close, in that
order. Never cut a Prove beat: a lab without its proof teaches that the demo
worked.

### What the room is made of

Counts a speaker will be asked for, all read from the code rather than from an
earlier version of this brief.

| Thing | Count | Where it lives |
|---|---|---|
| Labs, each with two bounded builds | 4 labs, 8 builds | `tests/test_workshop_marker_contract.py` is the inventory |
| Workflows on the participant path | 2 | Storefront dispatcher; Operator Concierge graph (`services/operator_graph.py`) |
| Specialist agents | 5 | `agents/`: search, recommendation, pricing, inventory, support |
| Tools in the application process | 17 | `services/agent_tools.py` |
| Tool schemas defined for the Gateway | 17 | `scripts/deploy/gateway_tool_schemas.py` |
| Published on the Gateway at the start | 15 | two deferred by decision: `get_ticket_history`, `restock_inventory` |
| Published after Lab 3a | 16 | Lab 3a publishes `get_ticket_history`; `restock_inventory` stays deferred |
| Cedar policy statements | 6 → 7 → 8 | 6 at baseline, 7 once 3a publishes the read, 8 once 4a adds the identity rule |
| AgentCore Memory strategies | 1 | `USER_PREFERENCE`, which is what makes extracted preferences real |
| Runtime skills available to specialists | 5 | `skills/*/SKILL.md` |
| Shopper identities | 4 | Cognito users marco, anna, theo, jessica |
| Staff identity | 1 | Cognito user `operator`, in the `pellier-operators` group |
| Products seeded | 60 curated + 940 archive | `scripts/seed_pellier_catalog.py`; the archive rows are distractors retrieval has to reject |
| Warehouses | 3 | BK-01 Brooklyn, ATX-02 Austin, PDX-01 Portland |

Two counts people reliably get wrong. **Seventeen tools exist and fifteen are
published**, because describing a tool and exposing it are separate decisions,
and Lab 3a is where a participant makes one. **`issue_credit` is published and
staff-only**: the operator desk executes an approved credit through the Gateway
with the operator's own token, its only permit requires the staff scope claim,
and no shopper-facing specialist may bind it.

A third count is the one that surprises people, so say it before someone finds
it: **published is not visible**. Gateway evaluates Cedar on tool discovery, so
an MCP listing returns only the tools that caller could be permitted to invoke.
Measured live on 2026-09-10: a shopper token saw 14 of 15, missing
`issue_credit`; a staff token with no customer mapping saw 13, gaining
`issue_credit` and losing the two owner-scoped reads. The published catalogue
is one number, and what a given token can discover is another.

Two other Strands orchestration patterns ship in the repository, agents-as-tools
and a `GraphBuilder` graph, as reference implementations. They are not on the
participant path and should not be counted as workflows the room runs.

### Exact participant exercises

Every lab follows the same five-beat rhythm, and the beats are named on the
page so nobody has to infer where they are:

**Predict** what the system will do, and say it out loud before running
anything. Thirty seconds, not a discussion. **Change** exactly one bounded
thing; each lab is two bounded edits and no more. **Run** the named person's
scenario. **Prove** the result from a durable row, not from the answer text.
**Explain** in one sentence which layer supplied the fact, so the pattern
travels off this box.

Predict and Explain are deliberately short. A table lead who lets either run
long is spending Prove's minutes, and Prove is the beat that cannot be cut.

Predict is not a warm-up. A participant who has committed to an expected
outcome learns something from being wrong; one who runs first and reads the
result afterwards learns that the demo worked. Bootstrap restores the starter
gaps; a solution file is a timed recovery path, never a substitute for the
exercise or its proof.

Before Lab 1, each participant runs `workshop-start`. It mints one run id,
records it in `pellier.workshop_runs`, and puts it in front of the service, so
every evidence row the next two hours produce carries that id. That is what
lets `receipt` and `doctor` answer questions about *their* run rather than
about whatever the cluster saw most recently. If a lab will not start, the
first move is `doctor --lab N --phase prerequisites`, which names the unmet
source or configuration requirement. After the lab journey, `--phase proof`
checks the durable outcomes. Lab 4 checks the direct Gateway chain; the
Operator investigation stops at the pending human checkpoint.

#### Lab 1 - Marco grounds a warehouse answer

- **Predict.** Marco's warehouse turn currently returns the quiet
  "Still being set up" card with the reference code `workshop_build_required`.
  Ask the room what the answer should contain once the tool exists, and what
  would have to be true in the database for it to be trustworthy.
- **Change.** Complete the deliberately unfinished inventory capability: the
  Inventory Agent definition and the `check_inventory` body, inside their
  marker blocks and nowhere else.
- **Run.** Replay Marco's three turns: linen for Goa, the pairing question,
  then the Brooklyn fulfillment question.
- **Prove.** Reconcile the answer against Aurora warehouse rows and the
  newest execution row in `pellier.tool_audit`. The receipt line is
  `01.execution_row`. An answer that reads correct and leaves no row has
  proved nothing. Then run the supplied two-case check: a piece the shop does
  not carry must come back `not_found`, and the sold-out Quilted Silk Vest
  must come back `success` with zero units. Unknown and zero are different
  answers, and the tool body must never turn one into the other.
- **Explain.** An agent answer is grounded only when it can be checked against
  the system of record and an execution receipt. The same shape applies to any
  entitlement, claim-status, or capacity lookup.

#### Lab 2 - Anna measures hybrid retrieval

- **Predict.** The retrieval comparison runs one fixed request, "A housewarming
  gift under $100 that is currently in stock." That is not one of Anna's three
  storefront turns above. It is the single request the comparison surface, the
  golden journey, and the eval harness golden set all measure, and it is what
  her memory chip fires when a participant clicks instead of typing. Before
  running it, ask which strategy will win and why, and which constraint ranking
  cannot enforce.
- **Change (2a).** Restore the deliberately incomplete hybrid-ranking
  calculation.
- **Change (2b).** Label the rows that count as relevant for that request.
  The frozen labels are the reference judgments: coverage divides by the label
  count, precision by the returned count, and MRR is a rank. With no labels
  all three read 0.0 for want of labels, and the surface says so rather than
  showing bare zeros. Relevance needs a stated rule, and this is the rule: the
  in-stock Home Decor pieces tagged both `gift` and `home` at or under $100.
  Price and stock are eligibility, which SQL already enforces; the tags are
  the judgment. Derive the rows in the Code Editor; the exercise carries the
  psql.
- **Run.** Replay Anna's gift thread in the storefront, then compare the four
  retrieval paths on that one fixed request. Comparing four strategies is only
  meaningful when all four answer the same question, which is why the wording is
  fixed.
- **Prove.** Read the retrieval receipt: vector ranks, lexical ranks, and their
  fusion all populated, and every returned product inside the price and stock
  constraints. The receipt line is `02.hybrid_receipt`. Then read the rerank
  pool micro-eval, which now has labels: pool 20 and pool 3 separate. Freeze
  the labels, choose a pool, and check the choice on the provided held-out
  cases: a Beauty slice with its own labels, an exclusion, a tight budget, a
  sold-out piece that must not come back, and a request with no valid result.
  Write one sentence on which pool you would ship; "more evidence needed" is
  a valid answer.
- **Explain.** Retrieval quality is a measured tradeoff, and every metric is a
  ratio against a labeling somebody chose. Relevance can rank results;
  PostgreSQL enforces eligibility. A reranker cannot recover a candidate that
  retrieval never surfaced, which is what candidate coverage measures.

#### Lab 3 - Theo lands the build on the managed path

- **Predict.** Theo's third turn is a return request, which routes to the
  support specialist. Ask what the managed rail will do with it before running
  it. Then ask what a successful managed answer would and would not prove: it
  does not prove the participant's revision ran, because the invoke response
  carries no version and `qualifier=DEFAULT` is an alias.
- **Change (3a).** The support specialist reads a customer's past tickets
  before answering, and the Gateway does not publish that tool. Publish
  `get_ticket_history`; leave `restock_inventory` deferred. `issue_credit` is
  already published, for staff only: a read scoped to one customer is safe to
  hand a shopper-facing specialist, and money movement belongs to the operator
  review desk, which executes it with the operator's own token.
- **Change (3b).** Reconcile the Runtime side. The managed dispatcher asks the
  Gateway for exactly the tools it names and raises `Gateway is missing support
  tools` when one is absent, so the two catalogues have to agree. Then bind the
  new read to the authenticated caller, or the model chooses whose tickets to
  read.
- **Run.** Deploy, then use Theo's three turns as a signed-in caller, with 0,
  then 2, then 4 prior messages.
- **Prove.** Theo's third turn now completes on the managed rail. Confirm the
  build fingerprint on the managed receipt reads **This checkout**: the file
  edited in 3b is packaged into the Runtime, so the deployed digest changed and
  that is what proves the participant's own build answered. Verify Memory
  beyond the application process, and correlate the thread with Runtime,
  Gateway, and PostgreSQL evidence.
- **Explain.** Deploying is not the proof. A published tool contract, an
  executed revision, managed Memory, and a trace each prove a different part of
  the path. The trace contract runs here too, over the trace this lab produced.
  The same split applies wherever a control plane and a data plane are deployed
  separately.

#### Lab 4 - Jessica governs a consequential action

- **Predict.** Four attempts at one return: another shopper, the owner for a
  piece she never ordered, the owner, and the owner again. Ask which will be
  denied by policy, which will run and be refused by the business rule, which
  will commit, and what the replay will not change.
- **Change (4a).** Complete the fail-closed identity-to-customer rule in the
  Cedar policy. It is deliberately participant-authored and exercises the
  condition without weakening the shipped row-level-security backstop.
- **Change (4b).** Author the keyed absence query: for the idempotency key the
  denied call carried, count the execution, claimed-write, finalized-write and
  ledger rows, and beside them the finalized writes for the allowed key. The
  counts start as `NULL`, which the worksheet refuses. The control is the
  exercise: four zeros prove nothing until the same search finds the one write
  the allowed call made, and finds exactly one, which is the replay restated.
- **Run.** Exercise the four attempts, run your absence query with their keys,
  then open Jessica's case in Operator, read the proposal, and stop before
  approval. The OpenTelemetry trace contract runs at the end of Lab 3, beside
  the trace it reads.
- **Prove.** Establish four separate outcomes: the policy decision, the
  execution row (or its keyed absence), the durable write, and the database
  enforcement result. The receipt lines are `04.deny_did_not_execute` beside
  `04.durable_effect`.
- **Explain.** Authentication, policy authorization, execution, database
  enforcement, staff access, durable effects, and human approval are separate
  controls and separate facts. An ALLOW is not an execution receipt, and an
  execution row is not a commit.

Theo's thread and Jessica's return are deliberately different journeys. Theo's
ends at a prepared review with the human decision still pending, which is where
a shopper turn honestly stops. Jessica's is where authorization, database
enforcement, and durable evidence are proved, because there identity is the
only variable that changes between the denied and allowed cases.

The labs form one sequence: ground the answer, measure the retrieval decision
against labels you chose, deploy that work onto the managed path, then govern a
consequential action and prove its outcome from policy, execution, durable
effect, and database enforcement.

## The memory distinction

This is the single point attendees most often leave still conflating, so state it the
same way every time. "The agent has memory" is four systems with four owners, four
lifetimes, and four failure modes. AgentCore Memory holds two of them.

| Substrate | Owner | Keyed by | What it holds |
|---|---|---|---|
| **Working** | AgentCore Memory, short-term | actor **and session** | The session timeline. Raw turns, 30-day event expiry. |
| **Semantic** | AgentCore Memory, long-term | **actor** | Preferences a single `USER_PREFERENCE` strategy extracts, under `/pellier/preferences/{actorId}/`. |
| **Episodic** | **Aurora PostgreSQL** | customer | Orders, returns, events. A system of record queried with SQL, not a recall service. |
| **Procedural** | **The repository** | file path | `skills/*/SKILL.md` and the MCP tool schemas. Reviewable source, changed by pull request. |

`pellier.tool_audit` is deliberately not on that list. It is execution history: which
tool ran, with what arguments, at what latency. Nothing reads it back as context, so it
teaches the agent nothing. Describing aggregates over it as procedural memory was an
earlier model and is wrong.

Short-term and long-term are not the same records with different retention; they have
different keys. End the session and working memory stops growing, while semantic records
are still there tomorrow on a new device. That is why they cannot be collapsed behind one
retention setting.

Pellier's shopper wrapper uses the full authenticated conversation namespace as
both actor and session: `user-{sub}-session-{sid}`. Working and semantic readers
must use that same identity; customer onboarding seeds are not conversation-derived
preferences. A new conversation gets a new actor in this workshop. Sharing learned
preferences across conversations requires a deliberate stable-actor design and
migration, with tests that preserve anonymous and cross-principal isolation.

Lab 3 proves this hands-on, and the workshop appendix carries the full reference with a
symptom-to-substrate table. The reason to be pedantic is operational: each substrate
fails differently, so conflating them produces the wrong fix. A forgotten sentence is a
session-id problem; a wrong order history is a database problem; a misused tool is a pull
request. Commercially, two of these are a managed-service bill, one is your database, and
one is your git history.

## Architecture and proof boundaries

Keep the explanation at this level unless someone asks to go deeper:

- A shopper request moves from the Storefront, through one bounded specialist,
  to an Aurora-backed fact or retrieval path, then to a response with durable
  evidence.
- A customer-authenticated consequential request passes through Gateway policy,
  bounded tool execution, and Aurora row-level security before any durable
  effect can occur.
- A staff investigation in Operator requires authorized staff access, moves
  from Case Investigator to Resolution Planner, and ends at a human checkpoint
  without execution in the required participant path. If a reviewer acts
  later, the decision and any execution receipt are projected as typed
  follow-up evidence after the shopper receipt.
- Observatory reconstructs the path from receipts, database evidence, and
  traces.

This is not one long-running super-agent. Storefront orchestration, Operator
investigation, human decision, policy authorization, database execution, and
Observatory reconstruction are deliberately separate boundaries. That is why
the room can ask, "What happened here?" and receive an answer that is more
precise than "the agent did it."

## Suggested flow for speakers

1. **Story lead:** Open in the storefront. Establish the retail problem and
   choose the persona that will anchor the next lab.
2. **Lab lead:** Move to the workshop workspace. Keep the build moment small.
   Participants can work manually or with the assisted pane, open hints in
   order, and use the solution only as a recovery path. Both paths converge on
   the same evidence.
3. **Platform lead:** Use the Workbench and Observatory to make the resulting
   routing, Memory, tool, database, and trace evidence readable.
4. **Governance lead:** Run the four-case identity matrix, then the database
   read/write proof. Make authorization, execution, durable effect, and
   database enforcement separate claims.
5. **Operator lead:** Open Jessica's client record from the separate staff
   account and run the three guided turns. Show Case Investigator before
   Resolution Planner, then stop at the human checkpoint. Do not call the
   direct Gateway invocation a human-approved action.
6. **Close:** Run `workshop/close-architecture-defense.md`. Do not recap.
   Put an authorized-but-uncommitted evidence set on screen, ask the room
   whether the return happened, and let them answer before you do. Then have
   participants run `receipt` and answer the four questions from their own
   evidence — the receipt lines they point at are `01.execution_row`,
   `02.hybrid_receipt`, the managed receipt's build fingerprint, and
   `04.deny_did_not_execute` beside `04.durable_effect`. Eight minutes, and
   it lands the separation the whole session was built on: authorization,
   execution, and commit are three transitions, each needing its own proof.
   The close doc also carries a live query for the contradiction; an empty
   result is a finding worth saying out loud, not a failed demo.

## Speaker anchors

Use these lines to keep the story consistent:

- "Pellier starts with a customer outcome, then earns the right to make a
  technical claim."
- "The UI helps us inspect; durable evidence lets us prove."
- "A retrieval result can be relevant without being eligible."
- "Memory is four systems, not one. Two live in AgentCore, one is Aurora, and one is
  the repository. `tool_audit` is none of them."
- "An allow decision is not an execution receipt, and a deny decision needs named
  non-execution evidence."
- "The shopper turn ends before the staff review begins. The ledger shows that
  handoff without collapsing the two into one action."
- "The database is not a passive store behind the agent. It independently
  enforces the final boundary."

Avoid saying that a configured managed service was necessarily invoked on every
Storefront turn. Runtime, Gateway, Memory, policy, and telemetry must be shown
with their own evidence in the managed-path labs.

## What staff should take away

The product is a connected teaching system, not four unrelated demos:

- The **Storefront** gives the architecture a human reason to exist.
- The **labs** add a real build or authoring moment before asking for proof.
- **PostgreSQL** makes data truth, retrieval behavior, and enforcement
  inspectable.
- **AgentCore** makes managed execution, tool exposure, Memory, and policy
  tangible.
- **Observatory** makes the invisible path legible without replacing the
  evidence.
- **Operator** makes clear that meaningful actions require a durable human and
  governance boundary.

The core participant outcome is not simply "I used an agent." It is: "I can
explain which layer supplied the fact, made the decision, enforced the
constraint, and recorded the evidence."

## Before the session

- Confirm the Workshop Studio source pin and the intended governed revision.
- Rehearse the exact four-lab path with the participant environment.
- Verify that PostgreSQL access, AgentCore access, and the required credentials
  are ready.
- Choose speaker ownership for the Storefront story, labs, managed path, and
  governance.
- Rehearse Jessica's Operator close. It is one turn on the required path, and it
  must stop at the human checkpoint after preparing, but without approving or
  executing, a business action.
- Run `receipt` on the rehearsal box after the four labs. It reports each
  boundary as PROVED, NOT YET, or UNCHECKED, and the third is the one to read
  carefully: UNCHECKED means the query could not run, not that the step
  failed. It is also the fastest table-lead diagnostic during the session.
- After deploying in Lab 3, confirm the Proof Board's executed revision reads
  **This checkout**. **Older deployment** means the deploy did not land and the
  managed answers are coming from a previous package.
- Rehearsing locally: the dev script's tunnel to Aurora expires after about an
  hour. If the storefront starts stalling for thirty seconds on every request,
  restart the dev script before blaming the app.

The run-of-show is still being polished. This brief is the shared map for the
team: customer experience first, a meaningful build moment in each lab,
evidence over assertion, and governance that holds at more than one layer.


## Facilitator extensions: predict, inspect, vary

Offer one optional variation per lab after the required proof. The workbench exposes the same prediction and evidence checklist next to each journey. Keep Anna’s benchmark query and relevance labels fixed when comparing retrieval metrics. Natural conversation prompts are a separate exercise.

- **Marco:** Compare “Hadley Linen Shirt” with “A lightweight linen button-up for humid afternoons.” Inspect lexical contribution, semantic candidates, and rank changes. Similar intent does not require identical ordering.
- **Anna:** Keep the same recipient in mind, but make the budget under $70. Verify that the new ceiling replaces the previous one while recipient context persists. Inspect the exact boundary predicate; the workshop benchmark uses an inclusive price ceiling.
- **Theo:** I prefer matte glazes and compact pieces for my breakfast tray. Verify the new preference in a Memory event using the guide’s independent process. Then ask “Which pairing suits my routine?” without repeating it. Distinguish prompt history, Aurora history, and managed Memory; actors are scoped to this conversation.
- **Jessica:** Have we handled something similar before? Show the outcome and explain what must be checked again. Use prior-resolution recall as context. Previous receipts grant no current authority; an empty result is valid. Resolve conflicting support notes against the order and return rows in Aurora.

For an advanced extension, use the existing controlled identity proof to repeat the same protected request with an authorized and mismatched principal. Compare policy, tool execution, durable effect, and RLS independently. Do not use a selected persona as authentication. Ask participants to paraphrase a required prompt and check routing and constraints outside the scripted wording. For Jessica, reconcile a conflicting source note against the Aurora order and return rows before proposing any remedy.
