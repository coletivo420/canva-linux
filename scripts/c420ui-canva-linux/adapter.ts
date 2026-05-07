import fs from "node:fs";
import path from "node:path";
import {
  createC420UIBridge,
  type C420UIActionDescriptor,
  type C420UIConfig,
  type C420UIProjectAdapter,
  type C420UIProjectConfig,
  type C420UIWorkflow,
} from "../../packages/c420ui/src";
import { c420uiLogoLines } from "../c420ui/logo";
import { rootLaunchGuardMessage, toolSettingsPath } from "../c420ui/settings";
import { loadActions, type CanvaAction } from "../core/action-registry";
import {
  loadCanvaLinuxArtifactWorkflows,
  loadCanvaLinuxCapabilities,
} from "./artifacts";

type ProjectUiJson = {
  displayVersion?: string;
  status?: string;
  phase?: string;
  projectName: string;
  projectSubtitle: string;
  c420uiTitle: string;
  stateDirectoryName: string;
  appId: string;
  executableName: string;
  repositoryUrl: string;
  launcherCommand: string;
  logoLines: string[];
  versionReleaseNotes: string;
};

type PackageJson = {
  version?: string;
};

type AppIdentity = {
  projectDisplayVersion?: string;
  projectPhase?: string;
};

type CanvaLinuxC420UIAdapter = C420UIProjectAdapter & {
  paths: {
    projectUi: string;
    packageJson: string;
    actionsJson: string;
    appIdentity: string;
  };
  loadProjectUi(): ProjectUiJson;
  loadPackageJson(): PackageJson;
  loadAppIdentity(): AppIdentity;
  loadProjectConfig(): C420UIProjectConfig;
  loadBrandConfig(): C420UIConfig["brand"];
  getProjectPhase(): string;
  getSessionLogPath(): string;
  getToolSettingsPath(): string;
  rootLaunchGuardMessage(): string;
  toC420UIConfig(): C420UIConfig;
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readAppIdentity(identityPath: string): AppIdentity {
  try {
    const content = fs.readFileSync(identityPath, "utf8");
    return {
      projectDisplayVersion: content.match(/^PROJECT_DISPLAY_VERSION="([^"]+)"/m)?.[1],
      projectPhase: content.match(/^PROJECT_PHASE="([^"]+)"/m)?.[1],
    };
  } catch {
    return {};
  }
}

function stateHome(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) return xdgStateHome;
  return path.join(process.env.HOME || ".", ".local/state");
}

function toC420UIActionDescriptor(action: CanvaAction): C420UIActionDescriptor {
  const phase = action.group === "install" ? "install" : "development";
  return { ...action, phase };
}

function toC420UIWorkflow(action: C420UIActionDescriptor): C420UIWorkflow {
  return {
    id: action.id,
    label: action.label,
    phase: action.phase ?? "development",
    actions: [action],
    requiresRoot: action.requiresRoot,
    supportsDryRun: action.kind === "command",
  };
}

export function createCanvaLinuxC420UIAdapter(
  rootDir: string,
): CanvaLinuxC420UIAdapter {
  const resolvedRootDir = path.resolve(rootDir);
  const projectUiPath = path.join(resolvedRootDir, "scripts/project-ui.json");
  const packageJsonPath = path.join(resolvedRootDir, "package.json");
  const actionsJsonPath = path.join(resolvedRootDir, "scripts/actions.json");
  const appIdentityPath = path.join(
    resolvedRootDir,
    "scripts/app-identity-common.sh",
  );

  function loadProjectUi(): ProjectUiJson {
    return readJsonFile<ProjectUiJson>(projectUiPath);
  }

  function loadPackageJson(): PackageJson {
    return readJsonFile<PackageJson>(packageJsonPath);
  }

  function loadAppIdentity(): AppIdentity {
    return readAppIdentity(appIdentityPath);
  }

  function getPackageVersion(): string {
    return loadPackageJson().version ?? "unknown";
  }

  function getProjectPhase(): string {
    const fromEnv = process.env.CANVA_PROJECT_PHASE?.trim();
    if (fromEnv) return fromEnv;
    const identity = loadAppIdentity();
    if (identity.projectPhase) return identity.projectPhase;
    return loadProjectUi().phase || "unknown";
  }

  function loadProjectConfig(): C420UIProjectConfig {
    const projectUi = loadProjectUi();
    return {
      projectName: projectUi.projectName,
      projectSubtitle: projectUi.projectSubtitle,
      displayVersion: projectUi.displayVersion ?? getPackageVersion(),
      phase: getProjectPhase(),
      status: projectUi.status,
      logoLines: [...projectUi.logoLines],
      appId: projectUi.appId,
      executableName: projectUi.executableName,
      repositoryUrl: projectUi.repositoryUrl,
      launcherCommand: projectUi.launcherCommand,
      stateDirectoryName: projectUi.stateDirectoryName,
    };
  }

  function loadBrandConfig(): C420UIConfig["brand"] {
    return {
      name: "c420ui",
      version: "0.1",
      logoLines: [...c420uiLogoLines],
    };
  }

  function getSessionLogPath(): string {
    const fromEnv = process.env.CANVA_TOOL_SESSION_LOG?.trim();
    if (fromEnv) return fromEnv;
    return path.join(
      stateHome(),
      loadProjectUi().stateDirectoryName,
      "tool-session.log",
    );
  }

  function getToolSettingsPath(): string {
    return toolSettingsPath(loadProjectUi().stateDirectoryName);
  }

  function rootLaunchGuardMessageForProject(): string {
    return rootLaunchGuardMessage(loadProjectUi().projectName);
  }

  function loadCanvaLinuxActions(): C420UIActionDescriptor[] {
    if (!fs.existsSync(actionsJsonPath)) {
      throw new Error(`Missing Canva Linux actions registry: ${actionsJsonPath}`);
    }
    return loadActions(resolvedRootDir).map(toC420UIActionDescriptor);
  }

  function loadArtifactWorkflows() {
    const workflows = loadCanvaLinuxArtifactWorkflows(
      resolvedRootDir,
      getPackageVersion(),
    );
    const actionsById = new Map(loadCanvaLinuxActions().map((action) => [action.id, action]));
    return workflows.map((workflow) => ({
      ...workflow,
      actions: workflow.actions.length
        ? workflow.actions
        : workflow.artifacts
            .map((artifact) => artifact.actionId ? actionsById.get(artifact.actionId) : undefined)
            .filter((action): action is C420UIActionDescriptor => Boolean(action)),
    }));
  }

  function loadWorkflows(): C420UIWorkflow[] {
    return loadCanvaLinuxActions().map(toC420UIWorkflow);
  }

  function toC420UIConfig(): C420UIConfig {
    const projectUi = loadProjectUi();
    return {
      rootDir: resolvedRootDir,
      title: projectUi.c420uiTitle,
      brand: loadBrandConfig(),
      project: loadProjectConfig(),
      releaseNotes: projectUi.versionReleaseNotes,
    };
  }

  const adapter: CanvaLinuxC420UIAdapter = {
    id: "canva-linux",
    rootDir: resolvedRootDir,
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      appIdentity: appIdentityPath,
    },
    loadProjectInfo: loadProjectConfig,
    loadConfig: toC420UIConfig,
    loadProjectUi,
    loadPackageJson,
    loadAppIdentity,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions,
    loadArtifactWorkflows,
    loadWorkflows,
    loadCapabilities: loadCanvaLinuxCapabilities,
    getProjectPhase,
    getSessionLogPath,
    getToolSettingsPath,
    rootLaunchGuardMessage: rootLaunchGuardMessageForProject,
    toC420UIConfig,
  };

  return createC420UIBridge(adapter) as CanvaLinuxC420UIAdapter;
}
