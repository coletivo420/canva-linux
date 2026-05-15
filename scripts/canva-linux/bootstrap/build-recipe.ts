import type * as esbuild from "esbuild";

export const C420UI_BOOTSTRAP_ENTRYPOINTS = [
  "scripts/run-c420ui.ts",
  "scripts/run-c420ui-cli.ts",
] as const;

export const C420UI_BOOTSTRAP_EXTERNALS = [
  "electron",
  "term.js",
  "pty.js",
] as const;

export const C420UI_BOOTSTRAP_BUILD_RECIPE = "scripts/build-c420ui-bootstrap.ts";
export const C420UI_BOOTSTRAP_BUILD_TOOL = "esbuild";
export const C420UI_BOOTSTRAP_BUILD_TARGET = "node22";
export const C420UI_BOOTSTRAP_BUNDLE_FORMAT = "cjs";
export const C420UI_BOOTSTRAP_MODULE_FORMAT = "commonjs";
export const C420UI_BOOTSTRAP_FUTURE_MODULE_FORMAT = "esm";

export function createC420UIBootstrapBuildOptions(rootDir: string, outdir: string): esbuild.BuildOptions {
  return {
    absWorkingDir: rootDir,
    bundle: true,
    entryNames: "[name]",
    entryPoints: [...C420UI_BOOTSTRAP_ENTRYPOINTS],
    external: [...C420UI_BOOTSTRAP_EXTERNALS],
    format: C420UI_BOOTSTRAP_BUNDLE_FORMAT,
    outExtension: { ".js": ".cjs" },
    outdir,
    platform: "node",
    target: C420UI_BOOTSTRAP_BUILD_TARGET,
  };
}

export function createC420UIBootstrapEsbuildCliArgs(outdir: string): string[] {
  return [
    ...C420UI_BOOTSTRAP_ENTRYPOINTS,
    "--bundle",
    "--platform=node",
    `--target=${C420UI_BOOTSTRAP_BUILD_TARGET}`,
    `--format=${C420UI_BOOTSTRAP_BUNDLE_FORMAT}`,
    `--outdir=${outdir}`,
    "--entry-names=[name]",
    "--out-extension:.js=.cjs",
    ...C420UI_BOOTSTRAP_EXTERNALS.map((external) => `--external:${external}`),
  ];
}
