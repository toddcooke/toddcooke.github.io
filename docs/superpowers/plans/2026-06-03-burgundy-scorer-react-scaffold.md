# Burgundy Scorer React Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an empty Vite + React app whose build output lands in Hugo's `static/burgundy-scorer/` and deploys to GitHub Pages at `/burgundy-scorer/`.

**Architecture:** React source lives in a self-contained top-level `burgundy-scorer/` directory. Vite is configured with `base: '/burgundy-scorer/'` and `outDir: '../static/burgundy-scorer'` so `npm run build` emits files exactly where Hugo copies `static/` verbatim into `public/`. The build output is gitignored and regenerated in CI by a new workflow step that runs before the Hugo build.

**Tech Stack:** Vite 6, React 18, GitHub Actions, Hugo (existing).

---

## File Structure

- Create: `burgundy-scorer/package.json` — npm manifest, scripts (`dev`, `build`, `preview`), React + Vite deps.
- Create: `burgundy-scorer/vite.config.js` — base path + outDir into Hugo `static/`.
- Create: `burgundy-scorer/index.html` — Vite HTML entry, mounts `#root`.
- Create: `burgundy-scorer/src/main.jsx` — React root render.
- Create: `burgundy-scorer/src/App.jsx` — single placeholder component.
- Create: `burgundy-scorer/.gitignore` — ignore `node_modules`, `dist`.
- Modify: `.gitignore` — ignore `/static/burgundy-scorer/` (build artifact).
- Delete: `static/burgundy-scorer/index.html` — stale placeholder.
- Modify: `.github/workflows/hugo.yaml` — add Node setup + React build step before Hugo.

---

### Task 1: Scaffold the Vite + React source

**Files:**
- Create: `burgundy-scorer/package.json`
- Create: `burgundy-scorer/vite.config.js`
- Create: `burgundy-scorer/index.html`
- Create: `burgundy-scorer/src/main.jsx`
- Create: `burgundy-scorer/src/App.jsx`
- Create: `burgundy-scorer/.gitignore`

- [ ] **Step 1: Create `burgundy-scorer/package.json`**

```json
{
  "name": "burgundy-scorer",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.7"
  }
}
```

- [ ] **Step 2: Create `burgundy-scorer/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build into Hugo's static/ dir so the app is served at /burgundy-scorer/.
export default defineConfig({
  plugins: [react()],
  base: '/burgundy-scorer/',
  build: {
    outDir: '../static/burgundy-scorer',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 3: Create `burgundy-scorer/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Castles of Burgundy — Score Calculator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `burgundy-scorer/src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Create `burgundy-scorer/src/App.jsx`**

```jsx
export default function App() {
  return <h1>Castles of Burgundy — Score Calculator</h1>
}
```

- [ ] **Step 6: Create `burgundy-scorer/.gitignore`**

```gitignore
node_modules
dist
```

- [ ] **Step 7: Install dependencies and verify the build emits into static/**

Run:
```bash
cd burgundy-scorer && npm install && npm run build
```
Expected: build completes; `static/burgundy-scorer/index.html` and `static/burgundy-scorer/assets/` exist. Verify with:
```bash
ls ../static/burgundy-scorer && grep -q '/burgundy-scorer/assets/' ../static/burgundy-scorer/index.html && echo OK
```
Expected: lists `index.html` and `assets`, prints `OK` (asset URLs are prefixed with the base path).

- [ ] **Step 8: Commit**

```bash
git add burgundy-scorer/package.json burgundy-scorer/package-lock.json burgundy-scorer/vite.config.js burgundy-scorer/index.html burgundy-scorer/src burgundy-scorer/.gitignore
git commit -m "feat(burgundy-scorer): scaffold empty Vite + React app"
```

---

### Task 2: Treat the build output as a gitignored artifact

**Files:**
- Modify: `.gitignore`
- Delete: `static/burgundy-scorer/index.html`

- [ ] **Step 1: Add the build-output dir to root `.gitignore`**

Append under the "Generated files by hugo" group in `.gitignore`:

```gitignore
# Generated React build output (built by Vite into Hugo's static dir)
/static/burgundy-scorer/
```

- [ ] **Step 2: Remove the stale committed placeholder and untrack any built output**

Run:
```bash
git rm --cached -r --ignore-unmatch static/burgundy-scorer
```
Expected: `static/burgundy-scorer/index.html` is removed from the index. (Files on disk remain; they are now ignored.)

- [ ] **Step 3: Verify the build output is ignored**

Run:
```bash
git status --short static/burgundy-scorer
git check-ignore static/burgundy-scorer/index.html
```
Expected: `git status` shows nothing under `static/burgundy-scorer/` (no `??`, no staged files); `git check-ignore` prints `static/burgundy-scorer/index.html`.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore(burgundy-scorer): gitignore Vite build output in static/"
```

---

### Task 3: Build the React app in CI before Hugo

**Files:**
- Modify: `.github/workflows/hugo.yaml`

- [ ] **Step 1: Add a Node setup step and a React build step before "Build with Hugo"**

In `.github/workflows/hugo.yaml`, inside the `build` job's `steps`, insert the
following two steps immediately before the existing `- name: Build with Hugo`
step (after `- name: Install Node.js dependencies`):

```yaml
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: burgundy-scorer/package-lock.json
      - name: Build burgundy-scorer (React)
        run: cd burgundy-scorer && npm ci && npm run build
```

- [ ] **Step 2: Validate the workflow YAML is well-formed**

Run:
```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/hugo.yaml')); print('YAML OK')"
```
Expected: prints `YAML OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/hugo.yaml
git commit -m "ci: build burgundy-scorer React app before Hugo"
```

---

## Verification (whole feature)

- [ ] From `burgundy-scorer/`, `npm run dev` serves the placeholder at the Vite dev URL.
- [ ] From `burgundy-scorer/`, `npm run build` produces `static/burgundy-scorer/index.html` with asset URLs under `/burgundy-scorer/`.
- [ ] From repo root, after the build, `hugo` (or `hugo serve`) includes `burgundy-scorer/index.html` in `public/`.
- [ ] `git status` is clean of any files under `static/burgundy-scorer/`.

## Notes

- No test framework is set up: per the spec, anything beyond a default Vite React
  scaffold (scoring logic, tests, styling) is out of scope. Tests arrive with the
  first real feature.
- Pin `node-version: 20` to match a current Vite 6 LTS target; adjust only if the
  repo later standardizes on a different Node version.
