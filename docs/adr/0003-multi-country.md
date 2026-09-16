# ADR 0003 — Multi-country foundation and the Brazilian onboarding

- Status: accepted
- Date: 2026-09-16

## Context

`Decretum_UI_Modern_Politics_Playbook_v1.0.md` §3 moves the game from the fictional República de
Aurória (GDD §4) to real countries with fictional people, starting with a Brazilian vertical slice
(§3.3, phase A): Brazil playable, other packs announced as "in development", and a country-pack
architecture in place. The engine already resolves months, cards, flags and endings without knowing
anything about a country.

The risk is inventing a generic country framework before a second country exists, and letting
institutional rules leak into the engine.

## Decision

- **Country packs are content**, in `src/content/countries/`: `brazil.js` is one plain-data profile
  (institutions, electoral rules, terminology, impeachment stage names, candidate options and the
  campaign), and `index.js` is the registry. The United States is a literal in the registry with
  `playable: false`: a name, a summary and a note, no rules and no content.
- **The engine never imports country content.** `src/domain/election.js` receives the profile as an
  argument. The service resolves the country and passes it in. The same rule applies to `app/`: route
  handlers call a service, never the registry.
- **The campaign is a pure function with no randomness.** `resolveCampaign({ country, candidate,
choices })` returns the votes, the opening pillars (clamped to 40–60 like a successor, GDD §7.2),
  the flags and the election snapshot. Determinism is total, so tests inject nothing. In this version
  the player always wins; the campaign decides the margin and the government's starting position.
- **Persistence**: migration `1789603200000` adds `country_code` (default `'BR'`), `candidate` and
  `election` to `games`. The institutional profile is never copied into a government — the game keeps
  a country code and the profile is resolved from code at read time. `candidate` and `election` are
  immutable JSONB snapshots written once at creation, like decision snapshots.
- **Countries are not seeded into PostgreSQL**, unlike cards and endings (ADR 0002). They are
  configuration read by the server, not rows the engine queries.
- **API**: `GET /api/v1/countries` returns the dossiers with candidate options and campaign questions
  stripped of every effect, so the client cannot know what a choice costs (GDD §9). `POST
/api/v1/games` accepts `{ countryCode, candidate, campaign: { choices } }` and still accepts an
  empty body, which opens a Brazilian government with balanced pillars.
- **The card corpus became Brazilian.** The 30 cards, the flag labels and the ending texts had their
  proper nouns localized (Assembleia → Congresso/Câmara, Tribunal da Carta → Supremo Tribunal
  Federal, Banco de Aurória → Banco Central, províncias → estados, Aurória → Brasil). No mechanic,
  slug, effect or flag key changed.

## Consequences

- Adding the United States is content plus a registry entry, not a migration: `country_code` accepts
  any two-letter code and the engine reads the profile from code.
- The validator enforces the couplings that would silently break a pack: the term must be the
  engine's 48 months, every pillar needs a local name, every option flag must exist in the shared
  catalog, campaign regions must be the country's own, and the headlines must cover a zero margin.
- Card content is bound to a country. A second playable pack needs its own cards, as the playbook
  requires (§3.2, 15–25 exclusive cards); the engine will need country-scoped card selection, which
  is deliberately **not** built now.
- Chronicles written before the rebrand keep saying "Assembleia" and "Aurória": decision snapshots are
  immutable, and history shows what the player actually read.
- Governments created before the migration are Brazilian by default. That is only safe while Brazil is
  the single playable pack; a second pack must not reuse this default.
- Institutional depth (STF composition, cabinet, impeachment chain, governors) is documented in the
  profile as labels only. The stage names exist so the interface can speak the right vocabulary when
  the process is implemented; no impeachment rule runs yet.
