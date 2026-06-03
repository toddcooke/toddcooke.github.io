# Monastery Tile Scoring (2019 edition)

**Date:** 2026-06-03
**Status:** Approved

## Goal

Add end-game victory-point scoring for Castles of Burgundy (2019 edition)
monastery tiles to the burgundy-scorer table, contributing to each player's
Total.

## Context

- The app (`burgundy-scorer/src/App.tsx`) is a per-player score table: rows are
  categories, columns are players, a `<tfoot>` Total row sums each player.
- Existing scoring rows are numeric, each worth 1 VP per unit: `boardVp`,
  `unsoldGoodsTiles`, `silverCoins`, `workerChipsPair`.
- `playerTotal(p)` currently sums those fields (all ×1).
- Color-bonus tracking was intentionally removed (bonuses are already on the VP
  track / `boardVp`).

## Scoring rules (2019 rulebook, pages 9–11)

Only five monastery tiles score at end of game; all others are in-game effects.

| Tile(s)        | Rule                                              | VP/unit |
|----------------|---------------------------------------------------|---------|
| #15            | per *type* of goods sold                          | 2       |
| #16–23, #29    | per building of the matching type placed          | 4       |
| #24            | per *distinct livestock type* placed              | 4       |
| #25            | per goods tile sold                               | 1       |
| #26            | per bonus tile (large or small) owned             | 3       |

The building-type tiles (#16–23, #29) all share the same "4 VP per matching
building" rule, so they collapse into a single count input (total buildings
matched across whatever building-monasteries the player owns).

## Design (Approach A: count rows with per-unit multiplier)

### Data model

`Player` gains five numeric fields (all default 0):

- `goodsTypesSold` — distinct goods types sold (#15)
- `buildingMonasteryMatches` — buildings matched by owned building-monasteries (#16–23, #29)
- `livestockTypes` — distinct livestock types placed (#24)
- `goodsSold` — goods tiles sold (#25)
- `bonusTilesOwned` — large + small bonus tiles owned (#26)

### Row model

The `SCORE_ROWS` entry type gains `vpPerUnit: number`:

- Existing rows: `vpPerUnit: 1`.
- Monastery rows: 2, 4, 4, 1, 3 respectively.

Labels state the rate so the count's meaning is clear, e.g.
"Goods variety monastery (2 VP/type)", "Building monastery (4 VP/building)",
"Livestock variety monastery (4 VP/type)", "Goods sold monastery (1 VP/tile)",
"Bonus-tile monastery (3 VP/tile)".

### Scoring

`playerTotal(p)` becomes `Σ over rows (p[row.key] × row.vpPerUnit)`.

### UI

No structural change: the five monastery rows render as the existing numeric
`<input type="number">` cells. The Total footer, add-player button, and editable
player names are unchanged. Monastery rows appear after the four base rows.

### Behavior assumptions

- **Count-only inputs:** a player who does not own a given monastery leaves its
  count at 0 (no separate "owns this tile?" checkbox). The user is trusted to
  enter 0 for monasteries they lack.
- Inputs keep `min={0}`, `inputMode="numeric"`, and per-cell `aria-label`s.

## Out of scope

- In-game-effect monastery tiles (#1–14, #27, #28).
- A per-player tile picker (Approach B).
- 1st-edition values (2019 only).
- Validation/caps on counts (e.g. max goods types); trust user input.
