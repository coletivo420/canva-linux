import type { C420UIActionDescriptor } from "./actions";
import type { C420UIEventSink } from "./events";

export type C420UIArtifactKind =
  | "appimage"
  | "flatpak"
  | "native"
  | "deb"
  | "rpm"
  | "aur"
  | "tarball"
  | "checksums"
  | "metadata";

export type C420UIArtifactRecipe = {
  id: string;
  kind: C420UIArtifactKind;
  label: string;
  outputPattern?: string;
  actionId?: string;
  planned?: boolean;
  validatesWith?: string[];
};

export type C420UIArtifactWorkflow = {
  id: string;
  label: string;
  description?: string;
  artifacts: C420UIArtifactRecipe[];
  actions: C420UIActionDescriptor[];
  requiresRoot?: boolean;
  supportsDryRun?: boolean;
};

export type C420UIArtifactWorkflowContext = {
  rootDir: string;
  dryRun?: boolean;
  emit?: C420UIEventSink;
};
