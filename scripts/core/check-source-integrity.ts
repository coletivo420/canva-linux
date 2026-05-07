import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findProjectRoot } from "./action-registry";

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
  "scripts/core/check-no-source-javascript.ts",
  "scripts/core/check-typescript-first.ts",
  "scripts/core/check-source-integrity.ts",
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

const skippedDirectories = new Set([
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

function toRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/g, "/");
}

function collectFiles(
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
    )
      return;
    throw error;
  }

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRelative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      if (
        skippedDirectories.has(relativePath) ||
        skippedDirectories.has(entry.name)
      )
        continue;
      collectFiles(rootDir, absolutePath, output);
      continue;
    }

    if (entry.isFile()) output.push(relativePath);
  }
}

function allSourceFiles(rootDir: string): string[] {
  const files: string[] = [];
  collectFiles(rootDir, rootDir, files);
  return files.sort((left, right) => left.localeCompare(right));
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
    if (/(?:^|\s)(?:node\s+)?scripts\/[^\s]+\.js\b/.test(command))
      failures.push(
        `package.json scripts.${scriptName}: must not call maintained scripts/*.js source`,
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
    'run_step "npm run check:legacy-tooling" npm run check:legacy-tooling',
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
        `${relativePath}: split validation steps must stay in c420ui, Canva Linux, shared, legacy order`,
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

  if (
    !lines.some((line) =>
      line
        .trim()
        .startsWith(
          'read -r -p "This action requires confirmation. Continue? [y/N] "',
        ),
    )
  ) {
    failures.push(
      `${relativePath}: confirmation prompt must remain inside the read command, not as collapsed shell text`,
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

function validateRemovedCompatibilityAliases(
  rootDir: string,
  failures: string[],
): void {
  const actions = readJsonFile<Array<{ id?: string; cli?: string[] }>>(
    rootDir,
    "scripts/actions.json",
    failures,
  );
  if (!actions) return;

  for (const action of actions) {
    for (const alias of action.cli ?? []) {
      if (
        (forbiddenCompatibilityCliAliases as readonly string[]).includes(alias)
      ) {
        failures.push(
          `scripts/actions.json ${action.id ?? "<unknown>"}: removed compatibility alias ${alias} must not be registered`,
        );
      }
    }
  }
}

export function main(): number {
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
  validateProjectValidationScriptShape(rootDir, failures);
  validateLauncherScriptShape(rootDir, failures);
  validateRemovedCompatibilityAliases(rootDir, failures);
  validatePackageLockConsistency(rootDir, failures);
  validatePackageScripts(rootDir, failures);

  if (failures.length) {
    console.error("[source-integrity] FAILED:");
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log("[source-integrity] OK");
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[source-integrity] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
