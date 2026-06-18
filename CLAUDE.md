# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Svelte 4 + Vite SPA (pt-PT) that cross-references the **podiums of Portuguese cruising regattas (2026)** with **ORC certificate data** (ratings + boat characteristics). The codebase, comments, and UI are all in European Portuguese — keep it that way. `CONTEXT.md` is the canonical domain glossary (Prova, Pódio, Região, Classe, Veleiro, Cruzamento, Rating encontrado, Override curado…); read it before touching domain logic or naming.

## Commands

- `npm run dev` — regenerates `src/generated/` then starts Vite (default `:5173`).
- `npm run build` — same generate step, then `vite build` → `dist/`.
- `npm run build:provas` — runs `scripts/build-provas.mjs` only (the build-time cruzamento; see below).
- `npm run preview` — serve the built `dist/`.

There is **no test runner and no linter** wired up in this project. (`LIXO/orc-data/` ships vitest/pytest, but that is reference material, not this app.)

## Architecture

### Build-time cruzamento (the core design — ADR `docs/adr/0001`)

Podiums name boats only by **nome** (Portuguese, with sponsor suffixes); ORC data is keyed by **Número de vela**. The name→certificate match is **precomputed at build time, never at runtime**. `scripts/build-provas.mjs`:

- **reads** `src/data/provas.js` (hand-authored podium data + `ALIAS`), `src/data/overrides.js` (curated table), and the ORC reference data under `LIXO/orc-data/site/` (`index.json` = sailnumber→name; `data/<COUNTRY>/<sailnumber>.json` = per-boat VPP + sizes);
- **matches** on the normalized name (lowercase, accents stripped, sponsor suffix cut at the first en/em-dash, `/`, or ` - `), accepting **any issuing country** and preferring **POR** on ties; `overrides.js` can force, disambiguate, or veto (`null`) a match;
- **emits** `src/generated/provas.json` (the only data the app reads at runtime) and `src/generated/boats.json` (VPP/polar data keyed by sailnumber).

Consequences for working here:
- The generated artifacts (`src/generated/*.json`) **are committed** — they're the deployable data and the fallback for environments without the ORC source. `build:provas` regenerates them when `LIXO/` is present and **skips regeneration (exit 0) when it's absent** (e.g. Vercel), letting `vite build` consume the committed copies.
- **After editing `provas.js` or `overrides.js`, re-run `npm run build:provas`** (or restart `dev`) and **commit the regenerated `src/generated/*.json`**, or the deploy won't reflect the change.
- `LIXO/` is gitignored and named "trash" but it is the **ORC source dataset** the regeneration reads. Keep it locally; it is not needed to deploy (the committed artifacts cover that).

### App shell

`src/main.js` → `App.svelte`. Routing is hash-based: `#/prova/<id>` renders **EcraRating**; anything else renders **Entrada**.

- **Entrada** (`src/lib/components/Entrada.svelte`) — the entry board: provas with region filters/search, medalled boats, and a d3 podium chart (`PodiosChart`, `ProvaCard`). Selecting a prova navigates to its rating screen.
- **EcraRating** (`src/lib/components/EcraRating.svelte`) — for one prova: a **characteristics table** (only boats with *rating encontrado*, deduplicated by sailnumber) plus a **polar plot**. Hovering a table row focuses that boat in the polar.
- **Polar plots** — `PolarPlot.svelte` (2D, d3) and `PolarPlot3D.svelte` (three.js), toggled by `PolarModeToggle`. These and `vpp-mesh.js`/`util.js` are ported from `LIXO/orc-data`, restyled for the "xani" look.

### Cross-cutting

- **Theme**: light/dark via `data-theme` on `<html>`, persisted in `localStorage` and applied pre-render in `index.html`; design tokens in `src/styles/tokens.css`. `ThemeToggle.svelte`.
- **Help**: a Svelte store (`src/lib/help.js`) + `help-content.js` drive `HelpButton` → `HelpModal` per-screen explainers.
