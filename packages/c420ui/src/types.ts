export type C420UIBrandConfig = {
  name: string;
  version: string;
  logoLines: string[];
};

export type C420UIProjectConfig = {
  projectName: string;
  projectSubtitle: string;
  displayVersion: string;
  phase?: string;
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
};
