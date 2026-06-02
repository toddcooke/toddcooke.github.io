# Castles of Burgundy Score Calculator — Design

## Summary

A self-contained web app for computing final scores in *The Castles of Burgundy*,
styled after the official Stonemaier Scores app (the Wingspan calculator). It walks
the user through a step-by-step wizard — one screen per scoring category — and ends
on a Final Scores grid with a ranked podium. It ships as static files inside the
existing Hugo site and runs entirely client-side with no build step.

## Goals

- Quickly total each player's **final** score at the end of a game (single-use per game).
- Match the look and feel of the Stonemaier Scores wizard, themed for Castles of Burgundy.
- Support **1–4 players**, added/named/colored dynamically.
- No server, no dependencies, no build tooling — plain HTML/CSS/JS served as a static asset.

## Non-Goals

- Not a live, round-by-round scorepad (scores are entered once, at game end).
- Not a rules engine for region-completion points — those are already on the player's
  VP track during play and entered as a single number.
- No game history, accounts, or cloud sync (unlike the full Stonemaier app).
- No expansions (base game only).

## Scoring Model

A player's final score is their **VP-track total** (everything accumulated during the
game from completed regions, deliveries, and building powers) plus four end-game bonuses:

| Category            | Rule                              | Input        |
|---------------------|-----------------------------------|--------------|
| VP track total      | Running total already on the board| typed number |
| Leftover goods      | 1 point each                      | stepper      |
| Silverlings (coins) | 1 point each                      | stepper      |
| Worker tiles        | 1 point per **2** workers (floor) | stepper      |
| Yellow (knowledge) tiles | Sum of VP-bearing yellow tiles| stepper      |

`final = track + goods + silverlings + floor(workers / 2) + yellow`

**Tiebreaker:** Highest total wins. Ties are broken by **fewest empty estate spaces**
(a value entered on a tiebreaker screen that only appears when two or more players tie),
then by turn order. If still unresolved, players are shown as tied.

## User Flow (wizard)

Each step is a full screen with a serif-caps title + one-line description, player rows,
and hexagonal **Back / Home / Next** navigation at the bottom. A small hex badge beside
each player name shows their running total as it accrues.

1. **Setup** — add/remove players (1–4), edit each name, pick a color from the game's
   six tile colors. "Add player" until 4.
2. **VP track total** — typed number per player (values can reach ~250).
3. **Leftover goods** — stepper per player.
4. **Silverlings** — stepper per player.
5. **Worker tiles** — stepper per player; the row shows the derived `÷2` value.
6. **Yellow tiles** — stepper per player.
7. **Tiebreaker** *(conditional)* — only if the top total is shared: enter empty estate
   spaces per tied player; fewest wins.
8. **Final Scores** — grid (categories as rows, players as columns), 1st/2nd/3rd hex
   medals above a bold TOTAL row. A "New game" action resets.

## Visual Design

- **Palette:** parchment background gradient with Burgundy earth tones (ochre, terracotta,
  deep green, wine red). Player colors drawn from the game's six tile colors.
- **Typography:** Cinzel (medieval serif caps) for headings via Google Fonts, with a
  serif fallback; system serif/sans for body.
- **Hexagon motif:** nav buttons, running-total badges, and ranking medals are hexagons,
  echoing the game's hex tiles.
- **Players as colored hex tokens** rather than avatar images — no image assets required.
- **Responsive:** usable on a phone (primary, like the app) and on desktop.

## Architecture

Three static files under `static/burgundy-scorer/`, served at `/burgundy-scorer/`:

- `index.html` — markup shell and font link.
- `style.css` — all theming (palette, hexagons, parchment, responsive rules).
- `app.js` — vanilla JS: state, wizard step definitions, render, and scoring.

No framework, no bundler. PaperMod is bypassed for this page (it is a full-screen app,
not a themed content page), so it lives in `static/` rather than `content/`.

### State & rendering

```
state = {
  players: [{ name, color, scores: {track, goods, silverlings, workers, yellow}, tiebreak } ...],
  stepIndex: number
}
```

- A `steps` array declares the wizard: `setup`, one entry per category (with key,
  title, description, input type: `number` | `stepper`), conditional `tiebreaker`,
  and `results`. The renderer reads the current step and draws it; Back/Next move
  `stepIndex`. This keeps each step's definition data-driven and the categories easy
  to reorder or extend.
- `computeTotal(player)` applies the per-category rule (notably `floor(workers/2)`).
- `ranking()` sorts by total, then applies the tiebreak field, producing the medals
  and detecting whether the tiebreaker step is needed.
- State persists to `localStorage` so a refresh mid-scoring doesn't lose progress;
  "New game" clears it.

### Discoverability

Add a menu entry in `config.yaml` pointing to `/burgundy-scorer/` so the app is
reachable from the site nav. (A short announcement post like the existing Name Checker
post is optional and out of scope for this spec.)

## Testing

- **Scoring logic** is pure and unit-testable: extract `computeTotal` and `ranking`
  so they can be exercised with example inputs (including the `÷2` floor and a tie that
  triggers the tiebreaker). A lightweight test harness (a `test.html` or a small node
  script run with the built-in test runner) verifies these without a build step.
- **Manual verification:** run `hugo server`, walk a 3-player game end-to-end, confirm
  totals match a hand calculation and the podium ranks correctly, including a forced tie.

## Risks / Open Questions

- **Cinzel via Google Fonts** adds a network dependency; if offline rendering matters we
  fall back to a system serif (already in the font stack).
- Worker `÷2` rounding is floor (rules: "every two worker tiles: 1 point"); confirmed.
