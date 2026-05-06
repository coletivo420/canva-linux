import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

type PackageJson = {
  scripts?: Record<string, string>;
};

const removedWrappers = [
  "scripts/build-runtime.js",
  "scripts/build-preload-bundle.js",
  "scripts/copy-runtime-assets.js",
  "scripts/clean-runtime-build.js",
  "scripts/electron-builder-before-build.js",
  "scripts/run-node-tests.js",
  "scripts/run-tui.js",
  "scripts/run-typescript-script.js",
] as const;

const requiredStandaloneEntrypoints = [
  "scripts/build-runtime.ts",
  "scripts/build-preload-bundle.ts",
  "scripts/copy-runtime-assets.ts",
  "scripts/clean-runtime-build.ts",
  "scripts/run-node-tests.ts",
  "scripts/run-tui.ts",
] as const;

const requiredBootstrapEntrypoints = {
  "bootstrap:typescript": {
    source: "scripts/run-typescript-script.ts",
    artifact: ".build/scripts/bootstrap/run-typescript-script.js",
  },
  "bootstrap:electron-builder": {
    source: "scripts/electron-builder-before-build.ts",
    artifact: ".build/scripts/bootstrap/electron-builder-before-build.js",
  },
} as const;

const requiredArtifactScripts = {
  test: ".build/scripts/run-node-tests.js",
  "build:preload": ".build/scripts/build-preload-bundle.js",
  "clean:runtime": ".build/scripts/clean-runtime-build.js",
  "build:runtime": ".build/scripts/build-runtime.js",
  tui: ".build/scripts/run-tui.js",
  "check:tui": ".build/scripts/run-tui.js",
} as const;

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const wrapper of removedWrappers) {
    if (fs.existsSync(path.join(rootDir, wrapper)))
      failures.push(
        `${wrapper}: compatibility JavaScript wrappers are no longer allowed`,
      );
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as PackageJson;
  const packageScripts = packageJson.scripts ?? {};
  const standaloneBuild = packageScripts["build:scripts"] ?? "";

  for (const source of requiredStandaloneEntrypoints) {
    if (!fs.existsSync(path.join(rootDir, source)))
      failures.push(`${source}: missing TypeScript-first entrypoint`);
    if (!standaloneBuild.includes(source))
      failures.push(`package.json build:scripts: must compile ${source}`);
  }

  for (const [scriptName, entrypoint] of Object.entries(
    requiredBootstrapEntrypoints,
  )) {
    const command = packageScripts[scriptName] ?? "";
    if (!fs.existsSync(path.join(rootDir, entrypoint.source)))
      failures.push(
        `${entrypoint.source}: missing TypeScript-first entrypoint`,
      );
    if (
      !command.includes(entrypoint.source) ||
      !command.includes(entrypoint.artifact)
    ) {
      failures.push(
        `package.json scripts.${scriptName}: must compile ${entrypoint.source} to ${entrypoint.artifact}`,
      );
    }
  }

  if (
    !standaloneBuild.includes("--outdir=.build/scripts") ||
    !standaloneBuild.includes("--entry-names=[name]")
  ) {
    failures.push(
      "package.json build:scripts: must emit generated entrypoints directly under .build/scripts",
    );
  }

  for (const [scriptName, artifact] of Object.entries(
    requiredArtifactScripts,
  )) {
    const command = packageScripts[scriptName] ?? "";
    if (!command.includes("build:scripts") || !command.includes(artifact)) {
      failures.push(
        `package.json scripts.${scriptName}: must build standalone TypeScript artifacts and run ${artifact}`,
      );
    }
  }

  if (failures.length) {
    console.error("[typescript-wrapper-contract] FAILED:");
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log("[ok] TypeScript wrapper closure check passed");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[typescript-wrapper-contract] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
