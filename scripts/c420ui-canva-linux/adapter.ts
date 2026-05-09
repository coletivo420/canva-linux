import fs from "node:fs";
import path from "node:path";
import {
  c420uiExitCodes,
  createC420UIBridge,
  runC420UICommand,
  type c420uiActionResult,
  type c420uiExecutionContext,
  type c420uiProjectInfo,
  type C420UIActionDescriptor,
  type C420UIConfig,
  type C420UIProjectAdapter,
  type C420UIProjectConfig,
  type C420UIWorkflow,
} from "../../packages/c420ui/src";
import { c420uiLogoLines } from "../c420ui/logo";
import { rootLaunchGuardMessage, toolSettingsPath } from "../c420ui/settings";
import {
  loadCanvaLinuxActions as loadCanvaLinuxActionRegistry,
  type CanvaAction,
} from "../canva-linux/actions/registry";
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
  const phase = action.group === "install" ? "install" : (action.group === "maintenance" ? "maintenance" : "development");
  const kind = action.kind === "command" ? "command" : "planned";
  return { ...action, kind, phase, cliFlags: action.cli };
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
  const projectUiPath = path.join(resolvedRootDir, "config/canva-linux/project-ui.json");
  const packageJsonPath = path.join(resolvedRootDir, "package.json");
  const actionsJsonPath = path.join(resolvedRootDir, "config/canva-linux/actions.json");
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
    return loadCanvaLinuxActionRegistry(resolvedRootDir).map(toC420UIActionDescriptor);
  }

  function loadArtifactWorkflows() {
    return loadCanvaLinuxArtifactWorkflows(
      resolvedRootDir,
      getPackageVersion(),
    );
  }

  function loadWorkflows(): C420UIWorkflow[] {
    return loadCanvaLinuxActions().map(toC420UIWorkflow);
  }

  function projectInfo(): c420uiProjectInfo {
    const project = loadProjectConfig();
    return {
      projectName: project.projectName,
      projectSubtitle: project.projectSubtitle,
      displayVersion: project.displayVersion,
      phase: project.phase,
      status: project.status,
      appId: project.appId,
      repositoryUrl: project.repositoryUrl,
    };
  }

  function actions() {
    return loadCanvaLinuxActions();
  }

  function artifactWorkflows() {
    return loadArtifactWorkflows();
  }

  // Transitional bridge execution path.
  // Direct launcher CLI routes through this path for action execution.
  // Privilege preflight is owned by the c420ui root provider.
  // Runtime Canva Linux app logs, credential diagnostics, OAuth/tabs/GPU/EyeDropper logs,
  // and CANVA_DEBUG flows remain outside this adapter execution path.
  // Defensive fallback only: planned and dry-run policy belongs to the c420ui Action Engine.
  async function runAction(
    actionId: string,
    context: c420uiExecutionContext,
  ): Promise<c420uiActionResult> {
    const action = loadCanvaLinuxActions().find((item) => item.id === actionId);
    if (!action) {
      return { code: c420uiExitCodes.invalidUsage, status: "failed", message: `Unknown action: ${actionId}` };
    }
    if (action.kind === "planned" || action.planned) {
      return { code: c420uiExitCodes.plannedAction, status: "planned", message: action.description };
    }
    if (context.dryRun) {
      context.emitProgress({ state: "success", percent: 100, label: `Dry-run: ${action.label}` });
      return { code: c420uiExitCodes.success, status: "success", message: "dry-run" };
    }
    if (!action.command) {
      return { code: c420uiExitCodes.invalidUsage, status: "failed", message: `${actionId} has no command` };
    }

    // The Action Engine/root provider owns action environment preparation.
    const actionEnv = context.env;

    if (context.signal?.aborted) {
      context.emitProgress({ state: "canceled", percent: 0, label: action.label });
      return {
        code: c420uiExitCodes.canceled,
        status: "canceled",
        message: "Action canceled before start.",
      };
    }

    return runC420UICommand({
      command: action.command as string,
      args: action.args ?? [],
      cwd: resolvedRootDir,
      env: actionEnv,
      label: action.label,
      signal: context.signal,
      emitLog: context.emitLog,
      emitProgress: context.emitProgress,
    });
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
    projectInfo,
    actions,
    artifactWorkflows,
    runAction,
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
