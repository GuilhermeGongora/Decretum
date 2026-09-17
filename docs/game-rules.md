# Game rules — interpretations and simplifications

`Decretum_GDD_v1.0.md` is the source of truth for game design. This file records every place where
the implementation had to interpret, simplify or fill a gap in the GDD (GDD §31, item 8). Each entry
names the GDD section, the decision taken and where it lives in the code.

Items marked **provisional** are content or balance values written during implementation that the
game designer should review.

## Conflicts inside the GDD or with the engineering rules

| #   | GDD                   | Conflict                                                                                                                                  | Decision                                                                                                                                                                                                 |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | §12.1 × §12.4         | The client sends only `{ "choice" }`, but a second request on the same card cannot be told apart from a decision on the next month.       | `POST /decisions` accepts an optional `turn`. It carries no effect; a mismatch with the current month returns **409 `TURN_ALREADY_DECIDED`**. The UI always sends it. Unknown fields are rejected (400). |
| 2   | §8.5 × §18.3          | "Critical" is 1–14 / 86–99 in §8.5 and 1–18 / 82–99 in §18.3.                                                                             | §8.5 bands drive the UI alerts (`getMeterBand`). §18.3 ranges drive eligibility of cards 28–30 (`anyMeters` in `src/content/cards.js`).                                                                  |
| 3   | §18.3 card 30 × §18.4 | Right choice: "+8 if People low, +4 if high" and "−8 if Institutions low, +4 if high" fit neither `toward_center` nor `away_from_center`. | Added a third generic operation, `by_side { meter, below, above }` (`src/domain/effects.js`). It is data, not a formula; `toward_center` and `away_from_center` are implemented exactly as in §18.4.     |
| 4   | §13.4 × §18.3         | Meter conditions are an AND of ranges, but cards 28–30 need "pillar low **or** high" and card 30 needs "People **or** Institutions".      | Added `conditions.anyMeters`: a list of ranges where at least one must match. `conditions.meters` keeps the §13.4 semantics.                                                                             |
| 5   | §14.2 × §29.2         | "Quatro Anos Depois" is called a special card, but every card must have two choices.                                                      | It is the `mandate_completed` ending (title and text in `src/content/endings.js`). The "mandatory milestone card" priority of §11.1 has no content in the MVP and was not implemented.                   |
| 6   | §8.7 × §18            | "A common choice changes 2–3 pillars with total magnitude 8–18", but most GDD cards change 4 pillars and some exceed 18.                  | The GDD numbers were kept unchanged. The guideline is reported as **warnings** by the content validator (35 warnings, printed by `npm run db:seed`), never as errors.                                    |
| 7   | §16.4                 | `sovereign_debt_crisis` is listed as a legacy of the 30 cards, but no card sets it.                                                       | Not included in the flag catalog, since nothing could produce it.                                                                                                                                        |
| 8   | §18.2 card 24         | "Removes one causing flag" does not say which one.                                                                                        | The left choice removes all three causing flags. The card is unique and those flags only enable this card, so the outcome is equivalent.                                                                 |

## Gaps filled in content (provisional)

- **Result texts**: the GDD provides consequence texts only for card 1 (§18.1) and card 2 (§10.2
  example). The other 56 texts in `src/content/cards.js` were written to match the tone of §4.4 and the
  editorial rules of §10.3.
- **Chained cards** 21, 23 and 26 have no weight or cooldown: they use `type: "chained"`, weight 0 and
  are never drawn; they only appear when scheduled.
- **Critical-state cards** 28–30 have no weight or cooldown: weight 12, cooldown 30, unique per game,
  `type: "crisis"` (shown with a "Crise" badge).
- **Card 2**: the right choice uses `expiresAfterTurns: 8` for `teachers_strike_active`, from the §10.2
  example; §18.1 does not repeat it.
- **Categories and tags** of cards 21–30 were assigned from their theme.
- **Legacy flags** (§16.2 requires modifiers, §16.4 lists the flags):

  | Flag                         | legacyPriority | successorEffects (Povo / Mercado / Congresso / Instituições) |
  | ---------------------------- | -------------: | ------------------------------------------------------------ |
  | `tax_reform_approved`        |             50 | +1 / +4 / −3 / +2                                            |
  | `constitutional_precedent`   |             40 | +1 / −2 / −2 / +4                                            |
  | `international_green_treaty` |             30 | +2 / −2 / −1 / +3                                            |
  | `national_data_registry`     |             20 | 0 / +2 / +1 / −4                                             |
  | `strategic_port_concession`  |             10 | −1 / +4 / +1 / −2                                            |

  Values follow the direction of the originating choice at roughly half its magnitude.

- **Flag labels** (narrative text shown in the chronicle) were written for every flag.
- **Authored consequences** (§10.3 has none): both choices of all 30 cards carry a newspaper
  `headline` (45–110 characters) and the speaker's `reaction` (60–160 characters), written during
  development in `src/content/cards.js`. They are deterministic content, never generated at runtime,
  and follow each choice's effects, flags and later chains. The fields are optional in the validator
  (missing ones only warn) so older content still loads with the compact consequence; a content test
  requires them for every active card.

## Country and setting

- The GDD §4 setting (República de Aurória, a fictional country) was replaced by **Brazil**, following
  the playbook §3.1 and §3.3: real countries and institutions, fictional people. The 30 cards, the flag
  labels and one ending text had their proper nouns localized — Assembleia → Congresso/Câmara, Tribunal
  da Carta → Supremo Tribunal Federal, Banco de Aurória → Banco Central, províncias → estados, Forças
  de Defesa → Forças Armadas, Aurória → Brasil. **No mechanic changed**: slugs, effects, conditions,
  flags and schedules are untouched. "Carta" survives where it means the Constitution, which reads
  naturally in Brazilian Portuguese.
- Decisions recorded before the change keep the old wording: snapshots are immutable and the chronicle
  shows what the player actually read.
- Countries are data in `src/content/countries/`; Brazil is the only playable pack and the United
  States is announced as in development. See [countries.md](countries.md) and
  [ADR 0003](adr/0003-multi-country.md).
- **Provisional**: every institutional label in the Brazilian pack (ministries, impeachment stage
  names, electorate size, base share and turnout) was written during implementation and should be
  reviewed by the game designer. The impeachment stages carry no rule yet.

## Electoral prologue

- A government may be opened through a campaign: country → candidate → four decisions → election. It
  is optional; an empty `POST /api/v1/games` still opens a Brazilian government with every pillar at 50
  (GDD §7.2).
- `src/domain/election.js` is pure and uses **no randomness**, so the same campaign always produces the
  same election. The player always wins in this version; the campaign decides the margin and the
  opening position.
- Opening pillars are clamped to **40–60**, the successor rule from GDD §7.2, so no campaign can start
  a government already in collapse.
- Candidate traits and campaign choices set real flags at month 1 (`origin_*`, `style_*`, `pledge_*`,
  `campaign_*`), which cards may condition on later.
- The candidate and the election result are stored as immutable snapshots on `games`; the institutional
  profile is resolved from `country_code` at read time and never copied per government.
- **Abandoning a mandate is a local action only.** The database has no `abandoned` status and no way to
  list a player's governments, so "Abandonar mandato" just stops this browser from reopening the
  government: the row, its decisions and its chronicle stay untouched. The confirmation says exactly
  that. Persisting the state properly would need a new migration and a government list, which this
  delivery deliberately did not improvise.
- **Known gap**: creating a government is not idempotent. If the response is lost after the server
  committed, the campaign can be counted again and leave an orphan government behind (the client keeps
  the campaign and offers another attempt). The same was already true of `POST /api/v1/games` before
  this phase; a request key would be the fix and is not implemented.

## Characters

- The GDD §17 cast was revised to match the approved character bible and artwork:
  - Helena Arcos → **Helena Vasque**, Ministra-chefe da Casa Civil.
  - Raul Serpa → **Raul Mendonça**, Líder da coalizão.
  - The President of the Tribunal da Carta (GDD: Lívia Ornelas) is **Tomás Azevedo**
    (`tomas-azevedo`). He speaks `national_data_registry` and `contract_investigation`.
  - **Lívia Nogueira** (`livia-nogueira`) is the Ministra da Economia and appears only in economic
    cards: `inheritance_tax` (previously Helena) and `interest_rate_pressure` (previously Caio Ferraz,
    who keeps the Fazenda cards). Her reactions in `inheritance_tax` were rewritten for the new role.
  - **Tomás Gade** (Federação Industrial) is a different person and was not changed.
- Every character has a political `sphere` (a pillar key). Values other than the two set by the bible
  (Lívia: market, Tomás Azevedo: institutions) are **provisional**.
- The validator rejects two ids with the same display name; a test checks that each id speaks with a
  single name and role in every card.
- Characters live in one registry (`src/content/characters.js`) keyed by stable kebab-case ids
  (`helena-vasque`, `livia-nogueira`, `raul-mendonca`, …). Cards reference ids; the display name is
  never a technical key.
- Decision snapshots keep the speaker `id`, name and title shown at the time. Decisions recorded before
  the rename keep the old names and show initials instead of a portrait.

## Rule interpretations

### Turns and effects

- A government's `turn` is the month waiting for a decision. After a collapse or completion it stays
  at the month that ended the government, so months survived = number of decisions.
- Effect operations are evaluated on the pillar values **before** the decision; all deltas are then
  applied simultaneously (§8.6).
- Collapse is evaluated before completion: a collapse in month 48 ends the government (`ended`), it is
  not a completed mandate.

### Flags

- A flag is active when it exists and its value is not `false`/`null`. `allFlags`, `anyFlags` and
  `noneFlags` compare activity only; comparing specific values was not needed by any card.
- `expiresAfterTurns: n` set in month `t` gives `expiresAtTurn = t + n`, removed before the card of
  that month is selected (§13.3).
- Within one choice, removals are applied before sets.

### Card selection

- Order: due scheduled card → weighted draw → fallback (§11.1, §11.5).
- A due scheduled card re-checks active state, role, conditions and uniqueness. If it fails, the event
  is `cancelled` and selection continues. Scheduled cards ignore cooldown and the previous-card rule.
- Only one card is shown per month; other due events stay `pending` for the following months.
- Fallback ignores cooldown only, keeps the previous-card ban when more than one card remains, and logs
  `game.card_selection_fallback`. If nothing is eligible even then, `NoEligibleCardError` is raised and
  logged (HTTP 500) — never a silent end.
- Candidates are sorted by slug before the weighted draw so results do not depend on database order.
- Randomness: each government stores a random `rng_seed`; month `t` uses a PRNG derived from
  `(seed, t)` (xmur3 + mulberry32, `src/domain/rng.js`). Tests inject their own generator.
- The first month has no special "moderate" card (§23); the regular draw is used, and every card
  eligible in month 1 is a common card.

### End of government, score and epithet

- Months survived = number of decisions; stability uses the pillar snapshot after each decision.
- Epithet precedence (not defined in §15.2): O Equilibrista → O Governo Breve (ended with fewer than
  12 decisions) → O Sobrevivente (36+ decisions without completing) → highest average pillar.
  Pillar ties use the §12.3 precedence (Instituições, Povo, Congresso, Mercado).
- "Three decisions with the largest impact" = largest sum of absolute deltas; ties favor the earlier
  month.

### Succession

- Only active legacy flags pass on: at most five, by `legacyPriority` descending, then key.
- Inherited flags are permanent in the successor and **not legacy again**, so a legacy passes on for
  one generation unless a card sets it again.
- A government can have only one successor (`409 SUCCESSOR_ALREADY_EXISTS`).
- `start_year` is 1 for the first government and `previous.start_year + ceil(months / 12)` for a
  successor. The UI calendar shows the mandate year (§7.1), not `start_year`.

### Constitutional procedures (impeachment)

The GDD has no removal procedure; this is the playbook §5 chain, implemented for Brazil only.

- **It is not a fifth pillar.** A procedure is a row in `political_procedures` with its own stage,
  numbers and timeline, running next to the card loop. A partial unique index
  (`political_procedures_one_active`) allows one active procedure of a type per government.
- **The numbers belong to the country pack**, never to the engine: 513 seats and 342 to authorize,
  81 seats with 41 to open the trial and 54 to convict, 180 days of suspension read as six turns.
  `src/domain/procedure.js` receives the pack as an argument and would count a different country's
  thresholds unchanged.
- **Opening is earned, never rolled.** `evaluateGrounds` needs at least two documented grounds (each
  evidenced by flags the country lists), evidence ≥ 45, a hostile enough Congress (viability ≥ 50)
  and turn ≥ 6. One flag or one low pillar is never enough. There is no randomness anywhere.
- **Every stage change is whitelisted** in `TRANSITIONS`; anything else throws. A card may push the
  numbers and ask for the next step, but never says which stage that step reaches: the three voting
  stages are counted against the pack's thresholds, and the rest have a single successor.
- **`expired` is the engine's alone.** It is the only resolution accepted from any stage, because it
  belongs to the end of the mandate and to the suspension deadline; the content validator refuses a
  card that tries to use it.
- **A conviction outranks a simultaneous pillar collapse.** The choices that carry a government to
  the Senate usually wreck Congress on the way, so without this `removed_from_office` would be
  unreachable in practice: the chronicle would record a drift out of governability instead of a
  verdict. Removal is seeded as a collapse ending, since the endings table only tells collapse from
  completion.
- **The chain is 10 cards** (`impeachment_*`), all `chained` with weight 0, so they never compete in
  the weighted draw. Each card schedules the next link; the links no card can foresee — the opening,
  the stage a count lands on and the outcomes — are named per stage by `removal.cards` in the pack
  and scheduled by the engine with priority 100. No card slug appears in the engine.
- **Known balance debt**: support saturates. A consistently confrontational government reaches ~96%
  of the Chamber and 100% of the Senate, so the votes come out near-unanimous (492/513, 81/81).
  The outcomes are correct and earned; the margins are not yet plausible. Left for the balancing
  phase, with the pillar cost of the chain cards.

### API

- `GET /api/v1/games/:id/chronicle` was added as the separate chronicle resource suggested by §27.3.
- Malformed or unknown ids return 404. Invalid JSON, a missing choice or unknown fields return 400;
  a choice other than `left`/`right` returns 422.
- Scheduled events are never exposed by the API (§9: future consequences are not revealed).
- Card responses include the resolved delta and trend for both choices. The UI shows arrows by default
  and numbers only with the "Efeitos exatos" setting (§9).
- Card responses never include headlines or reactions, so the outcome of a choice is not revealed
  before it is signed (§9).
- Decision responses include `consequence: { headline, reaction }` for the chosen side, or `null` when
  the card has none. The same snapshot is stored in `decisions.consequence` (nullable JSONB, shape
  checked by the database) in the decision transaction, and the chronicle reads it from there; it is
  never rebuilt from the current card. Decisions recorded before the column existed have `null` and
  show their `resultText`.
- Speakers are returned as `{ id, name, title, initials, portrait, accent }`; `portrait` is
  `{ src, position }` resolved from the registry by id, or `null`.
- Game and decision responses carry `procedure`, or `null` for a government that never faced one.
  It shows the stage with its label, the deadline while suspended, and per house the seats, the
  threshold and **either** a band (`estimate`) before that house votes **or** the confirmed count
  after it. Support, evidence, coalition cohesion and institutional credibility are never exposed:
  they are what the outcome is computed from. Decisions accept only `choice` and `turn`; a body that
  also sends votes, a stage or procedure effects is refused with `400 UNKNOWN_FIELDS`.

### Interface

- Four characters have portraits (WebP in `public/assets/characters/`, original PNGs in
  `docs/design/decretum-v2/source/characters/`); the others, and any image that fails to load, show
  initials. There is no audio in this cut (§21–22).
- The tutorial opens once on the first government and can be reopened from settings (§23).
- **The mandate sits in a painted scene** (`decision`), with its own lighter veil: the artwork is so
  dark that the veils of the onboarding screens would close it to black. Contrast still never depends
  on it — the dossier carries its own paper, and a blocked image leaves the navy fallback.
- **The four pillars are one instrument band**, not four cards: emblem, name and standing on a line,
  the number beside them, and the scale along the foot. This is presentation only — values, names,
  bands, thresholds, the `meter` semantics and the critical states are unchanged. The band gave 84px
  of height back to the stage at 1366×768, which is where the dossier had least room.
- **The dossier follows the pointer through CSS custom properties written once per frame** (`--drag-x`,
  `--drag-rot` on the card; `--drag-progress` on the stage), never through React state: a re-render
  per `pointermove` would rebuild the card, the portrait and both panels to move one element. React
  state changes only when the gesture crosses into a side, which is the only thing the rest of the
  screen needs to know.
- **A decision is signed past 120px of travel**, never before: below it the paper returns and nothing
  is sent. The panel on the side being dragged towards lights with the distance (`--drag-progress`,
  0 to 1) instead of switching on at the threshold, and the opposite one recedes. Neither panel ever
  shows an outcome, a colour of approval or a judgement of the choice.
- Every input — swipe, buttons, ← → and Enter — calls the same decision command, which sends only the
  chosen side and the month. A decision that fails restores the dossier with the choice still
  available; the turn does not advance and no consequence is shown.

## Balance findings (simulator, 2 000 games per policy)

Run with `npm run simulate`. Numbers are for the unchanged GDD baseline.

| Policy       | Completion | Median months | Observation                                      |
| ------------ | ---------: | ------------: | ------------------------------------------------ |
| random       |      40.2% |            42 | Slightly above the §19.1 targets (25–40%, 28–38) |
| alternate    |      43.6% |            45 |                                                  |
| center       |       100% |            48 | Greedy "closest to 50" always wins               |
| favor pillar |         0% |         12–13 | Always ends by that pillar dominating            |

- All eight collapse endings were reached.
- Six common cards (`hospital_queues`, `rural_debt_relief`, `emergency_budget`,
  `flood_infrastructure`, `import_tariffs`, `minimum_wage`) appeared 5 times in some governments;
  §19.1 targets at most 4.
- The cooldown-free fallback was used (413 times across 2 000 centered games): the pool of eligible
  cards runs out late in long governments.
- No dead end occurred.

These are inputs for the balancing phase; no GDD value was changed to address them.
