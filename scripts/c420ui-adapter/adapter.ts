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
import { c420uiLogoLines } from "../../packages/c420ui/src/terminal/logo";
import { toolSettingsPath } from "../../packages/c420ui/src/terminal/settings";
import { buildCanvaLinuxOverviewStatus } from "../canva-linux/detection/provider";
import { loadEffectiveBuildMetadata } from "../canva-linux/build-metadata-loader";
import {
  loadCanvaLinuxArtifactWorkflows,
  loadCanvaLinuxCapabilities,
} from "./artifacts";
import { loadCanvaLinuxC420UIActions } from "./actions";
import { loadCanvaLinuxDevelopmentWorkflows } from "./development";

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

type BuildMetadata = {
  baseVersion?: string;
  baseDisplayVersion?: string;
  basePhase?: string;
  buildRevision?: string;
  version?: string;
  displayVersion?: string;
  phase?: string;
  fullVersion?: string;
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
    artifactsJson: string;
    appIdentity: string;
    buildMetadata: string;
    c420uiPackageJson: string;
  };
  loadProjectUi(): ProjectUiJson;
  loadPackageJson(): PackageJson;
  loadAppIdentity(): AppIdentity;
  loadBuildMetadata(): BuildMetadata;
  loadProjectConfig(): C420UIProjectConfig;
  loadBrandConfig(): C420UIConfig["brand"];
  getProjectPhase(): string;
  getEffectiveProjectDisplayVersion(): string;
  getEffectiveProjectPhase(): string;
  getEffectiveProjectFullVersion(): string;
  getEffectiveProjectBuildRevision(): string;
  getSessionLogPath(): string;
  getSessionId(): string;
  getToolSettingsPath(): string;
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


export function createCanvaLinuxC420UIAdapter(
  rootDir: string,
): CanvaLinuxC420UIAdapter {
  const resolvedRootDir = path.resolve(rootDir);
  const projectUiPath = path.join(resolvedRootDir, "config/canva-linux/project-ui.json");
  const packageJsonPath = path.join(resolvedRootDir, "package.json");
  const actionsJsonPath = path.join(resolvedRootDir, "config/canva-linux/actions.json");
  const artifactsJsonPath = path.join(resolvedRootDir, "config/canva-linux/artifacts.json");
  const appIdentityPath = path.join(
    resolvedRootDir,
    "scripts/app-identity-common.sh",
  );
  const buildMetadataPath = path.join(
    resolvedRootDir,
    "config/canva-linux/build-metadata.json",
  );
  const c420uiPackageJsonPath = path.join(
    resolvedRootDir,
    "packages/c420ui/package.json",
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

  function loadBuildMetadata(): BuildMetadata {
    return loadEffectiveBuildMetadata(resolvedRootDir);
  }

  function loadC420UIPackageJson(): PackageJson {
    return readJsonFile<PackageJson>(c420uiPackageJsonPath);
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

  function getEffectiveProjectDisplayVersion(): string {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.displayVersion) return buildMetadata.displayVersion;
    const projectUi = loadProjectUi();
    if (projectUi.displayVersion) return projectUi.displayVersion;
    return getPackageVersion();
  }

  function getEffectiveProjectPhase(): string {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.phase) return buildMetadata.phase;
    return getProjectPhase();
  }

  function getEffectiveProjectFullVersion(): string {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.fullVersion) return buildMetadata.fullVersion;
    if (buildMetadata.version) return buildMetadata.version;
    return getPackageVersion();
  }

  function getEffectiveProjectBuildRevision(): string {
    return loadBuildMetadata().buildRevision || "unknown";
  }

  function loadProjectConfig(): C420UIProjectConfig {
    const projectUi = loadProjectUi();
    return {
      projectName: projectUi.projectName,
      projectSubtitle: projectUi.projectSubtitle,
      displayVersion: getEffectiveProjectDisplayVersion(),
      phase: getEffectiveProjectPhase(),
      fullVersion: getEffectiveProjectFullVersion(),
      buildRevision: getEffectiveProjectBuildRevision(),
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
      version: loadC420UIPackageJson().version ?? "unknown",
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

  function getSessionId(): string {
    return process.env.CANVA_TOOL_SESSION_ID?.trim() || "";
  }

  function getToolSettingsPath(): string {
    return toolSettingsPath(loadProjectUi().stateDirectoryName);
  }


  function loadCanvaLinuxActions(): C420UIActionDescriptor[] {
    if (!fs.existsSync(actionsJsonPath)) {
      throw new Error(`Missing Canva Linux actions registry: ${actionsJsonPath}`);
    }
    return loadCanvaLinuxC420UIActions(resolvedRootDir);
  }

  function loadArtifactWorkflows() {
    return loadCanvaLinuxArtifactWorkflows(
      resolvedRootDir,
      getPackageVersion(),
    );
  }

  function loadWorkflows(): C420UIWorkflow[] {
    return loadCanvaLinuxDevelopmentWorkflows(resolvedRootDir);
  }

  function projectInfo(): c420uiProjectInfo {
    const project = loadProjectConfig();
    return {
      projectName: project.projectName,
      projectSubtitle: project.projectSubtitle,
      displayVersion: project.fullVersion ?? getEffectiveProjectFullVersion(),
      phase: project.phase,
      fullVersion: project.fullVersion,
      buildRevision: project.buildRevision,
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

  function overviewStatus() {
    return buildCanvaLinuxOverviewStatus(resolvedRootDir);
  }

  async function runAction(
    actionId: string,
    context: c420uiExecutionContext,
  ): Promise<c420uiActionResult> {
    const action = loadCanvaLinuxActions().find((item) => item.id === actionId);
    if (!action) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`,
      };
    }

    if (!action.command) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `${actionId} has no command`,
      };
    }

    if (context.signal?.aborted) {
      context.emitProgress({ state: "canceled", percent: 0, label: action.label });
      return {
        code: c420uiExitCodes.canceled,
        status: "canceled",
        message: "Action canceled before start.",
      };
    }

    return runC420UICommand({
      command: action.command,
      args: action.args ?? [],
      cwd: resolvedRootDir,
      env: context.env,
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
      sessionLogPath: getSessionLogPath(),
      sessionId: getSessionId(),
    };
  }

  const adapter: CanvaLinuxC420UIAdapter = {
    id: "canva-linux",
    rootDir: resolvedRootDir,
    projectInfo,
    actions,
    artifactWorkflows,
    runAction,
    overviewStatus,
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      artifactsJson: artifactsJsonPath,
      appIdentity: appIdentityPath,
      buildMetadata: buildMetadataPath,
      c420uiPackageJson: c420uiPackageJsonPath,
    },
    loadProjectInfo: loadProjectConfig,
    loadConfig: toC420UIConfig,
    loadProjectUi,
    loadPackageJson,
    loadAppIdentity,
    loadBuildMetadata,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions,
    loadArtifactWorkflows,
    loadWorkflows,
    loadCapabilities: () => loadCanvaLinuxCapabilities(resolvedRootDir),
    getProjectPhase,
    getEffectiveProjectDisplayVersion,
    getEffectiveProjectPhase,
    getEffectiveProjectFullVersion,
    getEffectiveProjectBuildRevision,
    getSessionLogPath,
    getSessionId,
    getToolSettingsPath,
    toC420UIConfig,
  };

  return createC420UIBridge(adapter) as CanvaLinuxC420UIAdapter;
}
