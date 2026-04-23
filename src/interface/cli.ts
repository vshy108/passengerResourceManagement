/**
 * CLI entrypoint — invoked by `npm run demo` and `npm start`.
 *
 * Intentionally trivial: runs the scripted scenario in `./demo.ts`
 * and writes the result to stdout. All business logic lives in the
 * application layer; this file exists only to satisfy the process
 * boundary.
 */
import { runDemo } from "./demo.js";

const output = runDemo();
process.stdout.write(`${output}\n`);
