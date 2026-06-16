import { runBuildElectronDir } from "../operations/packaging/electron-dir.js";
await runBuildElectronDir(process.argv.slice(2));
