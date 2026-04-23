/**
 * Interactive Resource Discovery console.
 *
 * Single page, no router. State is kept in React hooks; the API
 * client is the only I/O boundary (specs/11-web-interactive.md).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";
import * as api from "./api";
import { ApiError } from "./api";
import { canAccess, TIERS } from "./tier";
import type {
  Actor,
  AggregateByTier,
  CrewLead,
  Passenger,
  Resource,
  Tier,
  UsageEvent,
} from "./types";

type Panel = "passengers" | "resources" | "reports";

const errMsg = (e: unknown): string => {
  if (e instanceof ApiError) return `${String(e.status)} · ${e.error.kind}`;
  return e instanceof Error ? e.message : String(e);
};

export default function App(): JSX.Element {
  const [leads, setLeads] = useState<CrewLead[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [actor, setActor] = useState<Actor | undefined>(undefined);
  const [panel, setPanel] = useState<Panel>("passengers");
  const [error, setError] = useState<string | undefined>(undefined);
  const [tierFilter, setTierFilter] = useState<Tier | "">("");

  const refreshAll = useCallback(async () => {
    try {
      const [l, p, r] = await Promise.all([
        api.listCrewLeads(),
        api.listPassengers(),
        api.listResources(tierFilter || undefined),
      ]);
      setLeads(l);
      setPassengers(p);
      setResources(r);
      setError(undefined);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [tierFilter]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const actors: Actor[] = useMemo(() => {
    const list: Actor[] = leads.map((l) => ({
      kind: "CrewLead" as const,
      id: l.id,
      name: l.name,
    }));
    for (const p of passengers) {
      if (!p.deletedAt) {
        list.push({ kind: "Passenger", id: p.id, name: p.name });
      }
    }
    return list;
  }, [leads, passengers]);

  useEffect(() => {
    if (!actor) return;
    if (!actors.some((a) => a.kind === actor.kind && a.id === actor.id)) {
      setActor(undefined);
    }
  }, [actors, actor]);

  if (leads.length === 0) {
    return (
      <Shell error={error}>
        <Bootstrap onDone={() => void refreshAll()} onError={setError} />
      </Shell>
    );
  }

  return (
    <Shell error={error}>
      <section style={styles.row}>
        <label style={styles.label}>
          Act as:{" "}
          <select
            value={actor ? `${actor.kind}:${actor.id}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setActor(undefined);
                return;
              }
              const found = actors.find((a) => `${a.kind}:${a.id}` === v);
              setActor(found);
            }}
          >
            <option value="">— pick an actor —</option>
            {actors.map((a) => (
              <option key={`${a.kind}:${a.id}`} value={`${a.kind}:${a.id}`}>
                {a.kind}: {a.name} ({a.id})
              </option>
            ))}
          </select>
        </label>

        <nav style={styles.tabs}>
          {(["passengers", "resources", "reports"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              style={panel === p ? styles.tabActive : styles.tab}
            >
              {p}
            </button>
          ))}
        </nav>
      </section>

      {panel === "passengers" && (
        <Passengers
          actor={actor}
          passengers={passengers}
          onChanged={() => void refreshAll()}
          onError={setError}
        />
      )}

      {panel === "resources" && (
        <Resources
          actor={actor}
          passengers={passengers}
          resources={resources}
          tierFilter={tierFilter}
          onTierFilter={setTierFilter}
          onChanged={() => void refreshAll()}
          onError={setError}
        />
      )}

      {panel === "reports" && (
        <Reports passengers={passengers} onError={setError} />
      )}
    </Shell>
  );
}

function Shell(props: {
  error: string | undefined;
  children: ReactNode;
}): JSX.Element {
  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Spaceship X26 — PRMS</h1>
        <small style={{ color: "#777" }}>
          specs/11-web-interactive.md · talks to the live REST API
        </small>
      </header>
      {props.error !== undefined && (
        <div style={styles.err}>error: {props.error}</div>
      )}
      {props.children}
    </main>
  );
}

function Bootstrap(props: {
  onDone: () => void;
  onError: (m: string) => void;
}): JSX.Element {
  const [rows, setRows] = useState(
    Array.from({ length: 3 }, (_, i) => ({
      id: `CL${String(i + 1)}`,
      name: "",
    })),
  );

  return (
    <section style={styles.card}>
      <h2>Bootstrap crew leads</h2>
      <p style={{ color: "#666" }}>
        The server has no crew leads yet. Register exactly three to unlock
        the rest of the UI (CL-R1), or load the canonical demo world from
        the requirements glossary.
      </p>
      <button
        type="button"
        onClick={() => {
          api
            .loadDemoWorld()
            .then(() => {
              props.onDone();
            })
            .catch((err: unknown) => {
              props.onError(errMsg(err));
            });
        }}
        style={{ marginBottom: 12 }}
      >
        Load demo data
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          api
            .bootstrapCrewLeads(rows)
            .then(() => {
              props.onDone();
            })
            .catch((err: unknown) => {
              props.onError(errMsg(err));
            });
        }}
        style={styles.form}
      >
        {rows.map((row, i) => (
          <div key={i} style={styles.row}>
            <input
              aria-label={`lead ${String(i + 1)} id`}
              placeholder="id"
              value={row.id}
              onChange={(e) =>
                setRows(
                  rows.map((r, j) =>
                    j === i ? { ...r, id: e.target.value } : r,
                  ),
                )
              }
              required
            />
            <input
              aria-label={`lead ${String(i + 1)} name`}
              placeholder="name"
              value={row.name}
              onChange={(e) =>
                setRows(
                  rows.map((r, j) =>
                    j === i ? { ...r, name: e.target.value } : r,
                  ),
                )
              }
              required
            />
          </div>
        ))}
        <button type="submit">Bootstrap</button>
      </form>
    </section>
  );
}

function Passengers(props: {
  actor: Actor | undefined;
  passengers: Passenger[];
  onChanged: () => void;
  onError: (m: string) => void;
}): JSX.Element {
  const [form, setForm] = useState<{ id: string; name: string; tier: Tier }>({
    id: "",
    name: "",
    tier: "Silver",
  });

  const act = props.actor;
  const isCrewLead = act?.kind === "CrewLead";

  return (
    <section style={styles.card}>
      <h2>Passengers</h2>
      {props.passengers.length === 0 ? (
        <p style={{ color: "#999" }}>— none —</p>
      ) : (
        <ul style={styles.list}>
          {props.passengers.map((p) => (
            <li key={p.id} style={styles.listRow}>
              <code>{p.id}</code> · {p.name} · <strong>{p.tier}</strong>
              {p.deletedAt !== undefined && (
                <em style={{ color: "#c00" }}> (deleted)</em>
              )}
              {isCrewLead && p.deletedAt === undefined && act && (
                <span style={{ marginLeft: "auto" }}>
                  <select
                    aria-label={`tier for ${p.id}`}
                    value={p.tier}
                    onChange={(e) => {
                      api
                        .changePassengerTier(
                          act,
                          p.id,
                          e.target.value as Tier,
                        )
                        .then(() => {
                          props.onChanged();
                        })
                        .catch((err: unknown) => {
                          props.onError(errMsg(err));
                        });
                    }}
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      api
                        .deletePassenger(act, p.id)
                        .then(() => {
                          props.onChanged();
                        })
                        .catch((err: unknown) => {
                          props.onError(errMsg(err));
                        });
                    }}
                  >
                    delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isCrewLead && act ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            api
              .createPassenger(act, form)
              .then(() => {
                setForm({ id: "", name: "", tier: "Silver" });
                props.onChanged();
              })
              .catch((err: unknown) => {
                props.onError(errMsg(err));
              });
          }}
          style={styles.form}
        >
          <h3>Create passenger</h3>
          <div style={styles.row}>
            <input
              placeholder="id"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              required
            />
            <input
              placeholder="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <select
              value={form.tier}
              onChange={(e) =>
                setForm({ ...form, tier: e.target.value as Tier })
              }
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button type="submit">create</button>
          </div>
        </form>
      ) : (
        <p style={{ color: "#999" }}>
          Pick a CrewLead actor to create or modify passengers.
        </p>
      )}
    </section>
  );
}

function Resources(props: {
  actor: Actor | undefined;
  passengers: Passenger[];
  resources: Resource[];
  tierFilter: Tier | "";
  onTierFilter: (t: Tier | "") => void;
  onChanged: () => void;
  onError: (m: string) => void;
}): JSX.Element {
  const [form, setForm] = useState<{
    id: string;
    name: string;
    category: string;
    minTier: Tier;
  }>({ id: "", name: "", category: "", minTier: "Silver" });

  const act = props.actor;
  const isCrewLead = act?.kind === "CrewLead";

  const passengerTier: Tier | undefined =
    act?.kind === "Passenger"
      ? props.passengers.find((p) => p.id === act.id)?.tier
      : undefined;

  return (
    <section style={styles.card}>
      <h2>Resources</h2>
      <label style={styles.label}>
        filter by tier:{" "}
        <select
          value={props.tierFilter}
          onChange={(e) =>
            props.onTierFilter(e.target.value as Tier | "")
          }
        >
          <option value="">(all)</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              accessible to {t}
            </option>
          ))}
        </select>
      </label>

      {props.resources.length === 0 ? (
        <p style={{ color: "#999" }}>— none —</p>
      ) : (
        <ul style={styles.list}>
          {props.resources.map((r) => {
            const useable =
              passengerTier !== undefined &&
              canAccess(passengerTier, r.minTier);
            return (
              <li key={r.id} style={styles.listRow}>
                <code>{r.id}</code> · {r.name} · {r.category} · min{" "}
                <strong>{r.minTier}</strong>
                {act?.kind === "Passenger" && (
                  <span style={{ marginLeft: "auto" }}>
                    <button
                      onClick={() => {
                        api
                          .useResource(act, r.id)
                          .then(() => {
                            props.onChanged();
                          })
                          .catch((err: unknown) => {
                            props.onError(errMsg(err));
                          });
                      }}
                      title={useable ? "should succeed" : "will be denied"}
                    >
                      use
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isCrewLead && act ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            api
              .createResource(act, form)
              .then(() => {
                setForm({
                  id: "",
                  name: "",
                  category: "",
                  minTier: "Silver",
                });
                props.onChanged();
              })
              .catch((err: unknown) => {
                props.onError(errMsg(err));
              });
          }}
          style={styles.form}
        >
          <h3>Create resource</h3>
          <div style={styles.row}>
            <input
              placeholder="id"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              required
            />
            <input
              placeholder="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="category"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
              required
            />
            <select
              value={form.minTier}
              onChange={(e) =>
                setForm({ ...form, minTier: e.target.value as Tier })
              }
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  min {t}
                </option>
              ))}
            </select>
            <button type="submit">create</button>
          </div>
        </form>
      ) : (
        <p style={{ color: "#999" }}>
          Pick a CrewLead to create resources, or a Passenger to attempt
          usage.
        </p>
      )}
    </section>
  );
}

function Reports(props: {
  passengers: Passenger[];
  onError: (m: string) => void;
}): JSX.Element {
  const [history, setHistory] = useState<UsageEvent[] | undefined>(undefined);
  const [selected, setSelected] = useState<string>("");
  const [aggregate, setAggregate] = useState<AggregateByTier | undefined>(
    undefined,
  );
  const [top, setTop] = useState<readonly string[]>([]);

  const { onError } = props;

  useEffect(() => {
    api
      .aggregateByTier()
      .then((a) => {
        setAggregate(a);
      })
      .catch((err: unknown) => {
        onError(errMsg(err));
      });
    api
      .topResources(3)
      .then((r) => {
        setTop(r);
      })
      .catch((err: unknown) => {
        onError(errMsg(err));
      });
  }, [onError]);

  useEffect(() => {
    if (!selected) {
      setHistory(undefined);
      return;
    }
    api
      .personalHistory(selected)
      .then((h) => {
        setHistory(h);
      })
      .catch((err: unknown) => {
        onError(errMsg(err));
      });
  }, [selected, onError]);

  return (
    <section style={styles.card}>
      <h2>Reports</h2>

      <h3>Aggregate by tier</h3>
      {aggregate ? (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>tier</th>
              <th>allowed</th>
              <th>denied</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((t) => (
              <tr key={t}>
                <td>{t}</td>
                <td>{aggregate[t].allowed}</td>
                <td>{aggregate[t].denied}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "#999" }}>loading…</p>
      )}

      <h3>Top resources (by allowed count, n=3)</h3>
      {top.length === 0 ? (
        <p style={{ color: "#999" }}>— none —</p>
      ) : (
        <ol>
          {top.map((id) => (
            <li key={id}>
              <code>{id}</code>
            </li>
          ))}
        </ol>
      )}

      <h3>Personal history</h3>
      <label style={styles.label}>
        passenger:{" "}
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— pick —</option>
          {props.passengers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id})
            </option>
          ))}
        </select>
      </label>
      {history && history.length === 0 && (
        <p style={{ color: "#999" }}>— no events —</p>
      )}
      {history && history.length > 0 && (
        <ul style={styles.list}>
          {history.map((e) => (
            <li key={e.id} style={styles.listRow}>
              <code>{e.timestamp}</code> · <code>{e.resourceId}</code> ·{" "}
              {e.tierAtAttempt} → min {e.minTierAtAttempt} ·{" "}
              <strong
                style={{
                  color: e.outcome === "ALLOWED" ? "#080" : "#c00",
                }}
              >
                {e.outcome}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const styles = {
  main: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: 960,
    margin: "2rem auto",
    padding: "0 1rem",
    color: "#222",
  },
  header: {
    borderBottom: "1px solid #ddd",
    paddingBottom: "0.5rem",
    marginBottom: "1rem",
  },
  err: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #c00",
    background: "#fee",
    color: "#900",
    marginBottom: "1rem",
    fontFamily: "ui-monospace, monospace",
  },
  card: {
    border: "1px solid #eee",
    borderRadius: 6,
    padding: "1rem",
    marginBottom: "1rem",
    background: "#fff",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  row: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  label: {
    display: "inline-flex",
    gap: "0.25rem",
    alignItems: "center",
  },
  list: { listStyle: "none", padding: 0, margin: 0 },
  listRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    padding: "0.25rem 0",
    borderBottom: "1px dashed #eee",
  },
  tabs: { display: "flex", gap: "0.25rem", marginLeft: "auto" },
  tab: {
    padding: "0.25rem 0.75rem",
    background: "#eee",
    border: "1px solid #ccc",
    cursor: "pointer",
  },
  tabActive: {
    padding: "0.25rem 0.75rem",
    background: "#333",
    color: "#fff",
    border: "1px solid #333",
    cursor: "pointer",
  },
  table: { borderCollapse: "collapse" as const, marginBottom: "1rem" },
};
