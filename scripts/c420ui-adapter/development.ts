import fs from "node:fs";
import path from "node:path";
import {
  createC420UIDevelopmentWorkflows,
  validateC420UIDevelopmentConfig,
  type c420uiDevelopmentTask,
  type C420UIWorkflow,
} from "../../packages/c420ui/src";

type CanvaLinuxDevelopmentConfig = {
  tasks: c420uiDevelopmentTask[];
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadCanvaLinuxDevelopmentTasks(
  rootDir: string,
): c420uiDevelopmentTask[] {
  const developmentConfigPath = path.join(
    rootDir,
    "config/canva-linux/development.json",
  );
  const config = readJsonFile<CanvaLinuxDevelopmentConfig>(developmentConfigPath);
  validateC420UIDevelopmentConfig(config);
  return config.tasks;
}

export function loadCanvaLinuxDevelopmentWorkflows(
  rootDir: string,
): C420UIWorkflow[] {
  return createC420UIDevelopmentWorkflows(
    loadCanvaLinuxDevelopmentTasks(rootDir),
  );
}
