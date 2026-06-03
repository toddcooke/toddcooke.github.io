# Burgundy Scorer — Empty React Scaffold

**Date:** 2026-06-03
**Status:** Approved

## Goal

Replace the deleted vanilla-JS `burgundy-scorer` app with an empty static React
scaffold that builds cleanly into this Hugo site and deploys to GitHub Pages at
`/burgundy-scorer/`. "Empty" means a working app that renders a single
placeholder component and nothing more — no scoring logic.

## Context

- This repo is a Hugo site deployed to GitHub Pages via `.github/workflows/hugo.yaml`.
- The workflow's only build step today is `hugo --gc --minify`; it publishes `./public`.
- Hugo copies `static/` verbatim into `public/`, so files in
  `static/burgundy-scorer/` are served at `/burgundy-scorer/`.
- The old vanilla-JS app (`app.js`, `scoring.js`, `scoring.test.js`, `style.css`)
  was already deleted; a placeholder `static/burgundy-scorer/index.html` remains.

## Approach

Vite + React in a self-contained top-level source directory that builds its
output into Hugo's `static/` folder.

### Source layout

```
burgundy-scorer/            # React source (NOT in static/)
  package.json
  vite.config.js
  index.html                # Vite entry
  src/
    main.jsx
    App.jsx
```

### Vite config

- `base: '/burgundy-scorer/'` — assets resolve correctly under the subpath.
- `build.outDir: '../static/burgundy-scorer'` with `emptyOutDir: true` — emits
  `index.html` + hashed `assets/` exactly where Hugo expects them.

### Build output

- `static/burgundy-scorer/` is a **build artifact**: gitignored, regenerated in
  CI, never committed. The existing committed
  `static/burgundy-scorer/index.html` is removed.

### CI change

Add one step to `.github/workflows/hugo.yaml`, before "Build with Hugo":

```yaml
- name: Build burgundy-scorer (React)
  run: cd burgundy-scorer && npm ci && npm run build
```

Requires a Node setup step (`actions/setup-node`) since the runner needs Node
with a cached/clean install. Hugo then copies the built output into `public/`.

### App content

- `App.jsx` renders `<h1>Castles of Burgundy — Score Calculator</h1>` only.

## Local development

- `cd burgundy-scorer && npm run dev` — React app standalone with HMR.
- `cd burgundy-scorer && npm run build` then `hugo serve` — integrated view.

## Trade-offs

- Because build output is gitignored, `hugo serve` alone shows nothing until
  `npm run build` has run once. Accepted cost of not committing artifacts.

## Out of scope

- Any scoring logic, game state, styling system, or tests beyond what a default
  Vite React template ships with.
