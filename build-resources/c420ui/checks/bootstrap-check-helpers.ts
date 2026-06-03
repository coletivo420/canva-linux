export const C420UI_BOOTSTRAP_ARTIFACT_FILES = [
  "run-c420ui.mjs",
  "run-c420ui-cli.mjs",
  "c420ui-builder.mjs",
] as const;

export type C420UIBootstrapArtifactFile =
  (typeof C420UI_BOOTSTRAP_ARTIFACT_FILES)[number];

export function c420uiBootstrapArtifactPath(
  artifact: C420UIBootstrapArtifactFile | string,
): string {
  return `build-resources/c420ui/bootstrap/generated/${artifact}`;
}

export const C420UI_BOOTSTRAP_MANIFEST_PATH =
  "build-resources/c420ui/bootstrap/generated/manifest.json";
