import { runPurge } from "../operations/maintenance/purge.js";
await runPurge(process.argv.slice(2));
