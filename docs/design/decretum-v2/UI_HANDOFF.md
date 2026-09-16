# DECRETUM v2 — UI handoff

Condensed, implementation-oriented summary of the approved Claude Design export. Use this file instead
of reopening the generated HTML.

- **Source:** `docs/design/decretum-v2/source/decretum-ui.zip` → `Decretum UI.dc.html` (+ `Poderes`,
  `Retrato`, `Cenario` sub-components).
- **Approved:** sections `t3` (3a–3e, latest UX pass) and `t2` (2a–2g, foundation and onboarding).
- **Obsolete:** `t1` (1a–1d). Do not implement.
- **Missing from the export:** 3f (end of government), 3g (onboarding), 3h (handoff) are listed in the
  `t3` index but were never generated.
- The export is a **visual specification only**: never copy `.dc.html`, `support.js`, inline styles,
  absolute positioning or `dc-import` elements. All values in the mockups (Brasil, July, 35/60/50/47,
  General Otávio's dilemma) are demonstration data.

## 1. Visual direction

"Gabinete cinematográfico · arquivo constitucional vivo": a presidential office at midnight. A dark,
atmospheric room (window grid, curtains, desk edge, vignette) surrounds one ivory **dossier card** with a
large character portrait. Everything else is quiet: a thin government header, a power strip, two
decision panels next to the card, and a mandate timeline at the bottom. Red only means danger, seals or
urgency; green only appears in heraldry.

## 2. Color tokens

| Token                  | Hex / value | Use                                 |
| ---------------------- | ----------- | ----------------------------------- |
| `--republic-night`     | `#0B1729`   | Base background                     |
| `--deep-navy`          | `#16273F`   | Ink on paper, dark surfaces         |
| `--ivory-paper`        | `#F4EFE3`   | Paper, primary text on night        |
| `--paper-shadow`       | `#ECE5D5`   | Paper gradient end, secondary paper |
| `--aged-brass`         | `#B08D4F`   | Hairlines, borders                  |
| `--light-brass`        | `#D3AE6D`   | Dates, current month, highlights    |
| `--constitutional-red` | `#8E2B24`   | Danger zones, stamps, crisis chip   |
| `--heraldic-green`     | `#1D6B4A`   | Flags and heraldry only             |
| `--portrait-frame`     | `#152741`   | Portrait frame background           |
| `--alert-on-navy`      | `#F0B2AC`   | Danger text on dark surfaces        |
| `--brass-chip-text`    | `#F0D9A8`   | Text inside brass chips             |
| paper brown text       | `#6B5A3E`   | Metadata on paper                   |

Paper gradient: `linear-gradient(176deg, #F6F1E6, #E9E0CB)`. Text alpha on navy never below 0.74.

## 3. Typography

| Family        | Role                                                           |
| ------------- | -------------------------------------------------------------- |
| Spectral      | Character names, dilemma text, choice titles, editorial titles |
| Archivo       | Interface, buttons, power values and labels                    |
| IBM Plex Mono | Dates, dossier numbers, procedural labels, key hints           |

Key sizes (desktop 1440×900 → compact 1366×768 → mobile 390×844): character name 29 → 25 → 21px;
dilemma 19/1.45 → 17/1.4 → 15/1.45px; choice title 25 → 22 → 15px; power value 22px; labels 12px.
**No essential text below 12px** (the mockup's 9.5px mobile title is raised to 12px). Numbers are
tabular.

## 4. Radius scale

| Radius | Element                                   |
| ------ | ----------------------------------------- |
| 20px   | Portrait frame                            |
| 18px   | Country folders (onboarding, future)      |
| 14px   | Game dossier card                         |
| 12px   | Decision panels, context cards            |
| 10px   | Buttons                                   |
| 2–6px  | Documents, stamps, key caps, flags        |
| pill   | Status and trend chips, timeline segments |

## 5. Shadow scale

| Token | Value                                 | Use                |
| ----- | ------------------------------------- | ------------------ |
| S0    | `0 2px 6px rgba(3,7,13,.5)`           | Resting paper      |
| S1    | `0 18px 40px -20px rgba(3,7,13,.7)`   | Decision panels    |
| S2    | `0 26px 56px -22px rgba(3,7,13,.8)`   | Folders, briefings |
| S3    | `0 46px 92px -26px rgba(3,7,13,.85)`  | Central dossier    |
| edge  | `0 3px 0 rgba(176,141,79,.45)`        | Paper bottom edge  |
| glint | `inset 0 1px 0 rgba(244,239,227,.14)` | Portrait frame     |

One shadow per element; background never has shadows; glass reflections are linear at 118° with
alpha ≤ 0.07; no blur/glassmorphism.

## 6. Responsive breakpoints

| Viewport            | Layout                                                                                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ≥ 1024px wide       | Full-height shell, no page scroll. Header 58px, power strip, card column 470px with panels 30px to each side, timeline 78px.                                                                                                             |
| ≥ 1024 × ≤ 820 high | Compact (3a): header 50px, tighter power strip, card 434px, portrait ~250px, dilemma 17px, timeline 56px. Everything visible without vertical scroll at 1366×768.                                                                        |
| < 1024px            | Mobile reflow (2f mobile): header row 46px, full-bleed power strip, card full width (≈358px at 390), drag hint, two choice buttons (≥ 66px high) in the thumb zone, timeline at the bottom. The page may scroll; nothing is scaled down. |

Grid 4px. Desktop margin 56px; mobile margin 16–20px; touch targets ≥ 44px.

## 7. Reusable components

| Component         | Content and states                                                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GameShell         | Atmospheric background (window grid, curtains, desk, vignette; decorative, `aria-hidden`), layout slots                                                                                                                                                   |
| GovernmentHeader  | Flag emblem, country, office title, date, month n/48, Chronicle button, settings icon button                                                                                                                                                              |
| PowerIndicators   | Four columns separated by 1px hairlines                                                                                                                                                                                                                   |
| PowerIndicator    | 40px emblem that fills from the bottom (People circle, Market diamond, Congress arch, Institutions shield), value, name, status word, 64×3px ruler with red danger zones at both ends and a value marker, trend chip (pill + arrow + word) during preview |
| DecisionDossier   | Paper card: dossier number, crisis/category chip, portrait with name and title, dilemma in quotes, signature, short left/right verbs; preview seal while dragging                                                                                         |
| CharacterPortrait | 20px frame, brass corner marks, bottom scrim, image or initials fallback                                                                                                                                                                                  |
| DecisionChoice    | Side panel. rest: alpha .055; target: full paper, brass focus ring, expected trends, confirmation note; opposite: alpha .40                                                                                                                               |
| DecisionFeedback  | After the server responds: stamp, chosen decree, consequence text, power movement, continue action                                                                                                                                                        |
| OfficialStamp     | Circular stamp, double or dashed red border, rotated 9–12°                                                                                                                                                                                                |
| MandateTimeline   | 48 pill segments: past ivory .5 (6px), current light brass (16px), future ivory .16                                                                                                                                                                       |

Primary button: paper gradient to `#E7DEC9`, hover +4% light, focus 2px brass ring, active moves down
1px, disabled alpha .45.

## 8. Character portrait rules

- Source file 4:5 (1024×1280 spec; the delivered assets are 1122×1402), no transparency. Originals
  (PNG) live in `source/characters/`; the game serves WebP copies from `public/assets/characters/`.
- Bust framing, eyes at 38–44% from the top, key light top-left, dark blurred office background.
- The frame is wider than 4:5, so the image uses `object-fit: cover` with a per-character
  `portraitPosition` from the registry (around `50% 20–24%`).
- Portraits are resolved on the server from the character registry (`src/content/characters.js`) by
  the stable character id; the API speaker carries `portrait: { src, position }` or `null`. Never by
  display name.
- Missing or failing images fall back to the character's initials inside the same frame.
- 44px circular crops only in chronicles and logs, never as the main portrait.
- Fictional people only; no real insignia or likeness.

## 9. Decision interaction

- One dossier at a time. Choices: click the panel button, drag the card (mouse, pen or touch via
  Pointer Events), or keyboard.
- Drag: offset clamped to ±190px, rotation ≤ ±4°, preview side appears after ~24px, confirmation after
  crossing the threshold on release; below the threshold the card springs back.
- Preview (3b): the targeted panel turns to paper with expected trends; the opposite panel dims; power
  indicators show trend chips; a dashed "Prévia" seal appears on the card; nothing is signed.
- Keyboard: ← / → preview a side, Enter confirms the previewed side, Escape cancels the preview
  (and closes overlays), Tab moves between the two decisions.
- Pending request: every input is locked; a decision is never sent twice.
- Effects are never calculated on the client; trends and exact deltas come from the API.

## 10. Animation timings

| Transition                | Duration / behavior                         |
| ------------------------- | ------------------------------------------- |
| Card spring-back          | ~180ms ease                                 |
| Preview seal              | 160ms                                       |
| Card exit after confirm   | ~200ms                                      |
| Power values after result | 600ms, no continuous pulse                  |
| Welcome → selection       | 420ms vertical curtain (onboarding, future) |
| Selection → dossier       | 180ms (future)                              |
| Dossier → inauguration    | 300ms fade to black (future)                |
| Inauguration → dispatch   | 500ms light rise (future)                   |

## 11. Reduced motion

`prefers-reduced-motion` (or the in-game setting): every transition becomes a 150ms fade with no
translation or rotation; no pulses. Dragging still previews and confirms, but the card does not move.

## 12. Accessibility

Semantic buttons for every choice; visible 2px brass focus rings; ← → Enter Escape support; choices
never depend on hover or swipe; minimum 44px targets; no essential text below 12px; state is conveyed
by shape, words and position, never color alone; live region announces results; loading and error
messages say what happened and how to retry.

## 13. Required assets

Portraits 1024×1280 (one per recurring character, plus special dilemmas) · paper texture 512×512 and
linen texture · DECRETUM seal (132/96/74px) · stamps DEFERIDO, INDEFERIDO, URGENTE, ARQUIVO
VERIFICADO, NÃO LIDO · geometric flags 52×36 · office background in 3 layers (window, curtains, desk) ·
24px icons (chronicle, settings, sound, keyboard), 2px stroke. Available now (approved, mapped):
`helena-vasque`, `livia-nogueira`, `raul-mendonca` and `otavio-leme` (`.webp`). **Pending:**
`livia-nogueira.webp` is not front-facing and must be replaced by a regenerated front-facing
portrait with the same filename (1122×1402 WebP); no code change is needed, only `portraitPosition`
may need tuning in the registry. Never mirror or distort a face with CSS.

## 14. Dynamic data fields

| UI field                 | Source in the application                                                      |
| ------------------------ | ------------------------------------------------------------------------------ |
| Country name, flag       | Presentation profile (`app/_lib/government.js`); the API has no country yet    |
| Office title             | `game.role` → localized title                                                  |
| Date, dossier number     | `game.calendar` (`year`, `monthIndex`), `game.turn`                            |
| Mandate progress         | `game.turn` of `MANDATE_TURNS` (48)                                            |
| Power value, status      | `game.meters[pillar].value`, `.band`                                           |
| Trend chips / rows       | `currentCard.choices[side].effects[pillar]` (`direction`, `strength`, `delta`) |
| Speaker, portrait        | `currentCard.speaker` (`id`, `name`, `title`, `initials`, `portrait`)          |
| Dilemma, crisis/category | `currentCard.text`, `.isCrisis`, `.category`                                   |
| Choice titles            | `currentCard.choices.left/right.label`                                         |
| Consequence              | decision response `resultText`, `effects`, `decision.choiceLabel`              |
| Headline, reaction (3c)  | decision response `consequence.headline`, `.reaction` (`null` → compact view)  |
| Chronicle consequence    | chronicle entry `consequence` (stored snapshot; `null` → `resultText`)         |
| New condition (3c)       | `decision.flagChanges` with `type: "set"`; hidden when empty                   |
| Status                   | `game.status`, request pending/error state                                     |

## 15. Screen → application mapping

All game states live on `/` inside `app/_components/DecretumApp.jsx`.

| Design       | Application state     | Status                                                                                  |
| ------------ | --------------------- | --------------------------------------------------------------------------------------- |
| 2f, 3a       | Active government     | Phase 1 — `game/GameScreen`                                                             |
| 3b           | Preview (drag / ← →)  | Phase 1                                                                                 |
| 3c           | Decision response     | `game/DecisionFeedback`: newspaper + reaction; compact for content without consequences |
| 3d           | Chronicle             | Phase 2 — `chronicle/ChronicleDrawer` (year filter; no category tabs or active effects) |
| 2a           | Cover / no government | Phase 2 — `onboarding/CoverScreen`                                                      |
| 2b           | Country selection     | Not supported by the API yet                                                            |
| 2c           | Pre-mandate briefing  | Phase 2 — `onboarding/BriefingScreen` (Aurória, GDD §4)                                 |
| 2d           | Inauguration          | Phase 2 — `onboarding/InaugurationScreen`, also used for successors                     |
| 2e           | First dispatch        | Existing tutorial (the frame depends on invented content)                               |
| 3e           | Impeachment           | Not in the engine (roadmap)                                                             |
| 3f (missing) | Ending                | Phase 2 — `ending/EndingScreen`, built from the 2g system                               |

Entry animations never start from `opacity: 0` on essential content: if an animation does not run,
the content must still be visible (the Chronicle drawer has no entry animation for this reason).
