# Countries and onboarding

How DECRETUM supports more than one country, what the Brazilian pack contains and how a government is
opened. The architectural decision is recorded in [ADR 0003](adr/0003-multi-country.md).

## The country pack

A country is **data**, not code: one plain object in `src/content/countries/`, validated with the rest
of the content by `src/content/validate.js`. The registry in `src/content/countries/index.js` exposes
`getCountry(code)`, `listCountries()` and `isPlayable(code)`.

| Field                                        | What it carries                                                       |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `countryCode`, `name`, `longName`, `demonym` | Identity, two uppercase letters as the code                           |
| `playable`                                   | Whether a government can be started                                   |
| `system`, `systemNote`, `summary`            | How the country is governed, in the dossier's words                   |
| `oath`                                       | Text signed at the inauguration                                       |
| `office`                                     | Role, title, form of address, seat of government, term in months      |
| `electoralRules`                             | Rounds, runoff threshold, voting and inauguration notes               |
| `powers`                                     | Executive, lower house, upper house, supreme court, federation        |
| `keyMinistries`                              | Ministries the briefing lists                                         |
| `removal`                                    | The whole removal procedure: type, stages, thresholds, cards          |
| `terminology`                                | Interface vocabulary, including a local name for each pillar          |
| `theme`, `regions`                           | Accent colour, architecture key and the regions the election reports  |
| `candidateOptions`                           | Treatments, origins, styles, parties, coalitions, promises            |
| `campaign`                                   | Opponent, electorate, base share and turnout, questions and headlines |

Rules the validator enforces, because breaking them fails silently otherwise:

- `office.termMonths` must equal the engine's mandate (48 months);
- every pillar needs a name in `terminology.pillars`;
- every flag set by an option must exist in the shared catalog (`src/content/flags.js`);
- campaign regions must be regions the country declares;
- headlines must cover a zero margin, since the resolver always picks one;
- two countries cannot share a code, and `countryCode` must match its key.

`removal` is what makes a constitutional procedure possible without putting any of it in the engine:

- `chamber` and `senate` carry the seats, the vote each decision needs and who presides;
- `suspensionTurns` is the suspension read on the game's calendar (180 days = six turns in Brazil);
- `stages` names and describes each link, and the interface reads its labels from here;
- `grounds` lists what counts as an impeachable act and which flags evidence it, with a weight;
- `cards` names the card the engine must summon for a stage or an outcome — the links no card can
  foresee, such as where a count lands. Everything else is scheduled by the cards themselves. This is
  why no card slug appears in `src/domain`.

**The engine never imports country content.** `src/domain/election.js` receives the profile as an
argument, and so does `src/domain/procedure.js`: it would count a different country's thresholds
unchanged. The service resolves the pack from the code. Route handlers call services, never the
registry.

## Adding a country

1. Write `src/content/countries/<country>.js` with the fields above.
2. Register it in `src/content/countries/index.js`.
3. Write its cards. Card text is country-bound (institutions and vocabulary), so a new pack needs its
   own deck — the playbook asks for 15–25 exclusive cards (§3.2). Country-scoped card selection does
   not exist yet and is the first engine change a second playable pack will require.
4. No migration is needed: `games.country_code` accepts any two-letter code.

The United States is registered as `playable: false` with a name, a summary and a development note —
no rules, no campaign, no cards. The selection screen shows it; the server refuses to start a
government with it (`422 COUNTRY_NOT_PLAYABLE`).

## The Brazilian pack

- **Institutions**: Presidência no Palácio do Planalto, Congresso Nacional (Câmara dos Deputados com
  513 deputados, Senado Federal com 81 senadores), Supremo Tribunal Federal com 11 ministros, 27
  unidades federativas.
- **The STF is not part of the cabinet.** The profile says so and the briefing repeats it: its
  justices are independent actors, not subordinates of the player.
- **Electoral rules**: absolute majority of valid votes, up to two rounds, runoff below 50%.
- **Impeachment**: stage names only (`pressure`, `petition`, `admissibility`, `lower_house_vote`,
  `trial`, `removed`). No rule runs yet; they exist so the interface can use the right vocabulary when
  the process is implemented.
- **People are fictional.** Parties (PCN, FNT, USD, POP), the opponent and every character are
  invented; the institutions around them are real (playbook §3.1).

## Onboarding

```mermaid
flowchart LR
    A[Home] --> B[Country selection]
    B --> C[Candidate registration]
    C --> D[Electoral prologue]
    D --> E[Election night]
    E --> F[Inauguration]
    F --> G[First briefing]
    G --> H[Month 1 dossier]
```

- **Home** offers a new mandate, continuing a saved government, the chronicle and settings.
- **Country selection** presents institutional dossiers; packs in development cannot be chosen.
- **Candidate registration** collects a name (60 characters at most), a form of address, a party and
  four political positions. Each option carries consequences the client never sees.
- **The prologue** is four decisions. The screen shows the dilemma and the two sides, never their
  cost.
- **Election night** reads the snapshot the server produced.
- **Inauguration** signs the country's oath; **the briefing** presents the institutions; the mandate
  then starts on the existing engine, with the pillars and flags the campaign produced.

The whole prologue is optional: `POST /api/v1/games` with an empty body opens a Brazilian government
with the pillars at 50, which is how the game behaved before this phase.

## The election

`resolveCampaign({ country, candidate, choices })` in `src/domain/election.js` is pure and uses **no
randomness at all**, so a campaign always produces the same election and tests inject nothing.

- Share starts at the pack's `baseShare` and each choice adds or removes points.
- Below the runoff threshold the race goes to a second round, where the winner consolidates the votes
  of eliminated candidates.
- Turnout stays between 62% and 94%; votes come from the electorate and the valid-vote rate.
- Opening pillars are 50 plus the candidate's and the campaign's modifiers, clamped to **40–60** —
  the same rule a successor government uses (GDD §7.2), so no campaign can start a government already
  in collapse.
- Every trait and campaign option contributes flags, which become real game flags at month 1.
- In this version the player always wins. The campaign decides the margin, the base in Congress and
  which promises the mandate will be charged for.

## Persistence

Migration `1789603200000` adds three columns to `games`:

| Column         | Meaning                                                  |
| -------------- | -------------------------------------------------------- |
| `country_code` | Which pack the government belongs to; defaults to `'BR'` |
| `candidate`    | Immutable snapshot of who was elected, or null           |
| `election`     | Immutable snapshot of the result, or null                |

The institutional profile is **not** copied into the government: the game keeps a code and the profile
is resolved at read time, so fixing a label never requires a data migration. Governments created
before the migration are Brazilian by default — safe only while Brazil is the single playable pack.

## API

| Endpoint                | Behaviour                                                                      |
| ----------------------- | ------------------------------------------------------------------------------ |
| `GET /api/v1/countries` | Dossiers, candidate options and campaign questions, with every effect stripped |
| `POST /api/v1/games`    | Accepts `{ countryCode, candidate, campaign: { choices } }`, or an empty body  |

Errors: `422 UNKNOWN_COUNTRY`, `422 COUNTRY_NOT_PLAYABLE`, `422 INVALID_CANDIDATE`,
`422 INVALID_CAMPAIGN_CHOICE`, `422 INCOMPLETE_CAMPAIGN`, `400 UNKNOWN_FIELDS` for anything the client
should not be sending — including campaign effects.

## Roadmap for the United States pack

Not implemented, and deliberately not designed into the engine yet:

1. **Content**: its own deck, its own recurring characters, its own crises.
2. **Institutions**: House and Senate with separate budget power, a nine-justice Supreme Court with
   lifetime appointments, states with their own electoral weight.
3. **Mandate**: four years with midterm elections halfway, which the engine does not model — the
   calendar and the card pool would have to react to a mid-mandate shift in Congress.
4. **Removal**: impeachment by the House and trial in the Senate with a two-thirds threshold, a
   different chain from the Brazilian one.
5. **Election**: electoral college instead of a national popular majority, which is the first real
   test of whether `resolveCampaign` stays country-agnostic.
6. **Engine change required**: country-scoped card selection, so a government only draws cards from
   its own pack.
