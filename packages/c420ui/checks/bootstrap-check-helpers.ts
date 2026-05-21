export const C420UI_BOOTSTRAP_GENERATED_DIR =
  "packages/c420ui/bootstrap/generated";

export const C420UI_BOOTSTRAP_ARTIFACT_FILES = [
  "run-c420ui.cjs",
  "run-c420ui-cli.cjs",
  "c420ui-builder.cjs",
] as const;

export function c420uiBootstrapArtifactPath(file: string): string {
  return `${C420UI_BOOTSTRAP_GENERATED_DIR}/${file}`;
}
