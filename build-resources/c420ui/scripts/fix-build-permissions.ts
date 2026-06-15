import { runFixBuildPermissions } from "../operations/maintenance/fix-build-permissions.js";
await runFixBuildPermissions(process.argv.slice(2));
