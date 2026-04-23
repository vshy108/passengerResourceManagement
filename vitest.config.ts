import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        // Pure type / interface files — no executable code for v8 to cover.
        "src/domain/actor.ts",
        "src/domain/errors.ts",
        "src/application/admin-event-sink.ts",
        "src/application/usage-event-sink.ts",
        "src/application/audit-context.ts",
        // Thin process entry wrapper; exercised manually via `npm run demo`.
        "src/interface/cli.ts",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
