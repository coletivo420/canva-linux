import fs from "node:fs";
import path from "node:path";
import {
  createC420UIDevelopmentWorkflowFromAction,
  validateC420UIDevelopmentConfig,
  type c420uiDevelopmentTask,
  type C420UIActionDescriptor,
  type C420UIWorkflow,
} from "../../packages/c420ui/src";
import { loadCanvaLinuxC420UIActions } from "./actions";

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

export function validateCanvaLinuxDevelopmentTasksAgainstActions(
  tasks: c420uiDevelopmentTask[],
  actions: C420UIActionDescriptor[],
): void {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const task of tasks) {
    const action = actionsById.get(task.actionId);
    if (!action) {
      throw new Error(`Development task ${task.id} references unknown actionId ${task.actionId}`);
    }
    createC420UIDevelopmentWorkflowFromAction(task, action);
  }
}

export function loadCanvaLinuxDevelopmentWorkflows(
  rootDir: string,
  actions = loadCanvaLinuxC420UIActions(rootDir),
): C420UIWorkflow[] {
  const tasks = loadCanvaLinuxDevelopmentTasks(rootDir);
  validateCanvaLinuxDevelopmentTasksAgainstActions(tasks, actions);
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  return tasks.map((task) => {
    const action = actionsById.get(task.actionId);
    if (!action) {
      throw new Error(`Development task ${task.id} references unknown actionId ${task.actionId}`);
    }
    return createC420UIDevelopmentWorkflowFromAction(task, action);
  });
}
