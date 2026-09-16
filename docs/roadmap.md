# Product roadmap

What is deliberately **not** built yet, in the order that keeps each phase shippable on its own. Items
here are decisions already taken about direction, not a backlog of ideas: everything listed was cut
from an earlier phase on purpose.

Delivered so far: the monthly engine with 30 Brazilian cards, authored consequences, the chronicle and
succession (ADR 0002), the country-pack foundation with the Brazilian onboarding (ADR 0003), and the
visual pass over that onboarding.

## Phase 1 — The constitutional threat

The Brazilian pack already names the institutions and the stages; none of it runs yet.

1. **Impeachment as a visible chain** (playbook §5): the process object (`stage`, severity, evidence,
   legislative momentum, institutional support), the stages the country declares
   (`pressure → petition → admissibility → lower_house_vote → trial → removed`), and the cards that
   move it. Reacting must cost pillars and leave legacies; surviving must feel as strong as falling.
2. **Removal interface**: sealed red envelope, side seal with the current stage, colder paper on
   process cards, a vote screen with the quorum filling, and an outcome that leads to an ending or
   back to government.
3. **Sources of risk already in the data**: `campaign_dossier_used`, `campaign_cabinet_promised`,
   `audit_ignored`, `palace_secrecy_kept` and `questioned_contractor` exist as flags and should be
   what opens the process.

## Phase 2 — The people around the government

4. **Cabinet**: ministers as actors with their own loyalty and cost, appointments and dismissals as
   decisions, and a minister who can be handed over to survive a crisis.
5. **Supreme court as an independent body**: eleven fictional justices, appointments that outlive the
   mandate, and rulings that constrain the Executive. Never subordinate to the player.
6. **Governors and the federation**: regional pressure tied to the election's own `strongholds`.

## Phase 3 — Corruption, crime and threats

7. **Corruption**: investigations, evidence that accumulates, plea deals, and the choice between
   protecting an ally and protecting the mandate.
8. **Organised crime**: territorial control, police operations, and the security/rights trade-off the
   deck only touches today.
9. **Threats to the president**: personal risk, security apparatus, and the temptation of exceptional
   measures.

These three feed Phase 1: they are the material that makes a removal process start.

## Phase 4 — More content for Brazil

10. **New cards**: the deck has 30. Chains, crisis cards and milestone cards (GDD §10.5, never
    implemented) are the cheapest way to deepen the pack.
11. **More characters and portraits**: eight of the twelve characters still show initials.

## Phase 5 — The United States pack

12. **Country-scoped card selection** — the engine change this pack requires; a government must only
    draw from its own pack.
13. **Institutions**: House and Senate with separate budget power, a nine-justice Supreme Court with
    lifetime appointments, states with their own weight.
14. **Mandate**: four years with midterms halfway, which the calendar does not model.
15. **Removal**: impeachment by the House, trial in the Senate with a two-thirds threshold.
16. **Election**: electoral college instead of a national majority — the real test of whether
    `resolveCampaign` stayed country-agnostic.
17. **Content**: 15–25 exclusive cards, its own characters and its own crises (playbook §3.2).

## Known debts, not phases

- **Creating a government is not idempotent**: a lost response after the server committed can leave an
  orphan government. A request key is the fix.
- **Abandoning a mandate is local only**: there is no `abandoned` status in the database and no list of
  past governments, so leaving one only stops this browser from reopening it. Persisting the state
  properly needs a migration and a way to list a player's governments.
- **Six common cards can appear five times** in a long government (§19.1 targets four), and the
  cooldown-free fallback is used late in long games. Balance data is in `docs/game-rules.md`.
