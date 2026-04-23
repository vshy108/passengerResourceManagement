# 10 — Web UI (Resource Discovery)

**Status:** Optional / above-and-beyond (plan §13).

A tiny, read-only React page that demonstrates the tier-inheritance
rule visually. Served from GitHub Pages so reviewers can click
instead of read code.

## Scope (deliberately minimal)

- No backend call. The page consumes a static `snapshot.json` built
  from the existing `runDemo()` composition root.
- One view: tier selector + accessible-resource list.
- No auth, no writes, no history view. Those are covered by the CLI,
  the REST API (specs/09), and the test suite.

## Rules

- **WB-R1** A root-level script `npm run snapshot` runs the app
  composition in memory and writes
  `web/public/snapshot.json` with:
  ```
  { passengers: Passenger[], resources: Resource[] }
  ```
  Shapes are the canonical domain types from `src/domain/`.
- **WB-R2** The web app imports `snapshot.json` statically at build
  time (`import snapshot from "../public/snapshot.json"`), so the
  deployed bundle ships a deterministic dataset with no network calls.
- **WB-R3** A pure filter `filterByTier(resources, tier)` applies the
  tier policy from `domain/tier.ts` — Silver < Gold < Platinum. The
  filter is unit-tested.
- **WB-R4** The web package is a **sub-project** under `web/` with its
  own `package.json`, its own `node_modules`, its own build & test.
  This isolates the React / Vite toolchain from the server code so
  reviewers running only the root `npm ci && npm test` never download
  a browser toolchain they don't need.

## Scenarios

- **WB-S1** Selecting "Silver" lists only Silver-min resources.
- **WB-S2** Selecting "Platinum" lists all resources (Silver + Gold +
  Platinum) — inheritance visible.
- **WB-S3** Snapshot file missing → build fails loudly. (Vite will
  refuse to resolve the import.)

## Deployment

GitHub Actions workflow at `.github/workflows/pages.yml`:

1. Root install + build.
2. `npm run snapshot` → emits `web/public/snapshot.json`.
3. Web install + `npm run build` → `web/dist`.
4. Upload + deploy to GitHub Pages.

## Out of scope

- Live data. Real users would mutate state; that's what the CLI + REST
  API are for.
- Component-level testing. The one component (`App.tsx`) is a
  presentation-only mapping over the filtered array; the unit test on
  `filterByTier` covers the only non-trivial logic.
