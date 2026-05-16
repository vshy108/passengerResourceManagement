import { spawn } from "node:child_process";

const port = process.env.PRMS_DEMO_PORT ?? "3126";
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["dist/interface/serve.js", "--seed"], {
  env: { ...process.env, PORT: port },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
server.stderr.on("data", (chunk) => {
  stderr += String(chunk);
});

try {
  await waitForHealth();

  const passengers = await getJson("/passengers");
  const resources = await getJson("/resources");
  const denied = await postJson("/access/use", "Passenger:P1", {
    resourceId: "R-vip",
  });
  const allowed = await postJson("/access/use", "Passenger:P3", {
    resourceId: "R-vip",
  });
  const history = await getJson("/reports/history/P1");
  const aggregate = await getJson("/reports/aggregate-by-tier");
  const topResources = await getJson("/reports/top-resources?n=3");

  if (denied.status !== 403) {
    throw new Error(`Expected denied access to return 403, got ${denied.status}`);
  }
  if (allowed.status !== 201) {
    throw new Error(`Expected allowed access to return 201, got ${allowed.status}`);
  }

  console.log(
    JSON.stringify(
      {
        passengers: passengers.body.length,
        resources: resources.body.length,
        denied: denied.body.error.kind,
        allowed: allowed.body.outcome,
        historyEventsForP1: history.body.length,
        aggregate: aggregate.body,
        topResources: topResources.body,
      },
      null,
      2,
    ),
  );
} finally {
  server.kill("SIGTERM");
}

async function waitForHealth() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become healthy. stderr: ${stderr}`);
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() };
}

async function postJson(path, actor, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-actor": actor,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
