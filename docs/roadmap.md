# Product roadmap

What is deliberately **not** built yet, in the order that keeps each phase shippable on its own. Items
here are decisions already taken about direction, not a backlog of ideas: everything listed was cut
from an earlier phase on purpose.

Delivered so far: the monthly engine with 30 Brazilian cards, authored consequences, the chronicle and
succession (ADR 0002), the country-pack foundation with the Brazilian onboarding (ADR 0003), the
visual pass over that onboarding, and the Brazilian impeachment chain (`docs/game-rules.md`).

## Phase 1 — The constitutional threat

The chain itself runs: it opens from the record the government leaves, moves through the stages the
pack declares, is counted against 342 of 513 and 54 of 81, suspends for six turns and ends in
archiving, acquittal, removal or expiry. The flags that open it (`campaign_dossier_used`,
`campaign_cabinet_promised`, `audit_ignored`, `palace_secrecy_kept`, `questioned_contractor`) are the
ones the earlier phases had already put in the data. What is left is how the player sees it.

Delivered since: the bloc model that decides the votes (`docs/game-rules.md`), the constitutional
band, the process panel with its timeline, the vote reveal for each of the three counts, the
suspension and resolution states, and the constitutional milestones in the archive.

What Phase 1 still owes:

1. **The procedure's own art**: the chain reuses the ordinary dossier and the archive's paper. A
   sealed envelope, a side seal per stage and colder paper on process cards were specified and are
   not drawn.
2. **More than one procedure type**: the engine takes the type from the country, but impeachment is
   the only one any pack declares.

## Phase 1b — What the process still cannot see

These are the systems the chain would read from if they existed. None of them is implemented, and
the impeachment works without them:

3. **Cabinet**: ministers with their own loyalty, appointments and dismissals, and a minister who can
   be handed over to survive a crisis. Today "sacrificing a minister" is a flag, not a person.
4. **The Supreme Court as an independent body**: eleven justices with their own tenure and rulings.
   Today the court presides the trial as a name in the country pack and nothing more.
5. **Governors and the federation**: regional pressure tied to the election's own strongholds.
6. **Systemic corruption, illicit wealth, organised crime, personal threats, presidential security,
   lobbying and criminal investigation**: the grounds of an impeachment are flags set by cards, not
   the output of any of these systems.

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
