import type { c420uiHostDependencyConfig } from "./host-dependencies.js";
import type { c420uiMaintenanceConfig } from "./maintenance-config.js";

export type C420UIBrandConfig = {
  name: string;
  version: string;
  hash?: string;
  hashKind?: string;
  logoLines: string[];
};

export type C420UIProjectConfig = {
  projectName: string;
  projectSubtitle: string;
  displayVersion: string;
  phase?: string;
  fullVersion?: string;
  buildRevision?: string;
  hash?: string;
  hashKind?: string;
  combinedHash?: string;
  combinedHashKind?: string;
  status?: string;
  logoLines: string[];
  appId: string;
  executableName: string;
  repositoryUrl: string;
  launcherCommand: string;
  stateDirectoryName: string;
};

export type C420UIConfig = {
  rootDir: string;
  title: string;
  brand: C420UIBrandConfig;
  project: C420UIProjectConfig;
  releaseNotes: string;
  sessionLogPath?: string;
  sessionId?: string;
  hostDependencies?: c420uiHostDependencyConfig;
  maintenance?: c420uiMaintenanceConfig;
};
