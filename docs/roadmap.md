# Product roadmap

What is deliberately **not** built yet, in the order that keeps each phase shippable on its own.
Items here are decisions already taken about direction, not a backlog of ideas: everything listed was
cut from an earlier phase on purpose. A phase may be reordered, but nothing is added to one without
the decision being recorded here first.

## Delivered

- The monthly engine with 30 Brazilian cards and authored consequences.
- The chronicle and succession (ADR 0002).
- The country-pack foundation and the Brazilian onboarding (ADR 0003).
- The visual identity: brand mark, decision scene, the meters as an institutional band, and the
  dossier that answers to the hand that drags it.
- The Brazilian impeachment chain end to end — the bloc model that counts the votes, the
  constitutional band and panel, the vote reveal, the suspension, the four resolutions, and the
  constitutional milestones in the archive (`docs/game-rules.md`).

What the impeachment still owes, and what it is waiting on, is Phase 1 below.

## Phase 1 — Institutional depth

The chain runs, but it runs against a board with almost nothing on it. Its grounds are flags set by
cards, and the bodies that judge it are names in the country pack. This phase gives the process
actors to read, and it is the cheapest way to make every existing card matter more.

1. **Cabinet**: ministers as people with their own loyalty and cost, appointments and dismissals as
   decisions, and a minister who can be handed over to survive a crisis. Today "sacrificing a
   minister" is a flag, not a person.
2. **The Supreme Court as an independent body**: the bench now rules. Eleven seats divided between
   institutionalists, pragmatists and justices named by earlier governments; it judges the matters
   the country declares, evidenced by the government's own record, and its rulings move the pillars
   and leave a mark that outlives them. Never subordinate to the player: nothing the Presidency can
   sign improves its standing before the court, and the only way to face a softer bench is to leave a
   lighter record. Each matter is decided exactly once, whichever way it goes.
   Still missing: the justices are a composition and not people — no tenure that outlives the
   mandate, no faces, and no card that lets one of them read the ruling aloud.
3. **Governors and the federation**: regional pressure tied to the election's own `strongholds`, so
   a government's map has weight between elections and not only during them.
4. **The procedure's own art**: the chain reuses the ordinary dossier and the archive's paper. A
   sealed envelope, a side seal per stage and colder paper on process cards were specified and are
   not drawn.
5. **More than one procedure type**: the engine takes the type from the country, but impeachment is
   the only one any pack declares.

## Phase 2 — Election 2.0

The election resolves today as a single deterministic outcome from the record a government leaves.
That is enough to end a mandate and not enough to play one.

6. **The campaign as a phase**: its own months, its own cards, and a record that is spent rather
   than only tallied.
7. **Coalitions and endorsements**: who stands with the government, at what price, and what that
   costs afterwards in the chamber the impeachment already counts.
8. **Debates and the public record**: the promises a candidate makes entering the next mandate as
   flags the deck can hold them to.
9. **Re-election as continuity**: a second mandate that inherits the meters, the chronicle and the
   enemies, instead of starting a new government.

## Phase 3 — Accounts and SSO

Everything above is playable without an account. Nothing below is.

10. **Identity**: sign-in through a provider (SSO), with the anonymous local government migrated into
    the account rather than discarded.
11. **Governments as a list**: more than one mandate per player, resumable across devices. This is
    also what closes the "abandoning a mandate is local only" debt below.
12. **Server-side session**: the client stops being the only place that knows which government is
    being played.

## Phase 4 — Ranking and legacy

13. **Legacy**: what a finished mandate leaves behind, as a readable record rather than a score.
14. **Ranking**: comparison between players over comparable governments, which requires accounts and
    a decision about what is fair to compare — months survived is not it.
15. **Shareable chronicle**: a finished government as a page worth sending to someone.

## Phase 5 — Advanced political systems

These are the systems the impeachment would read from if they existed. They are deliberately last
among the gameplay phases: each one is a source of the grounds the chain already accepts, so they
deepen a process that already works rather than gate it.

16. **Systemic corruption**: investigations, evidence that accumulates over months, plea deals, and
    the choice between protecting an ally and protecting the mandate.
17. **Illicit wealth**: the president's own exposure, as something that can be discovered.
18. **Organised crime**: territorial control, police operations, and the security/rights trade-off
    the deck only touches today.
19. **Threats to the president and presidential security**: personal risk and the temptation of
    exceptional measures.
20. **Lobbying**: organised interest as a named actor rather than an effect on a meter.

## Phase 6 — The United States pack

The second country, and the real test of whether the engine stayed country-agnostic.

21. **Country-scoped card selection** — the engine change this pack requires; a government must only
    draw from its own pack.
22. **Institutions**: House and Senate with separate budget power, a nine-justice Supreme Court with
    lifetime appointments, states with their own weight.
23. **Mandate**: four years with midterms halfway, which the calendar does not model.
24. **Removal**: impeachment by the House, trial in the Senate with a two-thirds threshold — the
    bloc model applied to a composition it was not calibrated on.
25. **Election**: electoral college instead of a national majority.
26. **Content**: 15–25 exclusive cards, its own characters and its own crises (playbook §3.2).

## More content for Brazil

Not a phase: work that can be done at any point, and the cheapest way to deepen the pack.

- **New cards**: the deck has 30. Chains, crisis cards and milestone cards (GDD §10.5) are never
  implemented.
- **More characters and portraits**: eight of the twelve characters still show initials.

## Known debts, not phases

- **Creating a government is not idempotent**: a lost response after the server committed can leave
  an orphan government. A request key is the fix.
- **Abandoning a mandate is local only**: there is no `abandoned` status in the database and no list
  of past governments, so leaving one only stops this browser from reopening it. Persisting it
  properly needs a migration and a way to list a player's governments — see Phase 3.
- **Six common cards can appear five times** in a long government (§19.1 targets four), and the
  cooldown-free fallback is used late in long games. Balance data is in `docs/game-rules.md`.
