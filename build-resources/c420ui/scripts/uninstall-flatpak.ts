import { runFlatpakUninstall } from "../operations/uninstall/flatpak.js";
await runFlatpakUninstall(process.argv.slice(2));
