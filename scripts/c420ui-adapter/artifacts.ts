import fs from "node:fs";
import path from "node:path";
import {
  resolveC420UIArtifactOutputPattern,
  type c420uiArtifactRecipeConfig,
  type c420uiArtifactRecipeWorkflow,
  type c420uiArtifactWorkflow,
  type c420uiProjectCapabilities,
  type c420uiRunnableArtifactWorkflow,
  validateC420UIArtifactRecipeConfig,
  validateC420UIArtifactWorkflowsAgainstActions,
} from "../../packages/c420ui/src";
import { loadCanvaLinuxC420UIActions } from "./actions";

export type CanvaLinuxArtifactWorkflow = c420uiArtifactWorkflow &
  c420uiArtifactRecipeWorkflow &
  c420uiRunnableArtifactWorkflow & {
    outputPattern?: string;
  };

type CanvaLinuxArtifactsConfig = c420uiArtifactRecipeConfig;

const ARTIFACTS_CONFIG_PATH = "config/canva-linux/artifacts.json";

function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing Canva Linux configuration file: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse configuration file ${filePath}: ${message}`);
  }
}

// c420ui treats artifact declarations as process-static project config; cache by path to avoid repeated parsing.
let cachedArtifactsConfig: CanvaLinuxArtifactsConfig | null = null;
let cachedArtifactsConfigPath: string | null = null;

function loadArtifactsConfig(rootDir: string): CanvaLinuxArtifactsConfig {
  const configPath = path.join(rootDir, ARTIFACTS_CONFIG_PATH);
  if (cachedArtifactsConfig && cachedArtifactsConfigPath === configPath) {
    return cachedArtifactsConfig;
  }

  const config = readJsonFile<unknown>(configPath);
  cachedArtifactsConfig = validateC420UIArtifactRecipeConfig(config, configPath);
  cachedArtifactsConfigPath = configPath;
  return cachedArtifactsConfig;
}

export function loadCanvaLinuxCapabilities(
  rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? process.cwd(),
): c420uiProjectCapabilities {
  return { ...loadArtifactsConfig(rootDir).capabilities };
}

export function loadCanvaLinuxArtifactWorkflows(
  rootDir: string,
  version: string,
): CanvaLinuxArtifactWorkflow[] {
  const config = loadArtifactsConfig(rootDir);
  validateC420UIArtifactWorkflowsAgainstActions(
    config.workflows,
    loadCanvaLinuxC420UIActions(rootDir),
  );

  return config.workflows.map((workflow) => ({
    ...workflow,
    outputPattern: workflow.outputPattern
      ? resolveC420UIArtifactOutputPattern(workflow.outputPattern, { version })
      : undefined,
  })) as CanvaLinuxArtifactWorkflow[];
}
