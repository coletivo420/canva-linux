export type c420uiArtifactKind =
  | "appimage"
  | "flatpak"
  | "tarball"
  | "deb"
  | "rpm"
  | "aur"
  | "native"
  | "custom";

export type c420uiArtifactScope =
  | "user"
  | "system"
  | "portable"
  | "release"
  | "none";

export type c420uiArtifactWorkflow = {
  id: string;
  kind: c420uiArtifactKind;
  label: string;
  description?: string;
  scope?: c420uiArtifactScope;
  buildActionId?: string;
  validateActionId?: string;
  installActionId?: string;
  uninstallActionId?: string;
  purgeActionId?: string;
  releaseActionId?: string;
  planned?: boolean;
  requiresRoot?: boolean;
  outputPattern?: string;
};

export type C420UIArtifactKind = c420uiArtifactKind;
export type C420UIArtifactScope = c420uiArtifactScope;
export type C420UIArtifactWorkflow = c420uiArtifactWorkflow;

export type C420UIArtifactRecipe = c420uiArtifactWorkflow & {
  outputPattern?: string;
};

export type C420UIArtifactWorkflowContext = {
  rootDir: string;
  dryRun?: boolean;
};
