import fs from "node:fs";
import path from "node:path";

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function fileExistsAndIsNotEmpty(rootDir: string, relativePath: string, failures: string[]): void {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: required bootstrap artifact is missing`);
    return;
  }
  const stats = fs.statSync(absolutePath);
  if (!stats.isFile() || stats.size <= 0) {
    failures.push(`${relativePath}: required bootstrap artifact must be a non-empty file`);
  }
}

function indexOfRequired(content: string, fragment: string, failures: string[], label: string): number {
  const index = content.indexOf(fragment);
  if (index === -1) failures.push(`${label}: missing required fragment ${fragment}`);
  return index;
}

function main(): void {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const manifestPath = "bootstrap/c420ui/manifest.json";
  const uiBundlePath = "bootstrap/c420ui/run-c420ui.cjs";
  const cliBundlePath = "bootstrap/c420ui/run-c420ui-cli.cjs";

  for (const relativePath of [manifestPath, uiBundlePath, cliBundlePath]) {
    fileExistsAndIsNotEmpty(rootDir, relativePath, failures);
  }

  if (fs.existsSync(path.join(rootDir, manifestPath))) {
    const manifest = JSON.parse(read(rootDir, manifestPath)) as Record<string, unknown>;
    const rootPackageJson = JSON.parse(read(rootDir, "package.json")) as { version?: string };
    const c420uiPackageJson = JSON.parse(read(rootDir, "packages/c420ui/package.json")) as { version?: string };

    if ("version" in manifest) {
      failures.push(`${manifestPath}: use c420uiVersion and dependentProjectVersion instead of ambiguous version`);
    }
    if (c420uiPackageJson.version === rootPackageJson.version) {
      failures.push("packages/c420ui/package.json: c420ui version must stay distinct from the dependent project version");
    }

    const expected: Record<string, unknown> = {
      kind: "c420ui-bootstrap",
      c420uiVersion: c420uiPackageJson.version,
      dependentProject: "canva-linux",
      dependentProjectVersion: rootPackageJson.version,
      entrypoint: "run-c420ui.cjs",
      cliEntrypoint: "run-c420ui-cli.cjs",
      moduleFormat: "commonjs",
      futureModuleFormat: "esm",
      typescriptFirst: true,
      ownsFullDependencyPolicy: true,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (manifest[key] !== value) {
        failures.push(`${manifestPath}: expected ${key} to be ${JSON.stringify(value)}`);
      }
    }
  }

  const launcher = read(rootDir, "canva-linux.sh");
  const bootstrapUiIndex = indexOfRequired(launcher, "bootstrap/c420ui/run-c420ui.cjs", failures, "canva-linux.sh");
  const bootstrapCliIndex = indexOfRequired(launcher, "bootstrap/c420ui/run-c420ui-cli.cjs", failures, "canva-linux.sh");
  const buildUiIndex = indexOfRequired(launcher, ".build/scripts/run-c420ui.js", failures, "canva-linux.sh");
  const buildCliIndex = indexOfRequired(launcher, ".build/scripts/run-c420ui-cli.js", failures, "canva-linux.sh");

  if (bootstrapUiIndex !== -1 && buildUiIndex !== -1 && bootstrapUiIndex > buildUiIndex) {
    failures.push("canva-linux.sh: interactive launcher must check bootstrap/c420ui/run-c420ui.cjs before .build fallback");
  }
  if (bootstrapCliIndex !== -1 && buildCliIndex !== -1 && bootstrapCliIndex > buildCliIndex) {
    failures.push("canva-linux.sh: direct CLI launcher must check bootstrap/c420ui/run-c420ui-cli.cjs before .build fallback");
  }

  for (const forbidden of [
    "npm install",
    "npm ci",
    "scripts/ensure-npm-dependencies.sh",
    "CANVA_REQUIRED_NPM_DEPS",
    "CANVA_SKIP_NPM_INSTALL",
    "CANVA_NPM_REPAIR",
  ]) {
    if (launcher.includes(forbidden)) failures.push(`canva-linux.sh: must not contain ${forbidden}`);
  }

  for (const relativePath of [uiBundlePath, cliBundlePath]) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) continue;
    const bundle = read(rootDir, relativePath);
    for (const forbidden of ["electron-builder", "@typescript-eslint", "playwright", "typescript/lib"]) {
      if (bundle.includes(forbidden)) failures.push(`${relativePath}: must not contain ${forbidden}`);
    }
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

main();
