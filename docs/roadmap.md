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

1. **Removal interface**: sealed red envelope, side seal with the current stage, colder paper on
   process cards, a vote screen with the quorum filling, and an outcome that leads to an ending or
   back to government. The API already serves everything it needs — the stage with its label, the
   suspension deadline, and per house the seats, the threshold and a band before the vote or the
   confirmed count after it.
2. **Balance of the chain**: support saturates today, so the votes come out near-unanimous. The
   margins should be plausible before the interface makes them the centre of a screen.

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
