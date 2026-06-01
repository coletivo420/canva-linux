#!/usr/bin/env node

// build-resources/c420ui/scripts/c420ui-builder.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import fs4 from "node:fs";
import path4 from "node:path";

// build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
var UNKNOWN_BASE_VERSION = "0.0.0";
var UNKNOWN_BUILD_REVISION = "unknown";
function loadBuildMetadataModule(rootDir) {
  const requireFromRoot = createRequire(path.join(rootDir, "package.json"));
  const compiledModule = path.join(rootDir, ".build/electron/main/build-metadata.js");
  if (!fs.existsSync(compiledModule)) return null;
  try {
    return requireFromRoot(compiledModule);
  } catch {
    return null;
  }
}
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir) {
  return fs.existsSync(path.join(rootDir, ".git"));
}
function resolveEnvBuildRevision() {
  for (const key of [
    "CANVA_LINUX_BUILD_REVISION",
    "GITHUB_SHA",
    "CI_COMMIT_SHA",
    "SOURCE_COMMIT"
  ]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}
function resolveGitBuildRevision(rootDir) {
  if (!hasGitRepository(rootDir)) return null;
  try {
    const value = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return value || null;
  } catch {
    return null;
  }
}
function createSourceMetadata(rootDir, buildRevision, metadataModule) {
  const packageJson = readJsonFile(path.join(rootDir, "package.json"));
  const projectUi = readJsonFile(
    path.join(rootDir, "build-resources", "canva-linux", "config", "project-ui.json")
  );
  if (!packageJson?.version || !projectUi?.displayVersion || !projectUi?.phase) {
    return null;
  }
  return metadataModule.createBuildMetadata({
    baseVersion: packageJson.version,
    baseDisplayVersion: projectUi.displayVersion,
    basePhase: projectUi.phase,
    buildRevision
  });
}
function loadPackagedMetadata(rootDir, metadataModule) {
  const metadata = readJsonFile(
    path.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function loadEffectiveFileMetadata(rootDir, metadataModule) {
  const metadata = readJsonFile(
    path.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function fallbackEffectiveBuildMetadata(rootDir = process.cwd(), metadataModule) {
  const module = metadataModule ?? loadBuildMetadataModule(path.resolve(rootDir));
  if (!module) {
    return {
      baseVersion: UNKNOWN_BASE_VERSION,
      baseDisplayVersion: UNKNOWN_BASE_VERSION,
      basePhase: UNKNOWN_BASE_VERSION,
      buildRevision: UNKNOWN_BUILD_REVISION,
      canvaLinuxSourceHash: "unknown",
      c420uiSourceHash: "unknown",
      combinedSourceHash: "unknown",
      version: UNKNOWN_BASE_VERSION,
      displayVersion: UNKNOWN_BASE_VERSION,
      phase: UNKNOWN_BASE_VERSION,
      fullVersion: UNKNOWN_BASE_VERSION
    };
  }
  return module.createBuildMetadata({
    baseVersion: UNKNOWN_BASE_VERSION,
    baseDisplayVersion: UNKNOWN_BASE_VERSION,
    basePhase: UNKNOWN_BASE_VERSION,
    buildRevision: UNKNOWN_BUILD_REVISION
  });
}
function loadEffectiveBuildMetadata(rootDir) {
  const resolvedRootDir = path.resolve(rootDir);
  const metadataModule = loadBuildMetadataModule(resolvedRootDir);
  if (!metadataModule) {
    const effective2 = readJsonFile(
      path.join(resolvedRootDir, ".build", "canva-linux", "build-metadata.effective.json")
    );
    if (effective2) return effective2;
    const packaged = readJsonFile(
      path.join(resolvedRootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
    );
    return packaged ?? fallbackEffectiveBuildMetadata(resolvedRootDir);
  }
  const effective = loadEffectiveFileMetadata(resolvedRootDir, metadataModule);
  if (effective) return effective;
  const envRevision = resolveEnvBuildRevision();
  if (envRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, envRevision, metadataModule);
    if (sourceMetadata) return sourceMetadata;
  }
  const gitRevision = resolveGitBuildRevision(resolvedRootDir);
  if (gitRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, gitRevision, metadataModule);
    if (sourceMetadata) return sourceMetadata;
  }
  return loadPackagedMetadata(resolvedRootDir, metadataModule) ?? fallbackEffectiveBuildMetadata(resolvedRootDir, metadataModule);
}

// build-resources/c420ui/bootstrap/ensure-bootstrap.ts
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";

// build-resources/canva-linux/source-hash.ts
import crypto from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
var SOURCE_HASH_ALGORITHM = "sha256";
var DEFAULT_IGNORED_PATH_PARTS = /* @__PURE__ */ new Set([
  ".git",
  ".build",
  "dist",
  "node_modules"
]);
function normalizeRelativePath(relativePath) {
  return relativePath.split(path2.sep).join(path2.posix.sep);
}
function shouldIgnore(relativePath, ignoredRelativePaths) {
  const normalized = normalizeRelativePath(relativePath);
  for (const ignoredPath of ignoredRelativePaths) {
    if (normalized === ignoredPath || normalized.startsWith(`${ignoredPath}/`)) {
      return true;
    }
  }
  return normalized.split(path2.posix.sep).some((part) => DEFAULT_IGNORED_PATH_PARTS.has(part));
}
function collectFiles(rootDir, relativeInput, ignoredRelativePaths) {
  if (shouldIgnore(relativeInput, ignoredRelativePaths)) return [];
  const absoluteInput = path2.join(rootDir, relativeInput);
  if (!fs2.existsSync(absoluteInput)) return [];
  const stats = fs2.statSync(absoluteInput);
  if (stats.isFile()) return [normalizeRelativePath(relativeInput)];
  if (!stats.isDirectory()) return [];
  const files = [];
  const walk = (relativeDirectory) => {
    const entries = fs2.readdirSync(path2.join(rootDir, relativeDirectory), { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = normalizeRelativePath(path2.join(relativeDirectory, entry.name));
      if (shouldIgnore(relativePath, ignoredRelativePaths)) continue;
      if (entry.isDirectory()) {
        walk(relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };
  walk(relativeInput);
  return files;
}
function collectSourceHashFiles(rootDir, inputs, ignores = []) {
  const ignoredRelativePaths = new Set(ignores.map((value) => normalizeRelativePath(value)));
  return [...new Set(inputs.flatMap((input) => collectFiles(rootDir, input, ignoredRelativePaths)))].sort((left, right) => left.localeCompare(right));
}
function calculateSourceHash(rootDir, inputs, ignores = []) {
  const hash = crypto.createHash(SOURCE_HASH_ALGORITHM);
  for (const relativePath of collectSourceHashFiles(rootDir, inputs, ignores)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs2.readFileSync(path2.join(rootDir, relativePath)));
    hash.update("\0");
  }
  return `${SOURCE_HASH_ALGORITHM}:${hash.digest("hex")}`;
}

// build-resources/c420ui/bootstrap/source-hash.ts
var C420UI_SOURCE_HASH_INPUTS = [
  "build-resources/c420ui/src",
  "build-resources/c420ui/scripts",
  "build-resources/c420ui/host",
  "build-resources/c420ui/operations",
  "build-resources/c420ui/checks",
  "build-resources/c420ui/bootstrap",
  "build-resources/c420ui/types",
  "build-resources/c420ui/package.json"
];
var C420UI_SOURCE_HASH_IGNORES = [
  "build-resources/c420ui/bootstrap/generated"
];
function calculateC420UISourceHash(rootDir, inputs = C420UI_SOURCE_HASH_INPUTS) {
  return calculateSourceHash(rootDir, inputs, C420UI_SOURCE_HASH_IGNORES);
}

// build-resources/c420ui/checks/bootstrap-check-helpers.ts
var C420UI_BOOTSTRAP_ARTIFACT_FILES = [
  "run-c420ui.mjs",
  "run-c420ui-cli.mjs",
  "c420ui-builder.mjs"
];
function c420uiBootstrapArtifactPath(artifact) {
  return `build-resources/c420ui/bootstrap/generated/${artifact}`;
}
var C420UI_BOOTSTRAP_MANIFEST_PATH = "build-resources/c420ui/bootstrap/generated/manifest.json";

// build-resources/c420ui/bootstrap/ensure-bootstrap.ts
var DEFAULT_DEPS = {
  calculateSourceHash: calculateC420UISourceHash,
  spawn: spawnSync
};
function readJson(absolutePath) {
  try {
    return JSON.parse(fs3.readFileSync(absolutePath, "utf8"));
  } catch {
    return null;
  }
}
function summarizeCommandFailure(result) {
  const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`.trim();
  if (result.error) return result.error.message;
  return output.split("\n").find((line) => line.trim().length > 0)?.trim() || `exit status ${result.status}`;
}
function resolveBootstrapBuildRoot(startDir) {
  let current = startDir;
  while (true) {
    const pkgPath = path3.join(current, "package.json");
    if (fs3.existsSync(pkgPath)) {
      const scripts = readJson(pkgPath)?.scripts;
      if (scripts?.["build:c420ui-bootstrap"]) return current;
    }
    const parent = path3.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}
function validateNodeCheck(rootDir, relativePath, deps) {
  const result = deps.spawn(process.execPath, ["--check", path3.join(rootDir, relativePath)], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false
  });
  if (result.error && typeof result.error === "object" && "code" in result.error && result.error.code === "EPERM" && result.status === 0) {
    return null;
  }
  if (result.status !== 0) {
    return `${relativePath} failed node --check (${summarizeCommandFailure(result)})`;
  }
  return null;
}
function calculateFileHash(filePath) {
  return `sha256:${createHash("sha256").update(fs3.readFileSync(filePath)).digest("hex")}`;
}
function getC420UIBootstrapStatusWithDeps(rootDir, deps) {
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const absolutePath = path3.join(rootDir, relativePath);
    if (!fs3.existsSync(absolutePath)) {
      return { state: "missing", reason: `${relativePath} is missing` };
    }
    let stats;
    try {
      stats = fs3.statSync(absolutePath);
    } catch (error) {
      return {
        state: "invalid",
        reason: `Failed to stat ${relativePath}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    if (!stats.isFile() || stats.size <= 0) {
      return { state: "missing", reason: `${relativePath} is empty` };
    }
  }
  const manifestPath = path3.join(rootDir, C420UI_BOOTSTRAP_MANIFEST_PATH);
  const manifest = readJson(manifestPath);
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      state: "missing",
      reason: `${C420UI_BOOTSTRAP_MANIFEST_PATH} is missing or invalid`
    };
  }
  const expectedSourceHash = deps.calculateSourceHash(rootDir);
  if (manifest.c420uiSourceHash !== expectedSourceHash) {
    return {
      state: "stale",
      reason: "c420uiSourceHash differs from current source tree"
    };
  }
  const artifactHashes = manifest.artifactHashes;
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    return {
      state: "invalid",
      reason: `${C420UI_BOOTSTRAP_MANIFEST_PATH} is missing artifactHashes`
    };
  }
  const manifestArtifactHashes = artifactHashes;
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const expectedHash = manifestArtifactHashes[artifact];
    if (typeof expectedHash !== "string") {
      return {
        state: "invalid",
        reason: `${C420UI_BOOTSTRAP_MANIFEST_PATH} has invalid artifactHashes.${artifact}`
      };
    }
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const actualHash = calculateFileHash(path3.join(rootDir, relativePath));
    if (actualHash !== expectedHash) {
      return {
        state: "stale",
        reason: `${relativePath} hash differs from ${C420UI_BOOTSTRAP_MANIFEST_PATH}`
      };
    }
  }
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const nodeCheckFailure = validateNodeCheck(rootDir, relativePath, deps);
    if (nodeCheckFailure) {
      return { state: "invalid", reason: nodeCheckFailure };
    }
  }
  return { state: "valid" };
}
function ensureC420UIBootstrapWithDeps(rootDir, deps) {
  const status = getC420UIBootstrapStatusWithDeps(rootDir, deps);
  if (status.state === "valid") return;
  const bootstrapBuildRoot = resolveBootstrapBuildRoot(rootDir);
  console.error(`[c420ui] bootstrap ${status.state}: ${status.reason}`);
  console.error("[c420ui] generating bootstrap bundle automatically...");
  const result = deps.spawn("npm", ["run", "build:c420ui-bootstrap"], {
    cwd: bootstrapBuildRoot,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    const details = result.error?.message || `exit status ${result.status ?? "unknown"}`;
    throw new Error(
      `Unable to generate c420ui bootstrap bundle automatically. ${details}`
    );
  }
  const nextStatus = getC420UIBootstrapStatusWithDeps(rootDir, deps);
  if (nextStatus.state !== "valid") {
    throw new Error(
      `Generated c420ui bootstrap bundle is still invalid: ${nextStatus.reason}`
    );
  }
}
function ensureC420UIBootstrap(rootDir) {
  ensureC420UIBootstrapWithDeps(rootDir, DEFAULT_DEPS);
}

// build-resources/c420ui/scripts/c420ui-builder.ts
var BUILDER_INTERNAL_NAME = "c420ui-builder";
var BUILDER_ALIAS = "canva-linux-c420ui-builder";
var BUILDER_TITLE = "Canva Linux Builder powered by c420ui";
var BUILDER_GLOBAL_FLAGS = /* @__PURE__ */ new Set(["-y", "--yes", "--dry-run"]);
var RUNTIME_ONLY_VALUED_OPTIONS = [
  "--canva-debug",
  "--credential-store",
  "--gpu-backend"
];
var RUNTIME_ONLY_BOOLEAN_OPTIONS = [
  "--force-x11",
  "--force-wayland",
  "--disable-wayland-color-manager"
];
var ROOT_LAUNCH_GUARD_MESSAGE = `Do not run ${BUILDER_TITLE} with sudo or as root.

Run this builder as your regular user. When an operation needs administrator privileges, Canva Linux asks for authentication only for that specific action.

Running the whole builder as root may break file ownership, user sessions, build artifacts and desktop integration.`;
function defaultRootSearchDir() {
  if (process.env.CANVA_SCRIPT_REPO_ROOT) return process.env.CANVA_SCRIPT_REPO_ROOT;
  const scriptPath = process.argv[1];
  if (scriptPath) return path4.dirname(path4.resolve(scriptPath));
  return process.cwd();
}
function findProjectRoot(startDir = defaultRootSearchDir()) {
  let current = path4.resolve(startDir);
  while (true) {
    if (fs4.existsSync(path4.join(current, "package.json"))) {
      const scripts = readJsonFile2(
        path4.join(current, "package.json")
      )?.scripts;
      if (scripts?.["build:c420ui-bootstrap"]) return current;
    }
    const parent = path4.dirname(current);
    if (parent === current) throw new Error("Unable to locate Canva Linux project root.");
    current = parent;
  }
}
function readJsonFile2(filePath) {
  try {
    return JSON.parse(fs4.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function c420uiVersion(rootDir) {
  return readJsonFile2(
    path4.join(rootDir, "build-resources", "c420ui", "package.json")
  )?.version ?? "unknown";
}
function builderVersionBlock(rootDir) {
  const metadata = loadEffectiveBuildMetadata(rootDir);
  return `Project:
  Canva Linux ${metadata.fullVersion || metadata.version || metadata.baseVersion}
  buildRevision ${metadata.buildRevision || "unknown"}

Builder:
  c420ui ${c420uiVersion(rootDir)}`;
}
function builderHelp(rootDir = findProjectRoot()) {
  return `${BUILDER_TITLE}

${builderVersionBlock(rootDir)}

Usage:
  ${BUILDER_ALIAS}
  ${BUILDER_ALIAS} [direct action] [--yes] [--dry-run]

This builder opens the c420ui install and development workspace by default.
It builds, installs, validates, packages, repairs and maintains Canva Linux.

The compiled Canva Linux runtime app is separate:
  canva-linux --help

Builder options:
  -y, --yes
  --force                       Alias for --yes
  -h, --help
  --dry-run

Direct actions:
  Any action flag starting with -- is delegated to the c420ui CLI bridge.
  The c420ui Action Registry decides whether an action is concrete, planned, or invalid.

Runtime options belong to the compiled Canva Linux app:
  canva-linux --help`;
}
function sessionLogPath() {
  if (process.env.CANVA_TOOL_SESSION_LOG) return process.env.CANVA_TOOL_SESSION_LOG;
  const stateHome = process.env.XDG_STATE_HOME || path4.join(process.env.HOME || "/tmp", ".local", "state");
  return path4.join(stateHome, "canva-linux", "tool-session.log");
}
function createSession(rootDir) {
  const sessionId = process.env.CANVA_TOOL_SESSION_ID || `builder-${process.pid}-${Date.now()}`;
  let sessionLog = sessionLogPath();
  try {
    fs4.mkdirSync(path4.dirname(sessionLog), { recursive: true });
    fs4.writeFileSync(sessionLog, "");
    fs4.appendFileSync(sessionLog, `[session] started id=${sessionId}
`);
    fs4.appendFileSync(sessionLog, `[builder] ${BUILDER_TITLE}
`);
    fs4.appendFileSync(sessionLog, `${builderVersionBlock(rootDir)}
`);
  } catch {
    sessionLog = void 0;
  }
  return {
    sessionLog,
    sessionId,
    env: {
      ...process.env,
      CANVA_SCRIPT_REPO_ROOT: rootDir,
      CANVA_TOOL_SESSION_ID: sessionId,
      ...sessionLog ? { CANVA_TOOL_SESSION_LOG: sessionLog } : {}
    }
  };
}
function selectEntrypoint(rootDir, kind) {
  const candidates = kind === "ui" ? [
    path4.join(rootDir, "build-resources/c420ui/bootstrap/generated/run-c420ui.mjs"),
    path4.join(rootDir, ".build/scripts/run-c420ui.mjs")
  ] : [
    path4.join(rootDir, "build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs"),
    path4.join(rootDir, ".build/scripts/run-c420ui-cli.mjs")
  ];
  for (const candidate of candidates) {
    if (fs4.existsSync(candidate) && fs4.statSync(candidate).size > 0) return candidate;
  }
  throw new Error(
    kind === "ui" ? "c420ui UI bootstrap entrypoint is unavailable after automatic bootstrap generation." : "c420ui CLI bootstrap entrypoint is unavailable after automatic bootstrap generation."
  );
}
function isReservedDebugFlag(arg) {
  return arg === "--debug" || arg.startsWith("--debug=");
}
function isRuntimeOnlyFlag(arg) {
  return RUNTIME_ONLY_BOOLEAN_OPTIONS.includes(arg) || RUNTIME_ONLY_VALUED_OPTIONS.some(
    (option) => arg === option || arg.startsWith(`${option}=`)
  );
}
function normalizeBuilderArgs(argv) {
  const bridgeArgs = [];
  let help = false;
  let hasBridgeAction = false;
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (isReservedDebugFlag(arg)) {
      throw new Error("--debug is reserved by Electron/Node. Use canva-linux --canva-debug=1 or --canva-debug=2.");
    }
    if (isRuntimeOnlyFlag(arg)) {
      throw new Error(`${arg} is a Canva Linux runtime option. Use canva-linux --help.`);
    }
    if (arg === "--force") {
      bridgeArgs.push("--yes");
      continue;
    }
    if (BUILDER_GLOBAL_FLAGS.has(arg)) {
      bridgeArgs.push(arg);
      continue;
    }
    if (arg.startsWith("--")) {
      hasBridgeAction = true;
      bridgeArgs.push(arg);
      continue;
    }
    throw new Error(`Unsupported builder argument: ${arg}`);
  }
  return { help, bridgeArgs, hasBridgeAction };
}
function assertNonRoot() {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error(ROOT_LAUNCH_GUARD_MESSAGE);
  }
}
function runC420UIBuilder(argv = process.argv.slice(2)) {
  const parsed = normalizeBuilderArgs(argv);
  const rootDir = findProjectRoot();
  if (parsed.help) {
    console.log(builderHelp(rootDir));
    return 0;
  }
  if (!parsed.hasBridgeAction && parsed.bridgeArgs.length > 0) {
    throw new Error("No direct action was provided.");
  }
  assertNonRoot();
  ensureC420UIBootstrap(rootDir);
  const session = createSession(rootDir);
  const kind = parsed.hasBridgeAction ? "cli" : "ui";
  const entrypoint = selectEntrypoint(rootDir, kind);
  const result = spawnSync2(process.execPath, [entrypoint, ...parsed.bridgeArgs], {
    cwd: rootDir,
    env: session.env,
    stdio: "inherit",
    shell: false
  });
  if (session.sessionLog) fs4.appendFileSync(session.sessionLog, "[session] ended\n");
  if (result.error) throw result.error;
  return result.status ?? 1;
}
if (/c420ui-builder\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  try {
    process.exit(runC420UIBuilder());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
export {
  BUILDER_ALIAS,
  BUILDER_INTERNAL_NAME,
  BUILDER_TITLE,
  normalizeBuilderArgs,
  runC420UIBuilder
};
