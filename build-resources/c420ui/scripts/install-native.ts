import path from "node:path";
import { createCanvaLinuxOperationsAdapter } from "../../canva-linux/c420ui-adapter/operations.js";
import { loadCanvaLinuxNativeInstallConfig } from "../../canva-linux/c420ui-adapter/install.js";
import { projectRoot } from "../host/paths.js";
import { runNativeInstall } from "../operations/install/native.js";

const rootDir = projectRoot();
const adapter = createCanvaLinuxOperationsAdapter(rootDir);
await runNativeInstall(process.argv.slice(2), {
  nativeInstall: loadCanvaLinuxNativeInstallConfig(rootDir),
  iconSourceRoot: path.join(rootDir, adapter.iconSourceDir, "hicolor"),
});
