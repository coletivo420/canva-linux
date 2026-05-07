import fs from "node:fs";
import path from "node:path";
import { loadActions, type CanvaAction } from "../core/action-registry";
import type {
  C420UIConfig,
  C420UIProjectConfig,
} from "../../packages/c420ui/src";
import { C420UI_LOGO_LINES } from "../c420ui/logo";
import { rootLaunchGuardMessage, toolSettingsPath } from "../c420ui/settings";

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

export function createCanvaLinuxC420UIAdapter(rootDir: string) {
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
      name: "C420UI",
      version: "0.1",
      logoLines: [...C420UI_LOGO_LINES],
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

  function loadCanvaLinuxActions(): CanvaAction[] {
    if (!fs.existsSync(actionsJsonPath)) {
      throw new Error(`Missing Canva Linux actions registry: ${actionsJsonPath}`);
    }
    return loadActions(resolvedRootDir);
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

  return {
    rootDir: resolvedRootDir,
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      appIdentity: appIdentityPath,
    },
    loadProjectUi,
    loadPackageJson,
    loadAppIdentity,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions,
    getProjectPhase,
    getSessionLogPath,
    getToolSettingsPath,
    rootLaunchGuardMessage: rootLaunchGuardMessageForProject,
    toC420UIConfig,
  };
}
