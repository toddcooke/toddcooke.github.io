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
