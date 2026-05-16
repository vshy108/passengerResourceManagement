# Web UI Review Script

Use this path from a clean checkout to review the React UI against the live API.

## Setup

```bash
nvm use
npm ci
cd web && npm ci
```

## Start Services

Terminal 1:

```bash
npm run serve -- --seed
```

Terminal 2:

```bash
cd web && npm run dev
```

Open `http://localhost:5173`.

## Review Flow

1. Confirm the seeded passengers and resources are visible.
2. Use the demo load path only if the bootstrap screen is empty.
3. Create or inspect a passenger and a resource.
4. Run an access check for `Passenger:P1` against `R-vip` and confirm the denied result appears.
5. Run an access check for `Passenger:P3` against `R-vip` and confirm the allowed result appears.
6. Inspect personal history, aggregate by tier, and top-resource reports.

## Build Verification

```bash
cd web && npm run build
```
