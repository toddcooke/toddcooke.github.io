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

test('ranking uses competition ranking: two tie for 1st, third gets rank 3', () => {
  const players = [
    { id: 'a', name: 'Sam', scores: { track: 150 } },
    { id: 'b', name: 'Todd', scores: { track: 150 } },
    { id: 'c', name: 'Pat', scores: { track: 120 } },
  ];
  const result = ranking(players);
  const byName = Object.fromEntries(result.map(p => [p.name, p]));
  assert.equal(byName.Sam.rank, 1);
  assert.equal(byName.Todd.rank, 1);
  assert.equal(byName.Pat.rank, 3);
  assert.equal(byName.Sam.tied, true);
  assert.equal(byName.Todd.tied, true);
  assert.equal(byName.Pat.tied, false);
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
