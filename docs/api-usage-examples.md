# API Usage Examples

Start a seeded API first:

```bash
npm run serve -- --seed
```

All examples assume `http://localhost:3000`.

## Health

```bash
curl -s http://localhost:3000/health
```

## Bootstrap Crew Leads

```bash
curl -s -X POST http://localhost:3000/crew-leads/bootstrap \
  -H 'content-type: application/json' \
  -d '{"leads":[{"id":"CL1","name":"Alice"},{"id":"CL2","name":"Bob"},{"id":"CL3","name":"Carol"}]}'
```

## Passenger Administration

```bash
curl -s -X POST http://localhost:3000/passengers \
  -H 'content-type: application/json' \
  -H 'x-actor: CrewLead:CL1' \
  -d '{"id":"P9","name":"Nia","tier":"Silver"}'

curl -s -X PATCH http://localhost:3000/passengers/P9/tier \
  -H 'content-type: application/json' \
  -H 'x-actor: CrewLead:CL1' \
  -d '{"tier":"Gold"}'
```

## Resource Administration

```bash
curl -s -X POST http://localhost:3000/resources \
  -H 'content-type: application/json' \
  -H 'x-actor: CrewLead:CL1' \
  -d '{"id":"R-garden","name":"Hydroponic Garden","category":"nutrition","minTier":"Gold"}'

curl -s 'http://localhost:3000/resources?tier=Gold'
```

## Access Attempts

Allowed access emits a `UsageEvent` and returns `201`:

```bash
curl -i -s -X POST http://localhost:3000/access/use \
  -H 'content-type: application/json' \
  -H 'x-actor: Passenger:P3' \
  -d '{"resourceId":"R-vip"}'
```

Denied access also emits a `UsageEvent`, but returns `403`:

```bash
curl -i -s -X POST http://localhost:3000/access/use \
  -H 'content-type: application/json' \
  -H 'x-actor: Passenger:P1' \
  -d '{"resourceId":"R-vip"}'
```

## Reports

```bash
curl -s http://localhost:3000/reports/history/P1
curl -s http://localhost:3000/reports/aggregate-by-tier
curl -s 'http://localhost:3000/reports/top-resources?n=3'
```
