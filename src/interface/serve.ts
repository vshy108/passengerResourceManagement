/**
 * HTTP server entrypoint.
 *
 * Boots the application composition root and starts a Fastify server
 * on `PORT` (default 3000). Separate from the CLI (`cli.ts`) so the
 * same codebase can be reached either as a scripted demo or as a live
 * API. See specs/09-http.md.
 */
import { buildApp } from "./composition-root.js";
import { createHttpApp } from "./http/server.js";

const ctx = buildApp();
const app = createHttpApp(ctx);

const port = Number(process.env.PORT ?? "3000");
app.listen({ port, host: "0.0.0.0" }).catch((err: unknown) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
