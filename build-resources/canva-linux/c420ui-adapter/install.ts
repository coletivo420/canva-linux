import fs from "node:fs";
import path from "node:path";
import {
  validateC420UINativeInstallConfig,
  type c420uiNativeInstallConfig,
} from "../../c420ui/src/index.js";

export function loadCanvaLinuxNativeInstallConfig(
  rootDir: string,
): c420uiNativeInstallConfig {
  const configPath = path.join(
    rootDir,
    "build-resources/canva-linux/config/install-native.json",
  );
  return validateC420UINativeInstallConfig(
    JSON.parse(fs.readFileSync(configPath, "utf8")),
  );
}
