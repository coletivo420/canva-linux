#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../canva-linux/project-root";

type PolicyCheck = {
  name: string;
  run: () => number;
};

function runCheck(failures: string[], check: PolicyCheck): void {
  try {
    const exitCode = check.run();
    if (exitCode !== 0) failures.push(`${check.name}: exited with ${exitCode}`);
  } catch (error) {
    failures.push(`${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const repositoryWalkSkippedDirectories = new Set([
  ".build",
  ".flatpak-builder",
  ".git",
  "build-dir",
  "coverage",
  "dist",
  "node_modules",
  "repo",
  "test-results",
]);

let repositoryFilesCache: { rootDir: string; files: string[] } | null = null;

function toRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/g, "/");
}

function collectRepositoryFiles(
  rootDir: string,
  directory: string,
  output: string[],
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRelative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      if (
        repositoryWalkSkippedDirectories.has(relativePath) ||
        repositoryWalkSkippedDirectories.has(entry.name)
      ) {
        continue;
      }
      collectRepositoryFiles(rootDir, absolutePath, output);
      continue;
    }

    if (entry.isFile()) output.push(relativePath);
  }
}

function allRepositoryFiles(rootDir: string): string[] {
  if (repositoryFilesCache?.rootDir === rootDir) return repositoryFilesCache.files;
  const files: string[] = [];
  collectRepositoryFiles(rootDir, rootDir, files);
  repositoryFilesCache = {
    rootDir,
    files: files.sort((left, right) => left.localeCompare(right)),
  };
  return repositoryFilesCache.files;
}

const checkTypeScriptWrappersContract = (() => {
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
  "scripts/run-c420ui.js",
  "scripts/run-typescript-script.js",
] as const;

const requiredStandaloneEntrypoints = [
  "scripts/build-runtime.ts",
  "scripts/build-preload-bundle.ts",
  "scripts/copy-runtime-assets.ts",
  "scripts/clean-runtime-build.ts",
  "scripts/run-node-tests.ts",
  "scripts/run-c420ui.ts",
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
  c420ui: ".build/scripts/run-c420ui.js",
  "check:c420ui": ".build/scripts/run-c420ui.js",
} as const;

function main(): number {
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

  console.log("[repository-policy] TypeScript wrappers OK");
  return 0;
}

  return { main };
})();

const checkTypeScriptFirstContract = (() => {
type PackageJson = {
  scripts?: Record<string, string>;
  build?: { beforeBuild?: string };
};

type TsConfigJson = {
  compilerOptions?: {
    allowJs?: boolean;
    checkJs?: boolean;
  };
  include?: string[];
};

const allowedJavaScriptPrefixes = [".build/", "node_modules/"] as const;

const sourceJavaScriptAllowlist = new Set(["electron/preload/canva.bundle.js"]);

const nativeSourceExtensions = new Set([
  ".sh",
  ".json",
  ".yml",
  ".yaml",
  ".xml",
  ".desktop",
  ".html",
]);

const forbiddenSourceRoots = [
  "scripts/",
  "test/",
  "packaging/flathub/scripts/",
] as const;

const forbiddenConfigFiles = new Set([
  "eslint.config.js",
  "playwright.config.js",
]);

function isAllowedGeneratedJavaScript(relativePath: string): boolean {
  return allowedJavaScriptPrefixes.some((prefix) =>
    relativePath.startsWith(prefix),
  );
}

function validateNoMaintainedJavaScript(
  files: string[],
  failures: string[],
): void {
  for (const file of files) {
    if (!file.endsWith(".js")) continue;
    if (sourceJavaScriptAllowlist.has(file)) continue;
    if (isAllowedGeneratedJavaScript(file)) continue;
    failures.push(
      `${file}: maintained JavaScript source is not allowed; migrate it to TypeScript or generated .build output`,
    );
  }
}

function validateRequiredTypeScriptEntrypoints(
  rootDir: string,
  failures: string[],
): void {
  const required = [
    "eslint.config.ts",
    "playwright.config.ts",
    "scripts/run-node-tests.ts",
    "scripts/run-typescript-script.ts",
    "scripts/run-core-entry.sh",
    "packaging/flathub/scripts/generate-npm-sources.ts",
    "packaging/flathub/scripts/generate-npm-sources.sh",
  ] as const;

  for (const file of required) {
    if (!fs.existsSync(path.join(rootDir, file)))
      failures.push(
        `${file}: required TypeScript migration entrypoint is missing`,
      );
  }
}

function validateForbiddenConfigs(rootDir: string, failures: string[]): void {
  for (const file of forbiddenConfigFiles) {
    if (fs.existsSync(path.join(rootDir, file)))
      failures.push(
        `${file}: JavaScript config is forbidden; use the .ts config`,
      );
  }
}

function validatePackageScripts(rootDir: string, failures: string[]): void {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as PackageJson;
  const scripts = pkg.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    const forbidden = command.match(
      /(?:^|\s)(?:node\s+)?(?:scripts|test|packaging\/flathub\/scripts)\/[^\s]+\.js\b/,
    );
    if (forbidden)
      failures.push(
        `package.json scripts.${name}: invokes maintained JavaScript source (${forbidden[0].trim()})`,
      );
  }

  if (
    pkg.build?.beforeBuild !==
    "./.build/scripts/bootstrap/electron-builder-before-build.js"
  ) {
    failures.push(
      "package.json build.beforeBuild: must point at generated .build TypeScript output",
    );
  }
}

function validateTypeScriptConfig(
  rootDir: string,
  configPath: string,
  failures: string[],
): void {
  const config = JSON.parse(
    fs.readFileSync(path.join(rootDir, configPath), "utf8"),
  ) as TsConfigJson;
  if (Object.hasOwn(config.compilerOptions ?? {}, "allowJs")) {
    failures.push(
      `${configPath}: compilerOptions.allowJs must be omitted because JavaScript source is forbidden`,
    );
  }
  if (Object.hasOwn(config.compilerOptions ?? {}, "checkJs")) {
    failures.push(
      `${configPath}: compilerOptions.checkJs must be omitted because JavaScript source is forbidden`,
    );
  }

  const forbiddenIncludes = [
    "electron/**/*.js",
    "scripts/**/*.js",
    "test/**/*.js",
  ] as const;
  for (const forbiddenInclude of forbiddenIncludes) {
    if (config.include?.includes(forbiddenInclude)) {
      failures.push(
        `${configPath}: must not include ${forbiddenInclude} because maintained source must be TypeScript`,
      );
    }
  }
}

function validateTypeScriptConfigs(rootDir: string, failures: string[]): void {
  for (const configPath of ["tsconfig.json", "tsconfig.build.json"] as const) {
    validateTypeScriptConfig(rootDir, configPath, failures);
  }
}

function validateEslintTypeScriptOnlyConfig(
  rootDir: string,
  failures: string[],
): void {
  const configPath = "eslint.config.ts";
  const config = fs.readFileSync(path.join(rootDir, configPath), "utf8");
  if (
    config.includes("'electron/**/*.js'") ||
    config.includes('"electron/**/*.js"')
  ) {
    failures.push(
      `${configPath}: must not include a dedicated electron/**/*.js lint block after the TypeScript migration`,
    );
  }
}

function validateNoCommonJsRuntimeExports(
  rootDir: string,
  files: string[],
  failures: string[],
): void {
  for (const file of files) {
    if (!file.startsWith("electron/main/") || !file.endsWith(".ts")) continue;
    const content = fs.readFileSync(path.join(rootDir, file), "utf8");
    if (content.includes("module.exports")) {
      failures.push(
        `${file}: use ESM exports only; duplicate module.exports blocks are forbidden in Electron main TypeScript`,
      );
    }
  }
}

function validateFlathubShell(rootDir: string, failures: string[]): void {
  const shellPath = "packaging/flathub/scripts/generate-npm-sources.sh";
  const shellContent = fs.readFileSync(path.join(rootDir, shellPath), "utf8");
  if (!shellContent.includes("generate-npm-sources.ts")) {
    failures.push(
      `${shellPath}: must invoke the TypeScript npm source generator`,
    );
  }
}

function validateSourceRootExtensions(
  files: string[],
  failures: string[],
): void {
  for (const file of files) {
    if (!forbiddenSourceRoots.some((root) => file.startsWith(root))) continue;
    const extension = path.extname(file);
    if (extension === ".ts" || nativeSourceExtensions.has(extension)) continue;
    failures.push(
      `${file}: unsupported maintained source extension under TypeScript-first roots`,
    );
  }
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const files = allRepositoryFiles(rootDir);

  validateNoMaintainedJavaScript(files, failures);
  validateSourceRootExtensions(files, failures);
  validateForbiddenConfigs(rootDir, failures);
  validateRequiredTypeScriptEntrypoints(rootDir, failures);
  validatePackageScripts(rootDir, failures);
  validateTypeScriptConfigs(rootDir, failures);
  validateEslintTypeScriptOnlyConfig(rootDir, failures);
  validateNoCommonJsRuntimeExports(rootDir, files, failures);
  validateFlathubShell(rootDir, failures);

  if (failures.length) {
    console.error("[typescript-first] FAILED:");
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log("[repository-policy] TypeScript-first OK");
  return 0;
}

  return { main };
})();

const checkGitignorePolicyContract = (() => {
const essentialActiveGitignorePatterns = [
  "node_modules/",
  ".build/",
  "dist/",
  "build-dir/",
  "repo/",
  ".flatpak-builder/",
  "*.log",
] as const;

const requiredIgnoredPaths = [
  ".build/generated.js",
  "dist/generated.js",
  "build-dir/generated",
  "repo/generated",
  ".flatpak-builder/generated",
] as const;

const generatedOutputJavaScriptPaths = [
  ".build/generated.js",
  "dist/generated.js",
  "out/generated.js",
  "release/generated.js",
  "coverage/generated.js",
] as const;

const sourceJavaScriptProbePaths = [
  "scripts/source-regression.js",
  "electron/main/source-regression.js",
  "test/source-regression.test.js",
  "packaging/flathub/scripts/source-regression.js",
  "eslint.config.js",
  "playwright.config.js",
] as const;

const requiredVersionedPaths = [
  "eslint.config.ts",
  "playwright.config.ts",
  "tsconfig.json",
  "tsconfig.build.json",
  "tsconfig.strict.json",
  "package-lock.json",
  "config/canva-linux/actions.json",
  "config/canva-linux/project-ui.json",
  "scripts/theme.json",
  "io.github.coletivo420.canva-linux.yml",
  "packaging/flathub/manifest.yml",
  "packaging/flathub/generated-sources.json",
  "packaging/flathub/scripts/generate-npm-sources.ts",
  "data/io.github.coletivo420.canva-linux.desktop",
  "data/io.github.coletivo420.canva-linux.metainfo.xml",
  "data/icons/hicolor/128x128/apps/io.github.coletivo420.canva-linux.png",
  "docs/README.md",
  "README.md",
  "CHANGELOG.md",
  "REVIEW.md",
] as const;

function gitCheckIgnore(rootDir: string, candidatePath: string): boolean {
  const result = spawnSync(
    "git",
    ["check-ignore", "--no-index", candidatePath],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
    },
  );

  if (result.status === 0) return true;
  if (result.status === 1) return false;

  const details = [result.stderr, result.stdout]
    .filter(Boolean)
    .join("\n")
    .trim();
  throw new Error(
    `git check-ignore failed for ${candidatePath}${details ? `: ${details}` : ""}`,
  );
}

function gitTrackedFiles(rootDir: string, pathspec: string): string[] {
  const result = spawnSync("git", ["ls-files", "-z", pathspec], {
    cwd: rootDir,
    encoding: "buffer",
    shell: false,
  });

  if (result.status !== 0) {
    const details = Buffer.concat([result.stderr, result.stdout])
      .toString("utf8")
      .trim();
    throw new Error(
      `git ls-files failed for ${pathspec}${details ? `: ${details}` : ""}`,
    );
  }

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function validateGitignoreShape(rootDir: string, failures: string[]): void {
  const gitignorePath = path.join(rootDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    failures.push(".gitignore: missing required ignore policy file");
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf8");
  const lines = content.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const activePatterns = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (
    nonEmptyLines.length < 20 ||
    activePatterns.length < essentialActiveGitignorePatterns.length
  ) {
    failures.push(
      ".gitignore: appears collapsed; expected a multiline file with one active ignore pattern or comment per line",
    );
  }

  for (const requiredPattern of essentialActiveGitignorePatterns) {
    if (!activePatterns.includes(requiredPattern)) {
      failures.push(
        `.gitignore: missing active ignore pattern ${requiredPattern}; patterns hidden inside comments do not apply`,
      );
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("#")) {
      for (const requiredPattern of essentialActiveGitignorePatterns) {
        if (trimmed.includes(requiredPattern)) {
          failures.push(
            `.gitignore:${index + 1}: active ignore pattern ${requiredPattern} is hidden inside a comment; put it on its own non-comment line`,
          );
        }
      }
      return;
    }

    if (/\s+#/.test(line)) {
      failures.push(
        `.gitignore:${index + 1}: comments must start on their own line`,
      );
    }

    if (/\s/.test(trimmed)) {
      failures.push(
        `.gitignore:${index + 1}: expected one ignore pattern per line`,
      );
    }

    if (
      trimmed === "*.js" ||
      trimmed === "**/*.js" ||
      trimmed.endsWith("/*.js")
    ) {
      failures.push(
        `.gitignore:${index + 1}: do not ignore source JavaScript globally or by source root; TypeScript migration checks must see it`,
      );
    }
  });
}

function validateIgnored(rootDir: string, failures: string[]): void {
  for (const requiredPath of requiredIgnoredPaths) {
    if (!gitCheckIgnore(rootDir, requiredPath))
      failures.push(
        `${requiredPath}: required generated output path is not ignored by .gitignore`,
      );
  }

  for (const generatedPath of generatedOutputJavaScriptPaths) {
    if (!gitCheckIgnore(rootDir, generatedPath))
      failures.push(
        `${generatedPath}: generated JavaScript output path must be ignored`,
      );
  }
}

function validateNotIgnored(
  rootDir: string,
  candidatePaths: string[],
  label: string,
  failures: string[],
): void {
  for (const candidatePath of candidatePaths) {
    if (gitCheckIgnore(rootDir, candidatePath))
      failures.push(
        `${candidatePath}: ${label} must not be ignored by .gitignore`,
      );
  }
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  validateGitignoreShape(rootDir, failures);
  validateIgnored(rootDir, failures);
  validateNotIgnored(
    rootDir,
    gitTrackedFiles(rootDir, "scripts/**/*.ts"),
    "source TypeScript files",
    failures,
  );
  validateNotIgnored(
    rootDir,
    gitTrackedFiles(rootDir, "electron/**/*.ts"),
    "runtime TypeScript files",
    failures,
  );
  validateNotIgnored(
    rootDir,
    gitTrackedFiles(rootDir, "test/**/*.ts"),
    "TypeScript tests",
    failures,
  );
  validateNotIgnored(
    rootDir,
    [...requiredVersionedPaths],
    "versioned source, config, docs, or Flathub submission files",
    failures,
  );
  validateNotIgnored(
    rootDir,
    [...sourceJavaScriptProbePaths],
    "source JavaScript must remain visible to TypeScript migration checks",
    failures,
  );

  if (failures.length) {
    console.error("[gitignore-policy] FAILED:");
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log("[repository-policy] gitignore OK");
  return 0;
}

  return { main };
})();

const checkNoSourceJavaScriptContract = (() => {
const allowedJavaScriptRoots = [
  ".build/",
  "node_modules/",
  "coverage/",
  "dist/",
] as const;

const allowedGeneratedJavaScriptFiles = new Set([
  "electron/preload/canva.bundle.js",
]);

const explicitlyBlockedJavaScript = [
  /^scripts\/.+\.js$/,
  /^test\/.+\.js$/,
  /^packaging\/flathub\/scripts\/.+\.js$/,
  /^eslint\.config\.js$/,
  /^playwright\.config\.js$/,
] as const;

function isAllowedJavaScript(relativePath: string): boolean {
  return (
    allowedGeneratedJavaScriptFiles.has(relativePath) ||
    allowedJavaScriptRoots.some((prefix) => relativePath.startsWith(prefix))
  );
}

function isExplicitlyBlocked(relativePath: string): boolean {
  return explicitlyBlockedJavaScript.some((pattern) =>
    pattern.test(relativePath),
  );
}

function findForbiddenJavaScript(rootDir: string): string[] {
  return allRepositoryFiles(rootDir)
    .filter((file) => file.endsWith(".js"))
    .filter((file) => !isAllowedJavaScript(file))
    .sort((left, right) => left.localeCompare(right));
}

function formatFailure(file: string): string {
  const reason = isExplicitlyBlocked(file)
    ? "explicitly blocked JavaScript source"
    : "JavaScript source outside generated/dependency output";
  return `${file}: ${reason}; migrate maintained Node.js source to TypeScript`;
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures = findForbiddenJavaScript(rootDir);

  if (failures.length) {
    console.error("[no-source-javascript] FAILED:");
    for (const failure of failures)
      console.error(`- ${formatFailure(failure)}`);
    return 1;
  }

  console.log(
    "[repository-policy] no source JavaScript OK",
  );
  return 0;
}

  return { main };
})();

const checkSourceIntegrityContract = (() => {
type PackageJson = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
};

type PackageLockJson = {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: { "": { name?: string; version?: string } };
};

const requiredJsonFiles = ["package.json", "package-lock.json"] as const;

const requiredShellFiles = [
  "canva-linux.sh",
  "scripts/validate-project.sh",
  "scripts/run-core-entry.sh",
] as const;

const centralDocumentationFiles = [
  "README.md",
  "CHANGELOG.md",
  "REVIEW.md",
  "docs/README.md",
  "docs/TYPESCRIPT.md",
  "docs/VALIDATION.md",
  "docs/notes/FLATHUB.md",
] as const;

const criticalMultilineFiles = [
  ...requiredShellFiles,
  ...centralDocumentationFiles,
] as const;

const criticalReadableSourceFiles = [
  "eslint.config.ts",
  "playwright.config.ts",
  "scripts/run-node-tests.ts",
  "scripts/run-typescript-script.ts",
  "scripts/core/check-repository-policy.ts",
  "packages/c420ui/src/root-provider.ts",
  "packages/c420ui/src/command-runner.ts",
  "packages/c420ui/src/operational-logs.ts",
  "scripts/c420ui/interactive-action-runner.ts",
  "scripts/c420ui-canva-linux/root-provider.ts",
  "electron/ui/toolbar.html",
] as const;

const maxDocumentationLineLength = 2000;
const strictDocumentationLineLength = 160;

const strictDocumentationLineLengthFiles = new Set([
  "README.md",
  "CHANGELOG.md",
  "docs/internal/AI_GUARDRAILS.md",
  "docs/CLI.md",
  "docs/DEVELOPMENT.md",
  "docs/TECHNICAL.md",
  "docs/TYPESCRIPT.md",
  "docs/VALIDATION.md",
]);

const forbiddenCompatibilityCliAliases = ["--install", "--bundle"] as const;

const forbiddenMaintainedJavaScriptFiles = [
  "eslint.config.js",
  "playwright.config.js",
  "scripts/run-typescript-script.js",
] as const;

function allSourceFiles(rootDir: string): string[] {
  return allRepositoryFiles(rootDir);
}

function readJsonFile<T>(
  rootDir: string,
  relativePath: string,
  failures: string[],
): T | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(rootDir, relativePath), "utf8"),
    ) as T;
  } catch (error) {
    failures.push(
      `${relativePath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
    return null;
  }
}

function validateJsonFile(
  rootDir: string,
  relativePath: string,
  failures: string[],
): void {
  const absolutePath = path.join(rootDir, relativePath);
  const parsed = readJsonFile<unknown>(rootDir, relativePath, failures);
  if (parsed === null) return;

  if (relativePath === "package.json" || relativePath === "package-lock.json") {
    const expected = `${JSON.stringify(parsed, null, 2)}\n`;
    const actual = fs.readFileSync(absolutePath, "utf8");
    if (actual !== expected)
      failures.push(
        `${relativePath}: must be normalized two-space JSON with a trailing newline`,
      );
  }
}

function validateRequiredFiles(rootDir: string, failures: string[]): void {
  for (const file of [
    ...requiredJsonFiles,
    ...requiredShellFiles,
    ...centralDocumentationFiles,
    ...criticalReadableSourceFiles,
  ]) {
    if (!fs.existsSync(path.join(rootDir, file)))
      failures.push(`${file}: required validation target is missing`);
  }
}

function lineNumberOfLongestLine(lines: string[]): number {
  let longestLine = 0;
  let longestLength = -1;

  lines.forEach((line, index) => {
    if (line.length > longestLength) {
      longestLine = index + 1;
      longestLength = line.length;
    }
  });

  return longestLine;
}

function validateCriticalTextShape(
  rootDir: string,
  relativePath: string,
  failures: string[],
): void {
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const lines = content.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (content.length > 500 && nonEmptyLines.length < 3) {
    failures.push(
      `${relativePath}: critical shell/doc file appears collapsed or minified; expected readable multiline content`,
    );
  }

  if (relativePath.endsWith(".md")) {
    const lineLengthLimit = strictDocumentationLineLengthFiles.has(relativePath)
      ? strictDocumentationLineLength
      : maxDocumentationLineLength;
    const longestLine = Math.max(...lines.map((line) => line.length), 0);
    if (longestLine > lineLengthLimit) {
      failures.push(
        `${relativePath}:${lineNumberOfLongestLine(lines)}: documentation line is too long (${longestLine} characters); limit is ${lineLengthLimit}; avoid giant one-line blocks`,
      );
    }
  }
}

function validateReadableSourceShape(
  rootDir: string,
  relativePath: string,
  failures: string[],
): void {
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const lines = content.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const longestLine = Math.max(...lines.map((line) => line.length), 0);

  if (content.length > 500 && nonEmptyLines.length < 5) {
    failures.push(
      `${relativePath}: critical source/config file appears collapsed or minified; expected readable multiline content`,
    );
  }

  if (longestLine > 500) {
    failures.push(
      `${relativePath}:${lineNumberOfLongestLine(lines)}: source/config line is too long (${longestLine} characters); avoid collapsed or minified source`,
    );
  }
}

function validateToolbarContentSecurityPolicy(
  rootDir: string,
  failures: string[],
): void {
  const relativePath = "electron/ui/toolbar.html";
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const requiredDirectives = [
    "default-src 'none'",
    "img-src 'self' file: data:",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ] as const;

  if (!content.includes('http-equiv="Content-Security-Policy"')) {
    failures.push(
      `${relativePath}: toolbar loaded from file:// must define a Content-Security-Policy meta tag`,
    );
    return;
  }

  for (const directive of requiredDirectives) {
    if (!content.includes(directive))
      failures.push(
        `${relativePath}: Content-Security-Policy missing directive ${directive}`,
      );
  }
}

function validateNoMaintainedJavaScriptFiles(
  rootDir: string,
  failures: string[],
): void {
  for (const relativePath of forbiddenMaintainedJavaScriptFiles) {
    if (fs.existsSync(path.join(rootDir, relativePath))) {
      failures.push(
        `${relativePath}: maintained JavaScript source/config contradicts the TypeScript-only source policy; use the corresponding TypeScript source and generated .build output`,
      );
    }
  }
}

function validateRetiredC420UIProcessRunner(
  rootDir: string,
  failures: string[],
): void {
  const retiredPath = "scripts/c420ui/process-runner.ts";
  if (fs.existsSync(path.join(rootDir, retiredPath))) {
    failures.push(
      `${retiredPath}: must not exist after command runner migration`,
    );
  }
}

function validatePackageLockConsistency(
  rootDir: string,
  failures: string[],
): void {
  const packageJson = readJsonFile<PackageJson>(
    rootDir,
    "package.json",
    failures,
  );
  const packageLock = readJsonFile<PackageLockJson>(
    rootDir,
    "package-lock.json",
    failures,
  );
  if (!packageJson || !packageLock) return;

  if (typeof packageLock.lockfileVersion !== "number")
    failures.push("package-lock.json: missing numeric lockfileVersion");
  if (
    packageJson.name &&
    packageLock.name &&
    packageJson.name !== packageLock.name
  )
    failures.push("package-lock.json: root name must match package.json");
  if (
    packageJson.version &&
    packageLock.version &&
    packageJson.version !== packageLock.version
  )
    failures.push("package-lock.json: root version must match package.json");

  const rootPackage = packageLock.packages?.[""];
  if (!rootPackage) {
    failures.push(
      'package-lock.json: missing packages[""] root package metadata',
    );
    return;
  }

  if (packageJson.name && rootPackage.name !== packageJson.name)
    failures.push(
      'package-lock.json packages[""].name must match package.json',
    );
  if (packageJson.version && rootPackage.version !== packageJson.version)
    failures.push(
      'package-lock.json packages[""].version must match package.json',
    );
}


const legacyActionRunnerStem = "action" + "-runner";
const legacyCompatibilityStem =
  "check-legacy-" + legacyActionRunnerStem + "-compatibility";

function checkNoLegacyActionRunner(rootDir: string, failures: string[]): void {
  const packageJson = readJsonFile<PackageJson>(
    rootDir,
    "package.json",
    failures,
  );
  const removedFiles = [
    `scripts/core/${legacyActionRunnerStem}.ts`,
    `scripts/core/${legacyCompatibilityStem}.ts`,
    "scripts/actions.json",
    "scripts/project-ui.json",
    "scripts/core/action-registry.ts",
    "scripts/core/validate-actions.ts",
  ] as const;

  for (const removedFile of removedFiles) {
    if (fs.existsSync(path.join(rootDir, removedFile))) {
      failures.push(`${removedFile}: legacy Action Runner files must not exist`);
    }
  }

  const scripts = packageJson?.scripts ?? {};
  const legacyScriptName = "check:" + "legacy-compat";
  if (Object.hasOwn(scripts, legacyScriptName)) {
    failures.push(
      `package.json scripts.${legacyScriptName}: legacy compatibility validation must not be restored`,
    );
  }

  const scriptsCoreBuild = scripts["build:scripts-core"] ?? "";
  if (!scriptsCoreBuild.includes("rm -rf .build/scripts/core")) {
    failures.push(
      "package.json build:scripts-core: must clean .build/scripts/core before rebuilding so stale removed entries cannot survive",
    );
  }

  for (const removedFile of removedFiles) {
    if (scriptsCoreBuild.includes(removedFile)) {
      failures.push(
        `package.json build:scripts-core: must not compile ${removedFile}`,
      );
    }
  }
}

function validatePackageScripts(rootDir: string, failures: string[]): void {
  const packageJson = readJsonFile<PackageJson>(
    rootDir,
    "package.json",
    failures,
  );
  if (!packageJson) return;
  for (const [scriptName, command] of Object.entries(
    packageJson.scripts ?? {},
  )) {
    if (/\r|\n/.test(command))
      failures.push(
        `package.json scripts.${scriptName}: command must stay on one line`,
      );
  }
}

function validateShellShape(
  rootDir: string,
  relativePath: string,
  failures: string[],
): void {
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const lines = content.split(/\r?\n/);

  if (content.startsWith("#!") && content.length > 200 && lines.length < 5) {
    failures.push(
      `${relativePath}: shell file appears collapsed; expected multiple lines with command separators/heredocs preserved`,
    );
  }

  lines.forEach((line, index) => {
    const heredocMatch = line.match(
      /<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/,
    );
    if (!heredocMatch) return;

    const delimiter = heredocMatch[1];
    const afterDelimiter = line
      .slice((heredocMatch.index ?? 0) + heredocMatch[0].length)
      .trim();
    if (afterDelimiter.length > 0)
      failures.push(
        `${relativePath}:${index + 1}: heredoc delimiter ${delimiter} must be the final token on its own command line`,
      );

    const hasTerminator = lines
      .slice(index + 1)
      .some((candidate) => candidate.trim() === delimiter);
    if (!hasTerminator)
      failures.push(
        `${relativePath}:${index + 1}: heredoc delimiter ${delimiter} has no terminator line`,
      );
  });
}

function validateShellFile(
  rootDir: string,
  relativePath: string,
  failures: string[],
): void {
  validateShellShape(rootDir, relativePath, failures);

  const result = spawnSync("bash", ["-n", relativePath], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.error) {
    failures.push(
      `${relativePath}: failed to run bash -n (${result.error.message})`,
    );
    return;
  }

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout]
      .filter(Boolean)
      .join("\n")
      .trim();
    failures.push(
      `${relativePath}: shell syntax check failed${details ? `: ${details}` : ""}`,
    );
  }
}

function validateRunCoreEntryScriptShape(
  rootDir: string,
  failures: string[],
): void {
  const relativePath = "scripts/run-core-entry.sh";
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const lines = content.split(/\r?\n/);

  if (lines[0] !== "#!/usr/bin/env bash") {
    failures.push(`${relativePath}: shebang must be the first line by itself`);
  }

  if (lines[1] !== "set -euo pipefail") {
    failures.push(
      `${relativePath}: strict shell mode must be the second line by itself`,
    );
  }

  if (lines.length < 15) {
    failures.push(
      `${relativePath}: core entry wrapper appears collapsed; expected readable multiline shell content`,
    );
  }

  const requiredStandaloneLines = [
    '# Keep this wrapper formatted as real multiline shell; the shebang must stay alone.',
    "main() {",
    "  if [[ $# -lt 1 ]]; then",
    "  fi",
    '  ENTRY="$1"',
    "  shift",
    '      rm -f "${ROOT_DIR}/.build/scripts/core/${ENTRY}.js"',
    "      printf '%s\\n' \"scripts/run-core-entry.sh: ${ENTRY} was removed; use a supported core entry.\" >&2",
    '  node "${TARGET}" "$@"',
  ] as const;

  for (const requiredLine of requiredStandaloneLines) {
    if (!lines.includes(requiredLine)) {
      failures.push(
        `${relativePath}: expected standalone line ${JSON.stringify(requiredLine)}`,
      );
    }
  }
}

function validateProjectValidationScriptShape(
  rootDir: string,
  failures: string[],
): void {
  const relativePath = "scripts/validate-project.sh";
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const lines = content.split(/\r?\n/);

  if (lines[0] !== "#!/usr/bin/env bash") {
    failures.push(`${relativePath}: shebang must be the first line by itself`);
  }

  if (lines[1] !== "set -euo pipefail") {
    failures.push(
      `${relativePath}: strict shell mode must be the second line by itself`,
    );
  }

  if (lines.length < 60) {
    failures.push(
      `${relativePath}: validation script appears collapsed; expected readable multiline shell content`,
    );
  }

  const sourceFirstCommentIndex = lines.findIndex((line) =>
    line.includes("Do not move runtime build before lint,"),
  );
  if (sourceFirstCommentIndex === -1) {
    failures.push(
      `${relativePath}: missing source-first ordering comment for runtime build placement`,
    );
  } else if (!lines[sourceFirstCommentIndex]!.trim().startsWith("#")) {
    failures.push(
      `${relativePath}:${sourceFirstCommentIndex + 1}: source-first ordering prose must remain a shell comment`,
    );
  }

  const buildRuntimeIndex = lines.findIndex(
    (line) => line === 'run_step "npm run build:runtime" npm run build:runtime',
  );
  const validationBlockSteps = [
    'run_step "npm run check:c420ui-core" npm run check:c420ui-core',
    'run_step "npm run check:canva-linux" npm run check:canva-linux',
    'run_step "npm run check:shared-tooling" npm run check:shared-tooling',
  ] as const;
  const validationBlockIndexes = validationBlockSteps.map((step) =>
    lines.findIndex((line) => line === step),
  );

  if (buildRuntimeIndex === -1) {
    failures.push(
      `${relativePath}: missing npm run build:runtime validation step`,
    );
  }

  validationBlockSteps.forEach((step, index) => {
    if (validationBlockIndexes[index] === -1) {
      failures.push(`${relativePath}: missing ${step} validation step`);
    }
  });

  for (let index = 1; index < validationBlockIndexes.length; index += 1) {
    const previousIndex = validationBlockIndexes[index - 1]!;
    const currentIndex = validationBlockIndexes[index]!;
    if (
      previousIndex !== -1 &&
      currentIndex !== -1 &&
      currentIndex < previousIndex
    ) {
      failures.push(
        `${relativePath}: split validation steps must stay in c420ui, Canva Linux, and shared order`,
      );
    }
  }

  const lastValidationIndex = Math.max(...validationBlockIndexes);
  if (
    buildRuntimeIndex !== -1 &&
    lastValidationIndex !== -1 &&
    buildRuntimeIndex < lastValidationIndex
  ) {
    failures.push(
      `${relativePath}: npm run build:runtime must stay after split validation steps`,
    );
  }
}

function validateLauncherScriptShape(
  rootDir: string,
  failures: string[],
): void {
  const relativePath = "canva-linux.sh";
  const content = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  const lines = content.split(/\r?\n/);

  if (lines[0] !== "#!/usr/bin/env bash") {
    failures.push(`${relativePath}: shebang must be the first line by itself`);
  }

  if (lines[1] !== "set -euo pipefail") {
    failures.push(
      `${relativePath}: strict shell mode must be the second line by itself`,
    );
  }

  if (lines.length < 100) {
    failures.push(
      `${relativePath}: launcher appears collapsed; expected readable multiline shell content`,
    );
  }

  if (!content.includes("run-c420ui-cli.js")) {
    failures.push(
      `${relativePath}: direct CLI actions must route through the c420ui CLI bridge`,
    );
  }

  if (!content.includes("Only one direct action can be executed per invocation.")) {
    failures.push(
      `${relativePath}: launcher must reject multiple direct actions before execution`,
    );
  }

  const requiredLauncherParserFragments = [
    'case "${arg}" in',
    "FORCE=true",
    "DRY_RUN=true",
    "source_newer_than_entrypoint()",
    "c420ui_cli_entrypoint_is_fresh()",
    'find "${source}" -type f',
    '"${ROOT_DIR}/scripts/c420ui-canva-linux"',
    '"${ROOT_DIR}/scripts/c420ui"',
    '"${ROOT_DIR}/scripts/canva-linux/project-root.ts"',
    '"${ROOT_DIR}/packages/c420ui/src"',
    '"${ROOT_DIR}/config/canva-linux/actions.json"',
    '"${ROOT_DIR}/config/canva-linux/project-ui.json"',
    "DIRECT_ACTION_FLAGS=()",
    'DIRECT_ACTION_FLAGS+=("${arg}")',
    'run_action_by_cli_flag "${DIRECT_ACTION_FLAGS[0]}"',
    'local entrypoint="${ROOT_DIR}/.build/scripts/run-c420ui-cli.js"',
    '[[ -s "${entrypoint}" ]] || return 1',
  ] as const;

  for (const fragment of requiredLauncherParserFragments) {
    if (!content.includes(fragment)) {
      failures.push(
        `${relativePath}: launcher parser is missing required fragment ${JSON.stringify(fragment)}`,
      );
    }
  }

  const forbiddenLauncherActionFlagFragments = [
    "--install-native | --install-flatpak",
    "--bundle-flatpak | --bundle-appimage",
    "--reset-user-data | --purge",
  ] as const;

  for (const fragment of forbiddenLauncherActionFlagFragments) {
    if (content.includes(fragment)) {
      failures.push(
        `${relativePath}: direct action flags must be resolved by the c420ui CLI bridge, not hardcoded in Bash`,
      );
    }
  }

  const legacyRunCoreCli = "scripts/run-core-entry.sh " + legacyActionRunnerStem + " --cli";
  if (content.includes(legacyRunCoreCli)) {
    failures.push(
      `${relativePath}: direct CLI actions must not route through the legacy Action Runner CLI`,
    );
  }

  if (
    /npm run build:scripts > \/dev\/null[\s\S]{0,1000}run-c420ui-cli\.js/.test(
      content,
    )
  ) {
    failures.push(
      `${relativePath}: direct CLI build errors must remain visible`,
    );
  }

  for (const alias of forbiddenCompatibilityCliAliases) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const aliasPattern = new RegExp(
      `(^|[\\s|,\\[])["']?${escapedAlias}(?=["'\\s|,)\\]])`,
    );
    if (aliasPattern.test(content)) {
      failures.push(
        `${relativePath}: removed compatibility alias ${alias} must not be accepted by the launcher`,
      );
    }
  }
}

function validateRootProviderContracts(
  rootDir: string,
  failures: string[],
): void {
  const c420uiRootProviderPath = "packages/c420ui/src/root-provider.ts";
  const canvaLinuxRootProviderPath =
    "scripts/c420ui-canva-linux/root-provider.ts";
  const c420uiRootProvider = fs.readFileSync(
    path.join(rootDir, c420uiRootProviderPath),
    "utf8",
  );
  const canvaLinuxRootProvider = fs.readFileSync(
    path.join(rootDir, canvaLinuxRootProviderPath),
    "utf8",
  );

  for (const fragment of [
    "c420uiRootProvider",
    "buildActionEnvironment",
    "validateActionScope",
    "resolveRootPolicy",
    "validateRootAccess",
    "c420uiRootPolicyExitCode",
  ] as const) {
    if (!c420uiRootProvider.includes(fragment)) {
      failures.push(
        `${c420uiRootProviderPath}: missing root provider fragment ${fragment}`,
      );
    }
  }

  for (const fragment of [
    "createCanvaLinuxRootProvider",
    "scripts/sudo-common.sh",
    "buildOverviewStatus",
    "CANVA_NATIVE_SCOPE",
    "CANVA_FLATPAK_SCOPE",
  ] as const) {
    if (!canvaLinuxRootProvider.includes(fragment)) {
      failures.push(
        `${canvaLinuxRootProviderPath}: missing root provider fragment ${fragment}`,
      );
    }
  }
}

function validateRemovedCompatibilityAliases(
  rootDir: string,
  failures: string[],
): void {
  const actions = readJsonFile<Array<{ id?: string; cli?: string[] }>>(
    rootDir,
    "config/canva-linux/actions.json",
    failures,
  );
  if (!actions) return;

  for (const action of actions) {
    for (const alias of action.cli ?? []) {
      if (
        (forbiddenCompatibilityCliAliases as readonly string[]).includes(alias)
      ) {
        failures.push(
          `config/canva-linux/actions.json ${action.id ?? "<unknown>"}: removed compatibility alias ${alias} must not be registered`,
        );
      }
    }
  }
}

function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const files = allSourceFiles(rootDir);

  validateRequiredFiles(rootDir, failures);

  for (const file of files) {
    if (file.endsWith(".json")) validateJsonFile(rootDir, file, failures);
    if (file.endsWith(".sh")) validateShellFile(rootDir, file, failures);
    if (file.endsWith(".md"))
      validateCriticalTextShape(rootDir, file, failures);
    if (file.endsWith(".ts"))
      validateReadableSourceShape(rootDir, file, failures);
  }

  for (const file of criticalMultilineFiles) {
    if (!files.includes(file)) continue;
    if (!file.endsWith(".md"))
      validateCriticalTextShape(rootDir, file, failures);
  }

  for (const file of criticalReadableSourceFiles) {
    if (!files.includes(file) || file.endsWith(".ts")) continue;
    validateReadableSourceShape(rootDir, file, failures);
  }

  validateRunCoreEntryScriptShape(rootDir, failures);
  validateToolbarContentSecurityPolicy(rootDir, failures);
  validateNoMaintainedJavaScriptFiles(rootDir, failures);
  validateRetiredC420UIProcessRunner(rootDir, failures);
  validateProjectValidationScriptShape(rootDir, failures);
  validateLauncherScriptShape(rootDir, failures);
  validateRemovedCompatibilityAliases(rootDir, failures);
  validateRootProviderContracts(rootDir, failures);
  validatePackageLockConsistency(rootDir, failures);
  validatePackageScripts(rootDir, failures);
  checkNoLegacyActionRunner(rootDir, failures);

  if (failures.length) {
    console.error("[source-integrity] FAILED:");
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log("[repository-policy] source integrity OK");
  return 0;
}

  return { main };
})();

const checkReviewChecklistContract = (() => {
const requiredFragments = [
  "# Review Checklist",
  "## Logging review checklist",
  "removes circular-object handling",
  "removes BigInt handling",
  "allows logging to throw from the main process",
  "## Changelog-backed regression review",
  "removes behavior documented in `CHANGELOG.md`",
];

function main(): number {
  const rootDir = findProjectRoot();
  const review = fs.readFileSync(path.join(rootDir, "REVIEW.md"), "utf8");
  for (const fragment of requiredFragments) {
    if (!review.includes(fragment))
      throw new Error(
        `REVIEW.md is missing required checklist content: ${fragment}`,
      );
  }
  if (review.indexOf("# Review Checklist") > 0)
    throw new Error("REVIEW.md must start with the Review Checklist");
  console.log("[repository-policy] review checklist OK");
  return 0;
}

  return { main };
})();

function checkTypeScriptWrappers(failures: string[]): void {
  runCheck(failures, { name: "TypeScript wrapper contract", run: checkTypeScriptWrappersContract.main });
}

function checkTypeScriptFirst(failures: string[]): void {
  runCheck(failures, { name: "TypeScript-first policy", run: checkTypeScriptFirstContract.main });
}

function checkGitignorePolicy(failures: string[]): void {
  runCheck(failures, { name: "gitignore policy", run: checkGitignorePolicyContract.main });
}

function checkNoSourceJavaScript(failures: string[]): void {
  runCheck(failures, { name: "no source JavaScript", run: checkNoSourceJavaScriptContract.main });
}

function checkSourceIntegrity(failures: string[]): void {
  runCheck(failures, { name: "source integrity", run: checkSourceIntegrityContract.main });
}

function checkReviewChecklist(failures: string[]): void {
  runCheck(failures, { name: "review checklist", run: checkReviewChecklistContract.main });
}

export function main(): number {
  const failures: string[] = [];

  checkTypeScriptWrappers(failures);
  checkTypeScriptFirst(failures);
  checkGitignorePolicy(failures);
  checkNoSourceJavaScript(failures);
  checkSourceIntegrity(failures);
  checkReviewChecklist(failures);

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[repository-policy] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[repository-policy] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
