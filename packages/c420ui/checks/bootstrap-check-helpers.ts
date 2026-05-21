export const C420UI_BOOTSTRAP_ARTIFACT_FILES = [
  "run-c420ui.cjs",
  "run-c420ui-cli.cjs",
  "c420ui-builder.cjs",
] as const;

export type C420UIBootstrapArtifactFile =
  (typeof C420UI_BOOTSTRAP_ARTIFACT_FILES)[number];

export function c420uiBootstrapArtifactPath(
  artifact: C420UIBootstrapArtifactFile | string,
): string {
  return `packages/c420ui/bootstrap/generated/${artifact}`;
}

export const C420UI_BOOTSTRAP_MANIFEST_PATH =
  "packages/c420ui/bootstrap/generated/manifest.json";
