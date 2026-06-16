import { runBuildFlatpakBundle } from "../operations/packaging/flatpak-bundle.js";
await runBuildFlatpakBundle(process.argv.slice(2));
