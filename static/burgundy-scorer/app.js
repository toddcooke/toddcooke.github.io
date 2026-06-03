// categoryPoints/computeTotal/ranking are used by the category & results steps (added in later tasks).
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
    else if (typeof v === 'boolean') { if (v) node.setAttribute(k, ''); }
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
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
      COLORS.map(c => {
        const takenByOther = state.players.some(other => other !== p && other.color === c);
        let cls = 'swatch';
        if (c === p.color) cls += ' selected';
        else if (takenByOther) cls += ' taken';
        return el('span', {
          class: cls,
          style: `background:${c}`,
          onclick: takenByOther ? null : () => { p.color = c; render(); },
        });
      }));

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

// Seed a fresh game with two players (appended one at a time so each gets a
// distinct auto-name and color from newPlayer()).
function seedTwoPlayers() {
  state.players.push(newPlayer());
  state.players.push(newPlayer());
}

// Boot: start with two players on the setup screen.
seedTwoPlayers();
render();

// --- Temporary stubs (replaced in Tasks 4-6) ---
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
    track: 'Each player's running total already on the board',
    goods: 'Each unsold goods tile = 1 point',
    silverlings: 'Each remaining silverling = 1 point',
    workers: 'Every two worker tiles = 1 point',
    yellow: 'Total points from VP-bearing yellow tiles',
  }[category.key];
  app.appendChild(el('p', { class: 'step-desc', text: desc }));

  for (const p of state.players) {
    const value = p.scores[category.key] || 0;
    const badge = hexToken(runningTotalUpTo(p, category.key), p.color);
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

    app.appendChild(el('div', { class: 'player-row' }, [
      badge,
      el('span', { class: 'name', text: p.name }),
      inputControl,
    ]));
  }

  app.appendChild(navBar({ nextLabel: 'Next' }));
}
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
