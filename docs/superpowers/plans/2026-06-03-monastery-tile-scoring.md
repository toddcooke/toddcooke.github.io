# Monastery Tile Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add end-game scoring for the five 2019-edition monastery tiles to the burgundy-scorer table so they contribute to each player's Total.

**Architecture:** Extend the existing per-player score table. Add five numeric `Player` fields (one per scoring monastery rule) and give each `SCORE_ROWS` entry a `vpPerUnit` multiplier. `playerTotal` becomes a weighted sum (`count × vpPerUnit`). The five monastery rows render with the existing numeric `<input>` cells — no structural UI change.

**Tech Stack:** React 18, TypeScript, Vite. No test framework in this project; verification is `npm run typecheck` + `npm run build` + a manual total check.

---

## File Structure

- Modify: `burgundy-scorer/src/App.tsx` — the entire feature lives here (data model, `SCORE_ROWS`, `playerTotal`). No new files.

All commands run from `burgundy-scorer/`.

---

### Task 1: Add the five monastery fields to the data model

**Files:**
- Modify: `burgundy-scorer/src/App.tsx`

- [ ] **Step 1: Add the five fields to the `Player` interface**

Replace the `Player` interface with:

```tsx
interface Player {
    id: string;
    name: string;
    boardVp: number;          // running VP track (already includes color bonuses)
    unsoldGoodsTiles: number; // 1 VP each
    silverCoins: number;      // 1 VP each
    workerChipsPair: number;  // 1 VP per pair
    goodsTypesSold: number;        // monastery #15: 2 VP per goods type sold
    buildingMonasteryMatches: number; // monastery #16-23/#29: 4 VP per matching building
    livestockTypes: number;        // monastery #24: 4 VP per distinct livestock type
    goodsSold: number;             // monastery #25: 1 VP per goods tile sold
    bonusTilesOwned: number;       // monastery #26: 3 VP per bonus tile owned
}
```

- [ ] **Step 2: Add the five keys to `NumericKey`**

Replace the `NumericKey` type with:

```tsx
type NumericKey =
    | "boardVp"
    | "unsoldGoodsTiles"
    | "silverCoins"
    | "workerChipsPair"
    | "goodsTypesSold"
    | "buildingMonasteryMatches"
    | "livestockTypes"
    | "goodsSold"
    | "bonusTilesOwned";
```

- [ ] **Step 3: Initialize the five fields in `makePlayer`**

Replace the `makePlayer` return object with:

```tsx
    return {
        id: crypto.randomUUID(),
        name,
        boardVp: 0,
        unsoldGoodsTiles: 0,
        silverCoins: 0,
        workerChipsPair: 0,
        goodsTypesSold: 0,
        buildingMonasteryMatches: 0,
        livestockTypes: 0,
        goodsSold: 0,
        bonusTilesOwned: 0,
    };
```

- [ ] **Step 4: Verify it still typechecks and builds**

Run: `npm run typecheck && npm run build`
Expected: typecheck exits 0; build prints `✓ built`. (The new fields exist but aren't shown or scored yet — that's Task 2.)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(burgundy-scorer): add monastery scoring fields to Player"
```

---

### Task 2: Score and display the monastery rows

**Files:**
- Modify: `burgundy-scorer/src/App.tsx`

- [ ] **Step 1: Add `vpPerUnit` to the row model and the five monastery rows**

Replace the `SCORE_ROWS` declaration (the `const SCORE_ROWS: { label: string; key: NumericKey }[] = [ ... ];` block) with:

```tsx
// One entry per table row: a label, the Player field it edits, and VP per unit.
const SCORE_ROWS: { label: string; key: NumericKey; vpPerUnit: number }[] = [
    { label: "Board VP", key: "boardVp", vpPerUnit: 1 },
    { label: "Unsold goods tiles", key: "unsoldGoodsTiles", vpPerUnit: 1 },
    { label: "Silver coins", key: "silverCoins", vpPerUnit: 1 },
    { label: "Worker chips (pairs)", key: "workerChipsPair", vpPerUnit: 1 },
    // 2019-edition monastery tiles that score at end of game. Enter the count
    // only if you own that monastery; leave 0 otherwise.
    { label: "Goods variety monastery (2 VP/type)", key: "goodsTypesSold", vpPerUnit: 2 },
    { label: "Building monastery (4 VP/building)", key: "buildingMonasteryMatches", vpPerUnit: 4 },
    { label: "Livestock variety monastery (4 VP/type)", key: "livestockTypes", vpPerUnit: 4 },
    { label: "Goods sold monastery (1 VP/tile)", key: "goodsSold", vpPerUnit: 1 },
    { label: "Bonus-tile monastery (3 VP/tile)", key: "bonusTilesOwned", vpPerUnit: 3 },
];
```

- [ ] **Step 2: Make `playerTotal` a weighted sum**

Replace the `playerTotal` function body with:

```tsx
// Total VP: each category's count multiplied by its VP-per-unit.
function playerTotal(p: Player): number {
    return SCORE_ROWS.reduce((sum, row) => sum + p[row.key] * row.vpPerUnit, 0);
}
```

- [ ] **Step 3: Verify typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: typecheck exits 0; build prints `✓ built`. The five monastery rows now render automatically (the `SCORE_ROWS.map` in the table body already handles any numeric row), and they feed the Total.

- [ ] **Step 4: Manual total check**

Run: `npm run dev`, open the printed URL, and for the default "todd" player set:
- Board VP = `10`
- Goods variety monastery = `4`  (expect +8)
- Bonus-tile monastery = `3`     (expect +9)

Expected: the Total cell reads `27` (10 + 4×2 + 3×3). Confirms `vpPerUnit` multipliers apply correctly.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(burgundy-scorer): score monastery tiles in player totals"
```

---

## Self-Review notes

- **Spec coverage:** five fields (Task 1) ↔ five scoring rules; `vpPerUnit` multipliers 2/4/4/1/3 and existing ×1 (Task 2 Step 1); weighted `playerTotal` (Task 2 Step 2); labels state the rate; count-only inputs reuse existing numeric cells (no UI change). All spec items covered.
- **Key names** (`goodsTypesSold`, `buildingMonasteryMatches`, `livestockTypes`, `goodsSold`, `bonusTilesOwned`) are identical across the interface, `NumericKey`, `makePlayer`, and `SCORE_ROWS`.
- **No tests:** project has no test framework (matches spec's out-of-scope list); verification is typecheck + build + manual check.
