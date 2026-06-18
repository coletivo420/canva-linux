import { createCanvaLinuxOperationsAdapter } from "../../canva-linux/c420ui-adapter/operations.js";
import { projectRoot } from "../host/paths.js";
import { runFlatpakInstall } from "../operations/install/flatpak.js";

const rootDir = projectRoot();
const adapter = createCanvaLinuxOperationsAdapter(rootDir);
await runFlatpakInstall(process.argv.slice(2), { appId: adapter.appId });
