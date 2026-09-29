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

### Losing the election

The campaign used to elect the player whatever they did; the resolver said so in its own comment.
It no longer does.

- **Winning outright** needs more than the country's `runoffThreshold` in the first round.
- **Otherwise there is a second round**, and what each side consolidates there is the country's
  arithmetic, not the engine's: `runoff.base` is what a campaign that ended the first round exactly
  at `baseShare` carries into it, and `runoff.slope` is how much of every extra point comes across.
  For Brazil that is `49.2 + (share − 44.6) × 0.42`, so the cliff sits near a first round of 46.5.
- **A tie is not a victory.** Election requires more votes than the other side, so a margin of
  exactly zero is a defeat. Deliberate: without a majority nobody is elected.
- **A defeated campaign starts no government.** No row is inserted, no id is saved, there is nothing
  to resume, and the engine returns `meters: null` rather than a set of pillars nobody will govern
  with. The API answers 200 with `{ outcome: "defeated", game: null, candidate, election }` — not a
  201, because nothing was created.
- **Headlines must cover a defeat.** The resolver reads a band for whatever margin comes out, so the
  pack declares negative bands too, and content validation refuses a pack without one. The bands are
  also checked to be in descending order, because `.find()` takes the first one reached and a band
  out of order could never be read.
- **Refusing every deal loses.** The clean campaign — austerity, no coalition, no dossier, closing
  with the market — lands at 45.6 and is beaten in the runoff. Nobody is owed an election for having
  clean hands, which is the mirror of the impeachment rule that governing well protects you.
- On screen the count is shown in full either way: the opponent is marked as the elected one, the
  inauguration is replaced by another election, and the player returns to the registration with the
  same draft and a clean campaign.

#### How often a campaign is lost

Of the thirty-two campaigns the Brazilian pack allows, **three are defeats** and twenty are decided
in the first round. Losing takes refusing nearly everything, which is the intended shape and not an
accident — but it is deliberately recorded here, because it is the one number worth revisiting. The
cliff sits at a first round of **46.5**, and `campaign.runoff.base` is the single value that moves
it: lowering it makes defeat commoner without touching a question, an option or a test.

### The debates, and the promises they set

- **Five debates**, the fifth added with the Meio Ambiente portfolio: a road through protected forest
  against the enforcement that would stop it. Licensing buys the frontier states and costs the
  institutions; defending enforcement costs votes outright.
- **The pack decides how many there are.** Tests complete a campaign to whatever length the country
  declares, so a sixth debate needs no test rewritten — only the arithmetic re-measured.
- **Headlines run in eight descending bands**, from a landslide down to a wide defeat. The resolver
  takes the first band the margin reaches, so the order is enforced by content validation.
- **A promise is called in.** The candidate's platform sets one of four pledges during the campaign;
  four cards hold the government to the one it made, and each reaches only the government that made
  it. Keeping the promise costs what it always cost — the fiscal one buys the market and spends the
  people, the social one the reverse. Breaking it records a flag of its own, so the archive
  remembers which promise was abandoned and when.

## Characters

- The GDD §17 cast was revised to match the approved character bible and artwork:
  - Helena Arcos → **Helena Vasque**, Ministra-chefe da Casa Civil.
  - Raul Serpa → **Raul Mendonça**, Líder da coalizão.
  - The President of the Tribunal da Carta (GDD: Lívia Ornelas) is **Tomás Azevedo**
    (`tomas-azevedo`). He speaks `national_data_registry` and `contract_investigation`.
  - **Lívia Nogueira** (`livia-nogueira`) appears only in economic cards: `inheritance_tax`
    (previously Helena) and `interest_rate_pressure` (previously Caio Ferraz). Her reactions in
    `inheritance_tax` were rewritten for the new role.
  - **Tomás Gade** (Federação Industrial) is a different person and was not changed.
  - **Nina Vale → Geovana Sales** (`geovana-sales`), same desk at the Correio Cívico and the same
    four cards. The GDD still carries the old name; this file is where the cast's deviations from it
    are recorded, and decisions signed before the rename keep the name shown at the time.
- The cabinet phase settled the ministerial canon, because two characters claimed economic authority
  and no declared pasta matched either of them:
  - **Lívia Nogueira** is the **Ministra da Fazenda**. "Economia" was a card role, never a portfolio
    the country declares, and it is gone.
  - **Caio Ferraz** held the Fazenda before her and is now **Secretário do Tesouro Nacional**: still
    the fiscal voice of his three cards, and the alternative name for the pasta if it opens.
  - **General Otávio Leme** left the Estado-Maior Conjunto to become **Ministro da Defesa**. This is
    an explicit career change, recorded here: the post is civilian command of the armed forces, and
    accepting it means giving up the command of troops.
  - **Sofia Amaral** is new, and holds the **Meio Ambiente** — a seventh portfolio added with her.
  - **Bruno Tavares**, **Dalva Moreno**, **Renata Pires** and **Hélio Barbosa** are new candidates,
    not ministers. None of them starts in office.
  - **Amira Sol** is the Chanceler, which is a ministerial post in life but not one this pack
    declares, so she holds no seat.
- **Eligibility is declared, never inferred.** Each character says whether they may hold a ministry
  and which. The Court, the Chamber's chair, the opposition, the press, the unions, industry and the
  governors are all ineligible, each with the reason written next to them, so adding somebody to the
  cast never quietly makes them appointable.
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
- **A house is a composition, not a dial.** The first model multiplied the seats by one accumulated
  support number. Being linear, pressure that kept arriving kept converting into seats, and a
  determined government reached 492 of 513 — a near-unanimous chamber, which no real crisis
  produces. `src/domain/legislature.js` replaces it: the country declares the blocs of each house
  (share of the seats, a resting position, and the drivers each one answers to), the engine
  apportions the seats by largest remainder so the total is exact, and each bloc's adherence is a
  logistic curve over the drivers of the moment.
- **Why a logistic curve.** It is the shape defection actually has: almost nothing moves while the
  drivers are low, the middle moves quickly around its tipping point, and the last holdouts cost far
  more than the first. Diminishing returns fall out of the curve instead of being bolted on as a cap,
  and no arbitrary maximum is applied anywhere.
- **Saturation is bounded by composition.** A bloc whose resting position is deeply negative needs
  drivers far beyond the plausible to cross a half, so a loyal base keeps part of the house out of
  reach. With every driver at its worst at once, the Brazilian chamber reaches 456 of 513 (88.9%)
  and the Senate 70 of 81 (86.4%). Unanimity stays possible in principle and unreachable in practice.
- **The accusation weighs more than the hostility.** Evidence is the heaviest weight in every bloc
  but the opposition, so a hostile chamber with nothing to accuse the president of does not reach two
  thirds: at evidence 20 the chamber tops out at 320 of the 342 it needs. The exception, deliberately
  kept, is total collapse — maximum public pressure with the coalition gone can authorise a thin
  file, which is a real political phenomenon; the Senate still refuses to convict on it.
- **Projection and result are different things.** Before a house votes the client receives a band
  built around the count the engine already holds, so the band always contains the result. After the
  vote it receives the confirmed count and no band. The drive in each house, the cohesion, the
  credibility and the weight of the file never leave the server.

### Cabinet

The GDD has no cabinet; this is roadmap phase 1, implemented for Brazil only. It is state, not yet a
screen: there is no appointment, no dismissal as a player decision, and no interface.

- **The ministries belong to the country, and are declared once.** The cabinet is exactly the
  `keyMinistries` the pack lists — six for Brazil. The pack's `cabinet` block only says who starts in
  them, so a portfolio is never named twice and the engine never carries a ministry of its own.
- **A vacant seat is a real state.** The cast has nobody for Justiça or Defesa, so those two chairs
  start empty. An invented minister would be worse than an empty chair, and the engine only knows
  that a seat is held or not.
- **The registry disagrees with the ministries, on purpose.** Lívia Nogueira is Ministra da Economia,
  a role written for the economic cards; Economia is not one of the six declared portfolios, so she
  holds no seat. Caio Ferraz keeps the Fazenda. Every holder is checked against the character
  registry by id at content validation, because a typo would otherwise seat nobody in silence.
- **Loyalty is 0–100**, given per holder by the pack or falling back to its `defaultLoyalty`.
- **A card never names the minister who falls.** It names a strategy — today only `most_exposed` —
  and the engine takes the least loyal minister still in office, breaking a tie by the order the
  country declares its ministries. Same cabinet, same casualty, every time: no randomness.
- **Dismissal runs before the loyalty shift**, so the minister who was handed over does not pay the
  price of his own fall; the ones who stayed and watched it do. In `impeachment_chamber_campaign`,
  "Entregar o ministro" costs the rest of the cabinet 8 points of loyalty.
- **A cabinet with nobody left in it has nobody to hand over.** That is not an error: it is a
  government that has already spent everyone.
- **Once seats are stored, they are the truth.** A declared ministry with no stored seat is vacant,
  never re-seated with the holder it started with — that is what makes a minister who was handed over
  stay gone. A government that stored nothing at all predates the table and takes office with the
  cabinet the country describes, rather than with six empty chairs.
- **Persistence** is `cabinet_seats`, one row per ministry, replaced wholesale inside the same
  transaction as the decision that changed it, the same way the flag set is.

#### Candidates and what they are worth

- **Attributes are declared once.** A candidate carries the person and the numbers (competence,
  loyalty, influence, traits, biography); a holder only names which candidate sits where. A minister
  and whoever could replace him are therefore described in exactly the same place.
- **Traits are keys with labels**, declared by the country. The engine adds up what each one is
  worth and never knows what a "fiscalista" is.
- **Nobody is good at everything.** The competent are less loyal, the loyal are less competent, and
  influence in Congress is paid for somewhere else. Justiça starts vacant with two opposite names
  written for it; Fazenda, Saúde and Educação each have one alternative.
- **Eligibility lives in the character registry**, never in the pack: a country cannot seat the
  Chief Justice by naming him, and content validation refuses it.

#### Appointment, dismissal and replacement

- **One manual change a month**, a number the country owns (`maxActionsPerTurn`). The limit is held
  by the database — a partial unique index over `(game_id, turn)` for manual actions — so two
  requests racing inside the same month cannot both be written.
- **A suspended presidency does not reorganise the government** (`allowActionsWhileSuspended`).
  Changes a constitutional card forces still happen: those are not the Presidency acting, they are
  recorded with `source = 'decision'`, and they fall outside the monthly limit on purpose.
- **The refusals are rules of the state, not of the screen**: a ministry that already has a holder, a
  chair that is already empty, a candidate the registry does not allow, somebody who already holds
  another portfolio, a month that has already passed, a government that has ended.
- **The costs come from the country and from the candidate.** An appointment or a dismissal has a
  declared price in pillars; the new minister's traits are added to it. Losing a minister also costs
  the ones who stayed `dismissalLoyaltyCost` — charged before anybody new sits down, so the newcomer
  never pays for a fall they had no part in.
- **A cabinet change never ends a government.** The effects reach the pillars, but a collapse belongs
  to a month that was decided, with its card, its consequence and its entry in the chronicle.
- **The client sends an intention only**: the operation, the ministry and the candidate. A body
  carrying effects, loyalty, competence, influence, an occupant, flags or a country is refused
  outright rather than ignored.

#### What the player is allowed to see

- **Competence and influence are read plainly; loyalty is not.** The server turns each number into a
  key and the country turns the key into a word. Loyalty has a deliberately vaguer vocabulary
  (`leal`, `incerta`, `vacilante`), because nobody in office is handed a score for how loyal a
  minister is. The raw number never leaves the server.
- **The screen is never offered what the server would refuse**: `availableActions` is empty once the
  month's action is spent, while the Presidency is suspended, and after the government has ended, and
  the candidate list leaves out anyone already holding a portfolio.
- **A change is previewed before it is signed, as directions.** The server answers which way each
  pillar would move and says nothing about how far, so the Presidency reads "Congresso tende a
  reagir negativamente" rather than a forecast. One function computes it, and the same one computes
  what the action actually applies — the preview cannot promise a consequence different from the one
  that lands. A candidate carries two readings, because arriving into an empty chair and arriving
  over a sitting minister do not cost the same.

#### The archive

- Every change is recorded in `cabinet_actions` with its month, its ministry, who left, who arrived
  and where it came from. The chronicle reads them as a third series, next to the decisions and the
  constitutional milestones, and says which ones were a consequence of a decision rather than
  something the president signed.

#### A ministry added later

- Meio Ambiente was declared after the cabinet already existed. A ministry with no stored seat is
  vacant by rule, so the engine showed the new chair as empty immediately; a migration backfills the
  row for governments that already hold a cabinet, touching no existing seat and skipping governments
  that stored none at all — giving one of those a single empty chair would make the engine read
  "seats are stored" and hand it seven vacancies instead of the cabinet its country describes.

### The Supreme Court

The GDD names the court as an institution but never as one that decides. It is modelled here as a
body that rules on the government's own record, and never as an actor the Presidency can influence.

#### The bench

- The court is a composition, not a cast: eleven seats divided into blocs by share, apportioned by
  the same largest-remainder rule the houses use. Only a justice a card makes speak has a face.
- It reuses the legislature's bloc model unchanged — an eleven-seat bench is simply another house —
  and the frozen `DRIVERS` list is not extended for it. A court weighs how documented the matter is
  and how little credit the presidency still has, and only weakly the streets; hostility in
  parliament and a coalition falling apart are the legislature's business, so the bench declares no
  weight for them. Adding court-only drivers would have widened what a _removal_ bloc may weigh, and
  that balance is already calibrated.
- The bloc named for justices seated by earlier governments rests far below its tipping point, so a
  unanimous court stays possible in principle and unreachable in practice.

#### What reaches it, and what a ruling does

- The country declares the matters it can rule on, each evidenced by flags, exactly as the removal
  grounds are. Several open cases read as a heavier record; the heaviest is the one decided.
- A ruling needs an absolute majority of the bench (6 of 11 in Brazil). What it costs is declared by
  the country and applied through the same arithmetic a card's effects go through, so a ruling can
  never move a pillar in a way a decision could not.
- Each matter is decided exactly once, whichever way it goes: a case the bench throws out does not
  return the following month. Each matter carries its own marker flag for that, because the shared
  `court_ruled_against` says only that the court has ruled against the government at least once —
  one marker for all of them would have silenced every other case after the first ruling.
- The ruling is an institutional act of its own, never folded into the decision the player signed:
  `decision.metersAfter` keeps recording what the decree did, and the ruling travels beside it as
  `courtRuling`, the way a procedure event and a cabinet change already do.
- It is evaluated after the removal grounds are weighed, so a ruling never changes whether a
  procedure opened in the very month it was handed down.
- Nothing the Presidency can sign improves its standing before the court. The only way to face a
  softer bench is to leave a lighter record.

#### Not modelled yet

- Tenure that outlives the mandate, individual justices with names and histories, appointments to the
  court, and any card that lets a justice read a ruling aloud.
- The ruling is not stored as a row of its own. Its consequences persist in the pillars and the
  flags; the narration is derived per decision, as `procedureEvent` is.

#### A contract this uncovered

- `applyFlagOperations` now defaults `legacy`, `legacyPriority` and `successorEffects`. Flags set by
  content arrive with that metadata copied from the catalog, but a flag the engine sets itself has no
  catalog entry behind it, and an undefined priority reached a NOT NULL column as a null. The default
  belongs where the flag is built, not in the repository that writes it.

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
