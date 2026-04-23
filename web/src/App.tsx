import { useState } from "react";
import snapshot from "../public/snapshot.json";
import { filterByTier } from "./filter";
import type { Snapshot, Tier } from "./types";

const data = snapshot as Snapshot;
const TIERS: Tier[] = ["Silver", "Gold", "Platinum"];

export function App(): JSX.Element {
  const [tier, setTier] = useState<Tier>("Silver");
  const accessible = filterByTier(data.resources, tier);

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 720,
        margin: "2rem auto",
        padding: "0 1rem",
        color: "#222",
      }}
    >
      <h1>Spaceship X26 — Resource Discovery</h1>
      <p>
        Read-only view into the Passenger Resource Management System. Pick
        a tier to see which resources a passenger of that tier can access
        (higher tiers inherit lower-tier access).
      </p>

      <label style={{ display: "block", margin: "1.5rem 0" }}>
        <span style={{ marginRight: ".5rem" }}>Tier:</span>
        <select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value as Tier);
          }}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <h2>
        Accessible resources ({accessible.length} of {data.resources.length})
      </h2>
      <ul>
        {accessible.map((r) => (
          <li key={r.id}>
            <strong>{r.name}</strong> &mdash; {r.category}{" "}
            <em>(min {r.minTier})</em>
          </li>
        ))}
      </ul>

      <h2>Passengers in this snapshot</h2>
      <ul>
        {data.passengers.map((p) => (
          <li key={p.id}>
            {p.name} ({p.tier})
          </li>
        ))}
      </ul>

      <footer style={{ marginTop: "3rem", color: "#666", fontSize: ".9rem" }}>
        Data exported from the scripted demo via{" "}
        <code>npm run snapshot</code>. Source:{" "}
        <a href="https://github.com/">repo</a>.
      </footer>
    </main>
  );
}
