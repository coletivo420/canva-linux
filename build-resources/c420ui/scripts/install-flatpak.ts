import { runFlatpakInstall } from "../operations/install/flatpak.js";
await runFlatpakInstall(process.argv.slice(2));
