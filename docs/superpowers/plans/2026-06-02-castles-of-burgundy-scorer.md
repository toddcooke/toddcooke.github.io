# Castles of Burgundy Score Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side Castles of Burgundy final-score calculator, styled after the Stonemaier Scores wizard, shipped as static files in the existing Hugo site at `/burgundy-scorer/`.

**Architecture:** Pure scoring logic lives in an ES module (`scoring.js`) that is unit-tested with `node --test` and imported by the browser UI. The UI (`app.js`) is a small vanilla-JS state machine that renders one wizard step at a time into a single `#app` container. No framework, no bundler — Hugo serves the files from `static/` as-is.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML, CSS, Hugo (static hosting), Node's built-in test runner for the scoring logic.

---

## File Structure

- `static/burgundy-scorer/index.html` — markup shell, font link, mounts `#app`, loads `app.js` as a module.
- `static/burgundy-scorer/style.css` — all theming: parchment palette, hexagons, responsive layout.
- `static/burgundy-scorer/scoring.js` — pure scoring logic (`CATEGORIES`, `categoryPoints`, `computeTotal`, `ranking`, `needsTiebreaker`). No DOM access.
- `static/burgundy-scorer/scoring.test.js` — `node --test` unit tests for `scoring.js`.
- `static/burgundy-scorer/app.js` — UI state machine: state, persistence, DOM helpers, and the per-step renderers. Imports from `scoring.js`.
- `config.yaml` — add a menu entry pointing at `/burgundy-scorer/`.

All players are represented as colored hexagon tokens (no image assets). Scoring is `final = track + goods + silverlings + floor(workers/2) + yellow`.

---

## Task 1: Scoring logic module (TDD)

**Files:**
- Create: `static/burgundy-scorer/scoring.js`
- Test: `static/burgundy-scorer/scoring.test.js`

- [ ] **Step 1: Write the failing tests**

Create `static/burgundy-scorer/scoring.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryPoints, computeTotal, ranking, needsTiebreaker, CATEGORIES } from './scoring.js';

test('CATEGORIES lists the five scoring rows in order', () => {
  assert.deepEqual(CATEGORIES.map(c => c.key), ['track', 'goods', 'silverlings', 'workers', 'yellow']);
});

test('categoryPoints is 1:1 except workers which floor-divide by 2', () => {
  assert.equal(categoryPoints('track', 142), 142);
  assert.equal(categoryPoints('goods', 3), 3);
  assert.equal(categoryPoints('silverlings', 4), 4);
  assert.equal(categoryPoints('yellow', 6), 6);
  assert.equal(categoryPoints('workers', 5), 2);
  assert.equal(categoryPoints('workers', 8), 4);
});

test('computeTotal sums all categories with the worker rule applied', () => {
  const scores = { track: 142, goods: 3, silverlings: 4, workers: 5, yellow: 6 };
  assert.equal(computeTotal(scores), 157); // 142 + 3 + 4 + 2 + 6
});

test('computeTotal treats missing categories as zero', () => {
  assert.equal(computeTotal({ track: 100 }), 100);
});

test('ranking sorts by total descending and assigns ranks', () => {
  const players = [
    { id: 'a', name: 'Sam', scores: { track: 138 } },
    { id: 'b', name: 'Todd', scores: { track: 157 } },
  ];
  const result = ranking(players);
  assert.deepEqual(result.map(p => p.name), ['Todd', 'Sam']);
  assert.deepEqual(result.map(p => p.rank), [1, 2]);
  assert.deepEqual(result.map(p => p.tied), [false, false]);
});

test('ranking breaks ties by fewest empty estate spaces', () => {
  const players = [
    { id: 'a', name: 'Sam', scores: { track: 150 }, tiebreak: 5 },
    { id: 'b', name: 'Todd', scores: { track: 150 }, tiebreak: 2 },
  ];
  const result = ranking(players);
  assert.deepEqual(result.map(p => p.name), ['Todd', 'Sam']);
  assert.deepEqual(result.map(p => p.rank), [1, 2]);
  assert.deepEqual(result.map(p => p.tied), [false, false]);
});

test('ranking marks players tied when total and tiebreak cannot separate them', () => {
  const players = [
    { id: 'a', name: 'Sam', scores: { track: 150 } },
    { id: 'b', name: 'Todd', scores: { track: 150 } },
  ];
  const result = ranking(players);
  assert.deepEqual(result.map(p => p.rank), [1, 1]);
  assert.deepEqual(result.map(p => p.tied), [true, true]);
});

test('needsTiebreaker is true only when two players share the same total', () => {
  assert.equal(needsTiebreaker([
    { id: 'a', scores: { track: 150 } },
    { id: 'b', scores: { track: 150 } },
  ]), true);
  assert.equal(needsTiebreaker([
    { id: 'a', scores: { track: 157 } },
    { id: 'b', scores: { track: 150 } },
  ]), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test static/burgundy-scorer/scoring.test.js`
Expected: FAIL — cannot find module `./scoring.js` (it does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `static/burgundy-scorer/scoring.js`:

```js
// Pure scoring logic for the Castles of Burgundy final-score calculator.
// No DOM access — safe to import in both the browser and `node --test`.

export const CATEGORIES = [
  { key: 'track',       label: 'VP track total',         input: 'number'  },
  { key: 'goods',       label: 'Leftover goods',         input: 'stepper' },
  { key: 'silverlings', label: 'Silverlings',            input: 'stepper' },
  { key: 'workers',     label: 'Worker tiles',           input: 'stepper' },
  { key: 'yellow',      label: 'Yellow (knowledge) tiles', input: 'stepper' },
];

// Points contributed by one category. Workers score 1 point per two tiles
// (floor); every other category is worth its face value.
export function categoryPoints(key, value) {
  const v = Number(value) || 0;
  if (key === 'workers') return Math.floor(v / 2);
  return v;
}

export function computeTotal(scores = {}) {
  return CATEGORIES.reduce((sum, c) => sum + categoryPoints(c.key, scores[c.key]), 0);
}

// Returns players sorted best-first, each annotated with { total, rank, tied }.
// Ties on total are broken by fewest empty estate spaces (`tiebreak`, lower wins);
// players that still cannot be separated share a rank and are flagged tied.
export function ranking(players) {
  const scored = players.map(p => ({ ...p, total: computeTotal(p.scores) }));

  const separable = (a, b) => {
    if (a.total !== b.total) return b.total - a.total;          // higher total first
    const at = a.tiebreak, bt = b.tiebreak;
    if (at == null || bt == null) return 0;                     // no tiebreak data → tied
    return at - bt;                                             // fewer empty spaces first
  };

  const sorted = [...scored].sort(separable);

  let rank = 0;
  return sorted.map((p, i) => {
    const prev = sorted[i - 1];
    const tiedWithPrev = prev && separable(prev, p) === 0;
    if (!tiedWithPrev) rank = i + 1;                            // standard competition ranking
    const next = sorted[i + 1];
    const tied = (tiedWithPrev) || (next && separable(p, next) === 0);
    return { ...p, rank, tied: Boolean(tied) };
  });
}

// True if any two players share the same total (so the tiebreaker step is worth asking).
export function needsTiebreaker(players) {
  const totals = players.map(p => computeTotal(p.scores));
  return new Set(totals).size !== totals.length;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test static/burgundy-scorer/scoring.test.js`
Expected: PASS — all tests green (8 passing).

- [ ] **Step 5: Commit**

```bash
git add static/burgundy-scorer/scoring.js static/burgundy-scorer/scoring.test.js
git commit -m "feat(burgundy-scorer): pure scoring logic with tests"
```

---

## Task 2: HTML shell and CSS theme

**Files:**
- Create: `static/burgundy-scorer/index.html`
- Create: `static/burgundy-scorer/style.css`

- [ ] **Step 1: Create the HTML shell**

Create `static/burgundy-scorer/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Castles of Burgundy — Score Calculator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main id="app" aria-live="polite"></main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the CSS theme**

Create `static/burgundy-scorer/style.css`:

```css
:root {
  --parchment-top: #efe3c8;
  --parchment-bottom: #d9c79c;
  --ink: #4a3220;
  --ink-soft: #7a5c3a;
  --heading: #6b3f2a;
  --row-bg: #f3ead2;
  --row-border: #b89b66;
  --hex-btn: #cdb27a;
  --back: #9a2a2a;
  --next: #3a7a3a;
  --wine: #9c3b35;
  --gold: #d4af37;
  --silver: #aaa;
  --bronze: #b07b46;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(var(--parchment-top), var(--parchment-bottom));
  background-attachment: fixed;
  color: var(--ink);
  font-family: Georgia, "Times New Roman", serif;
}

#app {
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

h1, h2, .step-title {
  font-family: "Cinzel", Georgia, serif;
  color: var(--heading);
  text-align: center;
  letter-spacing: 1px;
  margin: 0 0 4px;
}

.step-title { font-size: 1.5rem; }
.step-desc { text-align: center; color: var(--ink-soft); margin: 0 0 20px; font-size: 0.95rem; }

/* Player rows */
.player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--row-bg);
  border: 1px solid var(--row-border);
  border-radius: 12px;
  padding: 8px 10px;
  margin-bottom: 10px;
}
.player-row .name { flex: 1; font-weight: bold; color: var(--ink); }
.player-row input.name-input {
  flex: 1; font: inherit; font-weight: bold; color: var(--ink);
  background: transparent; border: none; border-bottom: 1px dashed var(--row-border);
}

/* Hexagons */
.hex {
  display: inline-flex; align-items: center; justify-content: center;
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  color: #fff; font-weight: bold; user-select: none;
}
.token { width: 30px; height: 30px; font-size: 0.7rem; }   /* running-total / player color */
.hex-btn {
  width: 34px; height: 34px; background: var(--hex-btn); color: var(--ink);
  font-size: 1.2rem; border: none; cursor: pointer;
}
.hex-btn:active { filter: brightness(0.92); }

.stepper { display: inline-flex; align-items: center; gap: 10px; }
.stepper .value { min-width: 28px; text-align: center; font-weight: bold; font-size: 1.1rem; }
input.num-input {
  width: 84px; font: inherit; text-align: center; padding: 6px;
  border: 1px solid var(--row-border); border-radius: 8px; background: #fff;
}

/* Color picker swatches (setup) */
.swatches { display: flex; gap: 6px; }
.swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
.swatch.selected { border-color: var(--ink); }

.add-player {
  display: block; width: 100%; margin: 4px 0 16px; padding: 10px;
  border: 1px dashed var(--row-border); border-radius: 12px;
  background: transparent; color: var(--ink-soft); font: inherit; cursor: pointer;
}

/* Bottom hex navigation */
.nav {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; justify-content: center; gap: 28px;
  padding: 12px; background: linear-gradient(transparent, var(--parchment-bottom) 40%);
}
.nav button {
  font-family: "Cinzel", serif; font-weight: 700; font-size: 0.95rem;
  background: none; border: none; cursor: pointer; color: var(--ink-soft);
}
.nav button.back { color: var(--back); }
.nav button.next { color: var(--next); }
.nav button:disabled { opacity: 0.35; cursor: default; }

/* Results grid */
table.results { width: 100%; border-collapse: collapse; margin-top: 8px; }
table.results th, table.results td { padding: 6px 8px; text-align: center; }
table.results th:first-child, table.results td:first-child { text-align: left; }
table.results tr + tr td { border-top: 1px solid var(--row-border); }
table.results tr.total td { border-top: 2px solid var(--heading); font-weight: bold; font-size: 1.2rem; }
.medals { display: flex; justify-content: space-around; margin: 14px 0 6px; }
.medal { width: 48px; height: 48px; font-size: 0.8rem; }
.medal.r1 { background: var(--gold); }
.medal.r2 { background: var(--silver); }
.medal.r3 { background: var(--bronze); }
.new-game {
  display: block; margin: 24px auto 0; padding: 10px 20px;
  font-family: "Cinzel", serif; background: var(--wine); color: #fff;
  border: none; border-radius: 10px; cursor: pointer;
}
```

- [ ] **Step 3: Verify the shell renders**

Run: `hugo server` (from repo root), then open `http://localhost:1313/burgundy-scorer/`.
Expected: a parchment-gradient page with an empty `#app` (no JS yet). No console errors except optionally a 404 for `app.js` until Task 3. Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add static/burgundy-scorer/index.html static/burgundy-scorer/style.css
git commit -m "feat(burgundy-scorer): HTML shell and parchment theme"
```

---

## Task 3: App bootstrap — state, render loop, and setup step

**Files:**
- Create: `static/burgundy-scorer/app.js`

- [ ] **Step 1: Create app.js with state, helpers, render dispatch, and the setup step**

Create `static/burgundy-scorer/app.js`:

```js
import { CATEGORIES, categoryPoints, computeTotal, ranking, needsTiebreaker } from './scoring.js';

const COLORS = ['#6f8a3f', '#3d6e9c', '#c9a227', '#8a5a2b', '#7d7f86', '#9c3b35'];
const MAX_PLAYERS = 4;
let nextId = 1;

function newPlayer() {
  const used = state.players.map(p => p.color);
  const color = COLORS.find(c => !used.includes(c)) || COLORS[0];
  return { id: `p${nextId++}`, name: `Player ${state.players.length + 1}`, color, scores: {}, tiebreak: null };
}

// Wizard steps: setup, one per scoring category, conditional tiebreaker, results.
const STEPS = [
  { kind: 'setup' },
  ...CATEGORIES.map(c => ({ kind: 'category', category: c })),
  { kind: 'tiebreaker' },
  { kind: 'results' },
];

const state = { players: [], stepIndex: 0 };

// ---- DOM helpers -----------------------------------------------------------
const app = document.getElementById('app');

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function hexToken(text, color) {
  return el('span', { class: 'hex token', style: `background:${color}` }, [String(text)]);
}

// ---- Navigation ------------------------------------------------------------
function currentStep() { return STEPS[state.stepIndex]; }

function isStepDisabled(step) {
  // Skip the tiebreaker screen unless two players actually tie.
  return step.kind === 'tiebreaker' && !needsTiebreaker(state.players);
}

function go(delta) {
  let i = state.stepIndex + delta;
  while (STEPS[i] && isStepDisabled(STEPS[i])) i += delta;   // hop over skipped steps
  if (i < 0 || i >= STEPS.length) return;
  state.stepIndex = i;
  render();
}

function navBar({ nextLabel = 'Next', canNext = true } = {}) {
  return el('div', { class: 'nav' }, [
    el('button', { class: 'back', text: '◀ Back', disabled: state.stepIndex === 0 ? 'true' : null,
      onclick: () => go(-1) }),
    el('button', { class: 'home', text: '⌂ Home', onclick: () => { resetGame(); } }),
    el('button', { class: 'next', text: `${nextLabel} ▶`, disabled: canNext ? null : 'true',
      onclick: () => go(1) }),
  ]);
}

// ---- Step: setup -----------------------------------------------------------
function renderSetup() {
  app.appendChild(el('h1', { class: 'step-title', text: 'Castles of Burgundy' }));
  app.appendChild(el('p', { class: 'step-desc', text: 'Add players, then score the game' }));

  for (const p of state.players) {
    const swatches = el('div', { class: 'swatches' },
      COLORS.map(c => el('span', {
        class: 'swatch' + (c === p.color ? ' selected' : ''),
        style: `background:${c}`,
        onclick: () => { p.color = c; render(); },
      })));

    app.appendChild(el('div', { class: 'player-row' }, [
      hexToken(state.players.indexOf(p) + 1, p.color),
      el('input', { class: 'name-input', value: p.name,
        oninput: (e) => { p.name = e.target.value; } }),
      swatches,
      el('button', { class: 'hex-btn hex', text: '−', onclick: () => {
        state.players = state.players.filter(x => x !== p); render();
      } }),
    ]));
  }

  if (state.players.length < MAX_PLAYERS) {
    app.appendChild(el('button', { class: 'add-player', text: '＋ Add player',
      onclick: () => { state.players.push(newPlayer()); render(); } }));
  }

  app.appendChild(navBar({ canNext: state.players.length >= 1 }));
}

// ---- Render dispatch -------------------------------------------------------
function render() {
  app.innerHTML = '';
  const step = currentStep();
  if (step.kind === 'setup') renderSetup();
  else if (step.kind === 'category') renderCategory(step.category);
  else if (step.kind === 'tiebreaker') renderTiebreaker();
  else if (step.kind === 'results') renderResults();
}

function resetGame() {
  state.players = [];
  state.stepIndex = 0;
  render();
}

// Boot: start with two players on the setup screen.
state.players = [newPlayer(), newPlayer()];
render();
```

Note: `renderCategory`, `renderTiebreaker`, and `renderResults` are added in later
tasks. Function declarations hoist, so referencing them before they exist in the file
is fine — but they must be defined before this task's screens past setup are exercised.
To keep this task runnable on its own, temporarily stub them.

- [ ] **Step 2: Add temporary stubs so the app boots without the later renderers**

Append to `static/burgundy-scorer/app.js` (these are replaced in Tasks 4–6):

```js
// --- Temporary stubs (replaced in Tasks 4-6) ---
function renderCategory(category) {
  app.appendChild(el('h2', { class: 'step-title', text: category.label }));
  app.appendChild(navBar());
}
function renderTiebreaker() {
  app.appendChild(el('h2', { class: 'step-title', text: 'Tiebreaker' }));
  app.appendChild(navBar());
}
function renderResults() {
  app.appendChild(el('h2', { class: 'step-title', text: 'Final Scores' }));
  app.appendChild(navBar());
}
```

- [ ] **Step 3: Verify the setup screen works**

Run: `hugo server`, open `http://localhost:1313/burgundy-scorer/`.
Expected: two player rows with editable names, color swatches, and a − button; an "Add player" button (disappears at 4 players); Back disabled on the first screen; clicking Next advances to a bare "VP track total" title. No console errors. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add static/burgundy-scorer/app.js
git commit -m "feat(burgundy-scorer): app state machine and setup step"
```

---

## Task 4: Category step — number and stepper inputs with running totals

**Files:**
- Modify: `static/burgundy-scorer/app.js` (replace the `renderCategory` stub)

- [ ] **Step 1: Replace the `renderCategory` stub with the real implementation**

In `static/burgundy-scorer/app.js`, delete the temporary `renderCategory` stub (from Task 3 Step 2) and add this function in its place:

```js
function setScore(player, key, value) {
  const v = Math.max(0, Number(value) || 0);
  player.scores = { ...player.scores, [key]: v };
}

function runningTotalUpTo(player, key) {
  // Sum of categories entered up to and including `key`, in CATEGORIES order.
  let sum = 0;
  for (const c of CATEGORIES) {
    sum += categoryPoints(c.key, player.scores[c.key]);
    if (c.key === key) break;
  }
  return sum;
}

function renderCategory(category) {
  app.appendChild(el('h2', { class: 'step-title', text: category.label }));
  const desc = {
    track: 'Each player’s running total already on the board',
    goods: 'Each unsold goods tile = 1 point',
    silverlings: 'Each remaining silverling = 1 point',
    workers: 'Every two worker tiles = 1 point',
    yellow: 'Total points from VP-bearing yellow tiles',
  }[category.key];
  app.appendChild(el('p', { class: 'step-desc', text: desc }));

  for (const p of state.players) {
    const value = p.scores[category.key] || 0;
    let valueNode;

    let inputControl;
    if (category.input === 'number') {
      inputControl = el('input', {
        class: 'num-input', type: 'number', min: '0', inputmode: 'numeric', value,
        oninput: (e) => { setScore(p, category.key, e.target.value); badge.textContent = runningTotalUpTo(p, category.key); },
      });
    } else {
      valueNode = el('span', { class: 'value', text: String(value) });
      const bump = (delta) => {
        setScore(p, category.key, (p.scores[category.key] || 0) + delta);
        valueNode.textContent = p.scores[category.key];
        badge.textContent = runningTotalUpTo(p, category.key);
      };
      inputControl = el('div', { class: 'stepper' }, [
        el('button', { class: 'hex-btn hex', text: '−', onclick: () => bump(-1) }),
        valueNode,
        el('button', { class: 'hex-btn hex', text: '＋', onclick: () => bump(1) }),
      ]);
    }

    const badge = hexToken(runningTotalUpTo(p, category.key), p.color);

    app.appendChild(el('div', { class: 'player-row' }, [
      badge,
      el('span', { class: 'name', text: p.name }),
      inputControl,
    ]));
  }

  app.appendChild(navBar({ nextLabel: 'Next' }));
}
```

- [ ] **Step 2: Verify category screens work**

Run: `hugo server`, open the page, click through Setup → Next.
Expected:
- "VP track total" shows a typed number field per player; typing updates that player's hex badge total.
- "Leftover goods", "Silverlings", "Worker tiles", "Yellow tiles" each show − / ＋ steppers; the value can't go below 0; the hex badge reflects the running total (note the Workers screen badge only increases by 1 for every 2 workers).
Stop the server.

- [ ] **Step 3: Commit**

```bash
git add static/burgundy-scorer/app.js
git commit -m "feat(burgundy-scorer): category screens with steppers and running totals"
```

---

## Task 5: Tiebreaker step

**Files:**
- Modify: `static/burgundy-scorer/app.js` (replace the `renderTiebreaker` stub)

- [ ] **Step 1: Replace the `renderTiebreaker` stub**

In `static/burgundy-scorer/app.js`, delete the temporary `renderTiebreaker` stub and add:

```js
function renderTiebreaker() {
  app.appendChild(el('h2', { class: 'step-title', text: 'Tiebreaker' }));
  app.appendChild(el('p', { class: 'step-desc',
    text: 'Some players are tied. Enter empty estate spaces — fewest wins.' }));

  // Only the players involved in a tie need an entry, but showing all is simpler
  // and harmless (untied players' tiebreak values never affect their rank).
  for (const p of state.players) {
    app.appendChild(el('div', { class: 'player-row' }, [
      hexToken(computeTotal(p.scores), p.color),
      el('span', { class: 'name', text: p.name }),
      el('input', {
        class: 'num-input', type: 'number', min: '0', inputmode: 'numeric',
        value: p.tiebreak ?? '',
        oninput: (e) => { p.tiebreak = e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0); },
      }),
    ]));
  }

  app.appendChild(navBar({ nextLabel: 'Results' }));
}
```

- [ ] **Step 2: Verify the tiebreaker screen appears only on a tie**

Run: `hugo server`, open the page.
- Give two players **different** totals, click through to the end: the tiebreaker screen is **skipped** (Next on Yellow tiles goes straight to Final Scores).
- Restart, give two players the **same** total: the tiebreaker screen **appears** after Yellow tiles, with an empty-estate-spaces field per player.
Stop the server.

- [ ] **Step 3: Commit**

```bash
git add static/burgundy-scorer/app.js
git commit -m "feat(burgundy-scorer): conditional tiebreaker step"
```

---

## Task 6: Final Scores results step

**Files:**
- Modify: `static/burgundy-scorer/app.js` (replace the `renderResults` stub)

- [ ] **Step 1: Replace the `renderResults` stub**

In `static/burgundy-scorer/app.js`, delete the temporary `renderResults` stub and add:

```js
function renderResults() {
  app.appendChild(el('h2', { class: 'step-title', text: 'Final Scores' }));

  const ranked = ranking(state.players);
  const byId = Object.fromEntries(ranked.map(p => [p.id, p]));
  const order = state.players;   // keep column order stable (setup order)

  const table = el('table', { class: 'results' });

  // Header: player names in their colors.
  const head = el('tr', {}, [el('th', { text: '' })]);
  for (const p of order) head.appendChild(el('th', { style: `color:${p.color}`, text: p.name }));
  table.appendChild(head);

  // One row per category, showing points contributed (workers already halved).
  for (const c of CATEGORIES) {
    const row = el('tr', {}, [el('td', { text: c.label })]);
    for (const p of order) row.appendChild(el('td', { text: String(categoryPoints(c.key, p.scores[c.key])) }));
    table.appendChild(row);
  }
  app.appendChild(table);

  // Medals row (1st/2nd/3rd) above totals, in column order.
  const medals = el('div', { class: 'medals' });
  for (const p of order) {
    const r = byId[p.id].rank;
    const label = r === 1 ? '1ST' : r === 2 ? '2ND' : r === 3 ? '3RD' : `${r}TH`;
    const cls = r <= 3 ? `medal hex r${r}` : 'medal hex';
    medals.appendChild(el('span', { class: cls, style: r > 3 ? `background:${p.color}` : null,
      text: byId[p.id].tied ? `${label} (tie)` : label }));
  }
  app.appendChild(medals);

  const totals = el('table', { class: 'results' }, [
    el('tr', { class: 'total' }, [
      el('td', { text: 'TOTAL' }),
      ...order.map(p => el('td', { style: `color:${p.color}`, text: String(byId[p.id].total) })),
    ]),
  ]);
  app.appendChild(totals);

  app.appendChild(el('button', { class: 'new-game', text: 'New game', onclick: () => resetGame() }));
  // No nav bar on the results screen; "New game" returns to setup.
}
```

- [ ] **Step 2: Verify the results screen against a hand calculation**

Run: `hugo server`. Play a 3-player game:
- Todd: track 142, goods 3, silverlings 4, workers 5, yellow 6 → **157**
- Sam: track 138, goods 1, silverlings 2, workers 3, yellow 0 → **142**
- Pat: track 120, goods 5, silverlings 0, workers 8, yellow 4 → **133**

Expected on Final Scores: per-category rows match the inputs (Workers row shows 2 / 1 / 4), TOTAL row shows 157 / 142 / 133, medals read 1ST (Todd), 2ND (Sam), 3RD (Pat). "New game" returns to a fresh setup screen. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add static/burgundy-scorer/app.js
git commit -m "feat(burgundy-scorer): final scores grid with medals"
```

---

## Task 7: Persist progress to localStorage

**Files:**
- Modify: `static/burgundy-scorer/app.js`

- [ ] **Step 1: Add save/load and wire them into render and reset**

In `static/burgundy-scorer/app.js`, add these functions just below the `state` declaration:

```js
const STORAGE_KEY = 'cob-scorer-v1';

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.players) || saved.players.length === 0) return false;
    state.players = saved.players;
    state.stepIndex = saved.stepIndex || 0;
    nextId = saved.players.reduce((m, p) => Math.max(m, Number(String(p.id).slice(1)) + 1), 1);
    return true;
  } catch { return false; }
}
```

- [ ] **Step 2: Call `save()` at the end of `render()` and clear storage in `resetGame()`**

In `render()`, add `save();` as the last line of the function. Replace `resetGame()` with:

```js
function resetGame() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  state.players = [newPlayer(), newPlayer()];
  state.stepIndex = 0;
  render();
}
```

- [ ] **Step 3: Replace the boot block to restore saved games**

Replace the final boot lines (`state.players = [newPlayer(), newPlayer()];` / `render();`) with:

```js
// Boot: restore an in-progress game, else start fresh with two players.
if (!load()) state.players = [newPlayer(), newPlayer()];
render();
```

- [ ] **Step 4: Verify persistence**

Run: `hugo server`. Add a third player, enter some scores, advance a couple of steps, then **reload the page**.
Expected: players, scores, and the current step are restored. Click "New game" (or Home) and reload: it starts fresh with two players. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add static/burgundy-scorer/app.js
git commit -m "feat(burgundy-scorer): persist in-progress game to localStorage"
```

---

## Task 8: Add nav link and final end-to-end verification

**Files:**
- Modify: `config.yaml`

- [ ] **Step 1: Add a menu entry**

In `config.yaml`, under `menu.main`, add this entry (keep existing entries; insert before the `rss` entry so weights stay ordered):

```yaml
    - identifier: burgundy
      name: burgundy scorer
      url: /burgundy-scorer/
      weight: 25
```

- [ ] **Step 2: Full end-to-end verification**

Run: `hugo server`. From the site homepage, confirm the "burgundy scorer" nav link appears and opens `/burgundy-scorer/`. Then run one complete game end-to-end:
- 4 players, custom names and distinct colors.
- Enter scores including an intentional **tie for first** (two players with the same total) to confirm the tiebreaker screen appears; give them different empty-estate values and confirm the lower value ranks first on Final Scores with no "(tie)" marker.
- Confirm totals match hand calculations and "New game" resets.
Stop the server.

- [ ] **Step 3: Run the scoring tests once more**

Run: `node --test static/burgundy-scorer/scoring.test.js`
Expected: PASS (8 passing).

- [ ] **Step 4: Commit**

```bash
git add config.yaml
git commit -m "feat(burgundy-scorer): add site nav link to the scorer"
```

---

## Verification Checklist (whole feature)

- [ ] `node --test static/burgundy-scorer/scoring.test.js` passes.
- [ ] Setup supports 1–4 players with editable names and the six tile colors.
- [ ] Each category screen records input and updates running-total hex badges; Workers halves (floor).
- [ ] Tiebreaker screen appears only on a tie and resolves by fewest empty estate spaces.
- [ ] Final Scores grid totals match `final = track + goods + silverlings + floor(workers/2) + yellow`; medals rank correctly.
- [ ] Progress survives a page reload; "New game" / Home resets.
- [ ] "burgundy scorer" nav link reaches `/burgundy-scorer/`.
```
