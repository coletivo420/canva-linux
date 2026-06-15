import { runCleanArtifacts } from "../operations/maintenance/clean-artifacts.js";
await runCleanArtifacts(process.argv.slice(2));
