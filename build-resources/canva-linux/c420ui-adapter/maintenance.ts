import fs from "node:fs";
import path from "node:path";
import {
  validateC420UIMaintenanceConfig,
  type c420uiMaintenanceConfig,
} from "../../c420ui/src/index.js";

export function loadCanvaLinuxMaintenanceConfig(rootDir: string): c420uiMaintenanceConfig {
  const configPath = path.join(rootDir, "build-resources/canva-linux/config/maintenance.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as unknown;
  return validateC420UIMaintenanceConfig(config);
}
