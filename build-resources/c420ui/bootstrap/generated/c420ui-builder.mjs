#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// build-resources/c420ui/scripts/c420ui-builder.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import fs5 from "node:fs";
import path5 from "node:path";

// build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts
import { execFileSync } from "node:child_process";
import fs2 from "node:fs";
import path2 from "node:path";

// build-resources/electron/main/build-metadata.ts
var build_metadata_exports = {};
__export(build_metadata_exports, {
  appendBuildRevision: () => appendBuildRevision,
  createBuildMetadata: () => createBuildMetadata,
  fallbackBaseMetadata: () => fallbackBaseMetadata,
  formatCanvaLinuxVersion: () => formatCanvaLinuxVersion,
  loadCanvaLinuxBuildMetadata: () => loadCanvaLinuxBuildMetadata,
  normalizeBuildRevision: () => normalizeBuildRevision,
  normalizeLoadedBuildMetadata: () => normalizeLoadedBuildMetadata
});
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
var UNKNOWN_BASE_VERSION = "0.0.0";
var UNKNOWN_DISPLAY_VERSION = "0.0.0";
var UNKNOWN_BUILD_REVISION = "unknown";
var UNKNOWN_SOURCE_HASH = "unknown";
var RUNTIME_DIR = path.dirname(fileURLToPath(import.meta.url));
function combineSourceHashes(canvaLinuxHash, c420uiHash) {
  const left = canvaLinuxHash || UNKNOWN_SOURCE_HASH;
  const right = c420uiHash || UNKNOWN_SOURCE_HASH;
  const hash = crypto.createHash("sha256");
  hash.update("canva-linux");
  hash.update("\0");
  hash.update(left);
  hash.update("\0");
  hash.update("c420ui");
  hash.update("\0");
  hash.update(right);
  return `sha256:${hash.digest("hex")}`;
}
function normalizeBuildRevision(input) {
  if (!input) return "unknown";
  const trimmed = input.trim();
  if (!trimmed || trimmed === "unknown") return "unknown";
  const withoutPrefix = trimmed.replace(/^g/i, "");
  const shortHash = withoutPrefix.slice(0, 7);
  return `g${shortHash}`;
}
function appendBuildRevision(base, buildRevision) {
  return buildRevision && buildRevision !== "unknown" ? `${base}+${buildRevision}` : base;
}
function createBuildMetadata(input) {
  const buildRevision = normalizeBuildRevision(input.buildRevision);
  const canvaLinuxSourceHash = input.canvaLinuxSourceHash || UNKNOWN_SOURCE_HASH;
  const c420uiSourceHash = input.c420uiSourceHash || UNKNOWN_SOURCE_HASH;
  return {
    baseVersion: input.baseVersion,
    baseDisplayVersion: input.baseDisplayVersion,
    basePhase: input.basePhase,
    buildRevision,
    canvaLinuxSourceHash,
    c420uiSourceHash,
    combinedSourceHash: input.combinedSourceHash || combineSourceHashes(canvaLinuxSourceHash, c420uiSourceHash),
    version: appendBuildRevision(input.baseVersion, buildRevision),
    displayVersion: appendBuildRevision(input.baseDisplayVersion, buildRevision),
    phase: appendBuildRevision(input.basePhase, buildRevision),
    fullVersion: appendBuildRevision(input.basePhase, buildRevision)
  };
}
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function candidateMetadataPaths() {
  const cwd = process.cwd();
  return [
    path.join(cwd, ".build", "canva-linux", "build-metadata.effective.json"),
    path.join(cwd, "build-resources", "canva-linux", "config", "build-metadata.json"),
    path.join(RUNTIME_DIR, "..", "..", ".build", "canva-linux", "build-metadata.effective.json"),
    path.join(RUNTIME_DIR, "..", "..", "build-resources", "canva-linux", "config", "build-metadata.json"),
    path.join(RUNTIME_DIR, "..", ".build", "canva-linux", "build-metadata.effective.json"),
    path.join(RUNTIME_DIR, "..", "build-resources", "canva-linux", "config", "build-metadata.json")
  ];
}
function fallbackBaseMetadata() {
  const packageJson = readJsonFile(path.join(process.cwd(), "package.json")) ?? {};
  const projectUi = readJsonFile(
    path.join(
      process.cwd(),
      "build-resources",
      "canva-linux",
      "config",
      "project-ui.json"
    )
  ) ?? {};
  const baseVersion = packageJson.version || UNKNOWN_BASE_VERSION;
  const baseDisplayVersion = projectUi.displayVersion || UNKNOWN_DISPLAY_VERSION;
  const basePhase = projectUi.phase || baseVersion;
  return createBuildMetadata({
    baseVersion,
    baseDisplayVersion,
    basePhase,
    buildRevision: UNKNOWN_BUILD_REVISION,
    canvaLinuxSourceHash: UNKNOWN_SOURCE_HASH,
    c420uiSourceHash: UNKNOWN_SOURCE_HASH,
    combinedSourceHash: UNKNOWN_SOURCE_HASH
  });
}
function normalizeLoadedBuildMetadata(metadata) {
  if (!metadata.baseVersion || !metadata.baseDisplayVersion || !metadata.basePhase) {
    return null;
  }
  return createBuildMetadata({
    baseVersion: metadata.baseVersion,
    baseDisplayVersion: metadata.baseDisplayVersion,
    basePhase: metadata.basePhase,
    buildRevision: metadata.buildRevision || UNKNOWN_BUILD_REVISION,
    canvaLinuxSourceHash: metadata.canvaLinuxSourceHash || UNKNOWN_SOURCE_HASH,
    c420uiSourceHash: metadata.c420uiSourceHash || UNKNOWN_SOURCE_HASH,
    combinedSourceHash: metadata.combinedSourceHash || UNKNOWN_SOURCE_HASH
  });
}
function loadCanvaLinuxBuildMetadata() {
  for (const filePath of candidateMetadataPaths()) {
    const metadata = readJsonFile(filePath);
    const normalized = metadata ? normalizeLoadedBuildMetadata(metadata) : null;
    if (normalized) return normalized;
  }
  return fallbackBaseMetadata();
}
function formatCanvaLinuxVersion(metadata) {
  return `Canva Linux ${metadata.version}`;
}

// build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts
var UNKNOWN_BASE_VERSION2 = "0.0.0";
var UNKNOWN_BUILD_REVISION2 = "unknown";
function readJsonFile2(filePath) {
  try {
    return JSON.parse(fs2.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir) {
  return fs2.existsSync(path2.join(rootDir, ".git"));
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
  const packageJson = readJsonFile2(path2.join(rootDir, "package.json"));
  const projectUi = readJsonFile2(
    path2.join(rootDir, "build-resources", "canva-linux", "config", "project-ui.json")
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
  const metadata = readJsonFile2(
    path2.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function loadEffectiveFileMetadata(rootDir, metadataModule) {
  const metadata = readJsonFile2(
    path2.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function fallbackEffectiveBuildMetadata(rootDir = process.cwd(), metadataModule) {
  const module = metadataModule ?? build_metadata_exports;
  return module.createBuildMetadata({
    baseVersion: UNKNOWN_BASE_VERSION2,
    baseDisplayVersion: UNKNOWN_BASE_VERSION2,
    basePhase: UNKNOWN_BASE_VERSION2,
    buildRevision: UNKNOWN_BUILD_REVISION2
  });
}
function loadEffectiveBuildMetadata(rootDir) {
  const resolvedRootDir = path2.resolve(rootDir);
  const metadataModule = build_metadata_exports;
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
import fs4 from "node:fs";
import path4 from "node:path";

// build-resources/canva-linux/source-hash.ts
import crypto2 from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
var SOURCE_HASH_ALGORITHM = "sha256";
var DEFAULT_IGNORED_PATH_PARTS = /* @__PURE__ */ new Set([
  ".git",
  ".build",
  "dist",
  "node_modules"
]);
function normalizeRelativePath(relativePath) {
  return relativePath.split(path3.sep).join(path3.posix.sep);
}
function shouldIgnore(relativePath, ignoredRelativePaths) {
  const normalized = normalizeRelativePath(relativePath);
  for (const ignoredPath of ignoredRelativePaths) {
    if (normalized === ignoredPath || normalized.startsWith(`${ignoredPath}/`)) {
      return true;
    }
  }
  return normalized.split(path3.posix.sep).some((part) => DEFAULT_IGNORED_PATH_PARTS.has(part));
}
function collectFiles(rootDir, relativeInput, ignoredRelativePaths) {
  if (shouldIgnore(relativeInput, ignoredRelativePaths)) return [];
  const absoluteInput = path3.join(rootDir, relativeInput);
  if (!fs3.existsSync(absoluteInput)) return [];
  const stats = fs3.statSync(absoluteInput);
  if (stats.isFile()) return [normalizeRelativePath(relativeInput)];
  if (!stats.isDirectory()) return [];
  const files = [];
  const walk = (relativeDirectory) => {
    const entries = fs3.readdirSync(path3.join(rootDir, relativeDirectory), { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = normalizeRelativePath(path3.join(relativeDirectory, entry.name));
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
  const hash = crypto2.createHash(SOURCE_HASH_ALGORITHM);
  for (const relativePath of collectSourceHashFiles(rootDir, inputs, ignores)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs3.readFileSync(path3.join(rootDir, relativePath)));
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
    return JSON.parse(fs4.readFileSync(absolutePath, "utf8"));
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
    const pkgPath = path4.join(current, "package.json");
    if (fs4.existsSync(pkgPath)) {
      const scripts = readJson(pkgPath)?.scripts;
      if (scripts?.["build:c420ui-bootstrap"]) return current;
    }
    const parent = path4.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}
function validateNodeCheck(rootDir, relativePath, deps) {
  const result = deps.spawn(process.execPath, ["--check", path4.join(rootDir, relativePath)], {
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
  return `sha256:${createHash("sha256").update(fs4.readFileSync(filePath)).digest("hex")}`;
}
function getC420UIBootstrapStatusWithDeps(rootDir, deps) {
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const absolutePath = path4.join(rootDir, relativePath);
    if (!fs4.existsSync(absolutePath)) {
      return { state: "missing", reason: `${relativePath} is missing` };
    }
    let stats;
    try {
      stats = fs4.statSync(absolutePath);
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
  const manifestPath = path4.join(rootDir, C420UI_BOOTSTRAP_MANIFEST_PATH);
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
    const actualHash = calculateFileHash(path4.join(rootDir, relativePath));
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
  if (scriptPath) return path5.dirname(path5.resolve(scriptPath));
  return process.cwd();
}
function findProjectRoot(startDir = defaultRootSearchDir()) {
  let current = path5.resolve(startDir);
  while (true) {
    if (fs5.existsSync(path5.join(current, "package.json"))) {
      const scripts = readJsonFile3(
        path5.join(current, "package.json")
      )?.scripts;
      if (scripts?.["build:c420ui-bootstrap"]) return current;
    }
    const parent = path5.dirname(current);
    if (parent === current) throw new Error("Unable to locate Canva Linux project root.");
    current = parent;
  }
}
function readJsonFile3(filePath) {
  try {
    return JSON.parse(fs5.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function c420uiVersion(rootDir) {
  return readJsonFile3(
    path5.join(rootDir, "build-resources", "c420ui", "package.json")
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
  const stateHome = process.env.XDG_STATE_HOME || path5.join(process.env.HOME || "/tmp", ".local", "state");
  return path5.join(stateHome, "canva-linux", "tool-session.log");
}
function createSession(rootDir) {
  const sessionId = process.env.CANVA_TOOL_SESSION_ID || `builder-${process.pid}-${Date.now()}`;
  let sessionLog = sessionLogPath();
  try {
    fs5.mkdirSync(path5.dirname(sessionLog), { recursive: true });
    fs5.writeFileSync(sessionLog, "");
    fs5.appendFileSync(sessionLog, `[session] started id=${sessionId}
`);
    fs5.appendFileSync(sessionLog, `[builder] ${BUILDER_TITLE}
`);
    fs5.appendFileSync(sessionLog, `${builderVersionBlock(rootDir)}
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
    path5.join(rootDir, "build-resources/c420ui/bootstrap/generated/run-c420ui.mjs"),
    path5.join(rootDir, ".build/scripts/run-c420ui.mjs")
  ] : [
    path5.join(rootDir, "build-resources/c420ui/bootstrap/generated/run-c420ui-cli.mjs"),
    path5.join(rootDir, ".build/scripts/run-c420ui-cli.mjs")
  ];
  for (const candidate of candidates) {
    if (fs5.existsSync(candidate) && fs5.statSync(candidate).size > 0) return candidate;
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
  if (session.sessionLog) fs5.appendFileSync(session.sessionLog, "[session] ended\n");
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
