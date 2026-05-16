# Operational Demo Mode

Run the non-interactive API demo from a clean checkout:

```bash
nvm use
npm ci
npm run demo:operational
```

The script builds the API, starts `dist/interface/serve.js --seed` on a local port, waits for `/health`, then exercises:

- seeded passenger/resource reads
- denied access for `Passenger:P1` using `R-vip`
- allowed access for `Passenger:P3` using `R-vip`
- personal history and aggregate reports

It prints a compact JSON summary and terminates the server before exiting.
