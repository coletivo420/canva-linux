#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// build-resources/c420ui/src/scopes.ts
var c420uiKnownActionScopes = ["user", "system", "auto"];
function normalizeC420UIActionScope(scope) {
  const normalized = scope?.trim();
  return normalized || void 0;
}
function isC420UIUserScope(scope) {
  return normalizeC420UIActionScope(scope) === "user";
}

// build-resources/c420ui/src/linux-root-provider.ts
import {
  spawnSync
} from "node:child_process";

// build-resources/c420ui/src/root-provider.ts
var c420uiRootPolicyExitCode = 64;

// build-resources/c420ui/src/linux-root-provider.ts
function defaultC420UILinuxRootValidationCommand(sudoCommand) {
  return { command: sudoCommand, args: ["-v"] };
}
function defaultC420UILinuxRootValidationStdinCommand(sudoCommand) {
  return { command: sudoCommand, args: ["-S", "-v", "-p", ""] };
}
function defaultC420UILinuxBuildActionEnvironment(action, baseEnv) {
  return { ...baseEnv, ...action.env || {} };
}
function defaultC420UILinuxActionHasUserScope(action, actionEnv = {}) {
  void actionEnv;
  return isC420UIUserScope(action.scope);
}
function validateC420UILinuxActionScope(action, actionEnv, actionHasUserScope = defaultC420UILinuxActionHasUserScope) {
  if (action.requiresRoot === true && actionHasUserScope(action, actionEnv)) {
    return {
      ok: false,
      code: c420uiRootPolicyExitCode,
      message: `[error] ${action.id}: requiresRoot=true cannot be combined with user scope.`
    };
  }
  return { ok: true };
}
function createC420UILinuxRootProviderBase(options) {
  const runCommand = options.runCommand ?? spawnSync;
  const buildActionEnvironment = options.buildActionEnvironment ?? defaultC420UILinuxBuildActionEnvironment;
  const actionHasUserScope = options.actionHasUserScope ?? defaultC420UILinuxActionHasUserScope;
  const buildRootValidationCommand = options.buildRootValidationCommand ?? defaultC420UILinuxRootValidationCommand;
  const buildRootValidationStdinCommand = options.buildRootValidationStdinCommand ?? defaultC420UILinuxRootValidationStdinCommand;
  return {
    id: options.id ?? "c420ui-linux-root-provider-base",
    label: options.label ?? "c420ui Linux root provider base",
    buildActionEnvironment(action, baseEnv) {
      return buildActionEnvironment(action, baseEnv);
    },
    validateActionScope(action, actionEnv) {
      return validateC420UILinuxActionScope(
        action,
        actionEnv,
        actionHasUserScope
      );
    },
    validateRootAccess(rootDir, actionEnv) {
      const validationCommand = buildRootValidationCommand(
        options.sudoCommand
      );
      const result = runCommand(validationCommand.command, validationCommand.args, {
        cwd: rootDir,
        stdio: "inherit",
        env: actionEnv,
        shell: false
      });
      if (result.error) {
        return {
          ok: false,
          code: 1,
          message: `[error] Failed to start privilege validation: ${result.error.message}`
        };
      }
      const code = result.status ?? 1;
      if (code !== 0) {
        return {
          ok: false,
          code,
          message: "[error] Privilege validation failed before action execution."
        };
      }
      return { ok: true };
    },
    validateRootAccessWithInput(rootDir, actionEnv, input) {
      const validationCommand = buildRootValidationStdinCommand(
        options.sudoCommand
      );
      const result = runCommand(validationCommand.command, validationCommand.args, {
        cwd: rootDir,
        env: actionEnv,
        shell: false,
        input: `${input}
`,
        stdio: ["pipe", "pipe", "pipe"]
      });
      if (result.error) {
        return {
          ok: false,
          code: 1,
          message: `[error] Failed to start privilege validation: ${result.error.message}`
        };
      }
      const code = result.status ?? 1;
      if (code !== 0) {
        return {
          ok: false,
          code,
          message: "[error] Privilege validation failed before action execution."
        };
      }
      return { ok: true };
    },
    buildRootActionEnvironment(_action, actionEnv) {
      if (!options.rootAuthEnvKey) return { ...actionEnv };
      return {
        ...actionEnv,
        [options.rootAuthEnvKey]: options.rootAuthEnvValue ?? "1"
      };
    }
  };
}

// build-resources/c420ui/src/host-dependencies.ts
var c420uiKnownHostDependencyPurposes = [
  "terminal",
  "cli",
  "development",
  "build",
  "package",
  "validation",
  "release"
];
var c420uiKnownNpmInstallStrategies = ["auto", "ci", "install"];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertOptionalBoolean(value, key, failures, path17) {
  if (key in value && typeof value[key] !== "boolean") {
    failures.push(`${path17}.${key} must be a boolean`);
  }
}
function assertOptionalString(value, key, failures, path17) {
  if (key in value && typeof value[key] !== "string") {
    failures.push(`${path17}.${key} must be a string`);
  }
}
function assertOptionalStringArray(value, key, failures, path17) {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some((item) => typeof item !== "string")) {
    failures.push(`${path17}.${key} must be a string array`);
  }
}
function assertOptionalPurposeArray(value, key, failures, path17) {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some(
    (item) => typeof item !== "string" || !c420uiKnownHostDependencyPurposes.includes(item)
  )) {
    failures.push(`${path17}.${key} must contain only known host dependency purposes`);
  }
}
function validateConfigShape(value) {
  const failures = [];
  if (!isRecord(value)) return ["host dependency config must be an object"];
  if ("node" in value) {
    if (!isRecord(value.node)) {
      failures.push("node must be an object");
    } else {
      if ("minimumMajor" in value.node && typeof value.node.minimumMajor !== "number") {
        failures.push("node.minimumMajor must be a number");
      }
      assertOptionalBoolean(value.node, "required", failures, "node");
    }
  }
  if ("commands" in value) {
    if (!Array.isArray(value.commands)) {
      failures.push("commands must be an array");
    } else {
      value.commands.forEach((command, index) => {
        const commandPath = `commands[${index}]`;
        if (!isRecord(command)) {
          failures.push(`${commandPath} must be an object`);
          return;
        }
        if (typeof command.id !== "string") failures.push(`${commandPath}.id must be a string`);
        if (typeof command.command !== "string") failures.push(`${commandPath}.command must be a string`);
        assertOptionalBoolean(command, "required", failures, commandPath);
        assertOptionalPurposeArray(command, "requiredFor", failures, commandPath);
        assertOptionalString(command, "installHint", failures, commandPath);
      });
    }
  }
  if ("npm" in value) {
    if (!isRecord(value.npm)) {
      failures.push("npm must be an object");
    } else {
      if (value.npm.packageManager !== "npm") failures.push('npm.packageManager must be "npm"');
      assertOptionalString(value.npm, "lockfile", failures, "npm");
      if ("installStrategy" in value.npm && !c420uiKnownNpmInstallStrategies.includes(value.npm.installStrategy)) {
        failures.push('npm.installStrategy must be "auto", "ci", or "install"');
      }
      assertOptionalBoolean(value.npm, "includeDev", failures, "npm");
      assertOptionalStringArray(value.npm, "requiredDependencies", failures, "npm");
      assertOptionalStringArray(value.npm, "requiredDevDependencies", failures, "npm");
    }
  }
  return failures;
}
function assertC420UIHostDependencyConfig(value) {
  const failures = validateConfigShape(value);
  if (failures.length > 0) {
    throw new Error(`Invalid c420ui host dependency config: ${failures.join("; ")}.`);
  }
}
function validateC420UIHostDependencyConfig(value) {
  assertC420UIHostDependencyConfig(value);
  return value;
}

// build-resources/c420ui/src/exit-codes.ts
var c420uiExitCodes = {
  success: 0,
  generalError: 1,
  invalidUsage: 64,
  rootPolicyError: 64,
  plannedAction: 78,
  canceled: 130
};

// build-resources/c420ui/src/rust-host.ts
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import fs from "node:fs";
import path from "node:path";
function resolveC420UIRustHostBinary(rootDir, env = {}) {
  let binPath = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  if (!binPath) {
    const debugPath = path.join(rootDir, "build-resources/c420ui-rs/target/debug/c420ui-host");
    const releasePath = path.join(rootDir, "build-resources/c420ui-rs/target/release/c420ui-host");
    if (fs.existsSync(debugPath)) {
      binPath = debugPath;
    } else if (fs.existsSync(releasePath)) {
      binPath = releasePath;
    }
  }
  if (!binPath || !fs.existsSync(binPath)) {
    throw new Error("c420ui Rust host is missing. Run npm run build:c420ui-rs.");
  }
  return binPath;
}
function buildRustHostProcessEnv(env = {}) {
  const childEnv = {};
  if (env.PATH) {
    childEnv.PATH = env.PATH;
  } else if (process.env.PATH) {
    childEnv.PATH = process.env.PATH;
  }
  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }
  return childEnv;
}
function parseJsonLine(line) {
  try {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed !== "object" || !("event" in parsed)) {
      throw new Error("missing event field");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSONL event from c420ui-host: ${error instanceof Error ? error.message : String(error)}.`);
  }
}
async function runC420UIRustHostJsonLines(options) {
  const { rootDir, input, timeoutMs = 0, env = {}, signal, onEvent } = options;
  const binPath = resolveC420UIRustHostBinary(rootDir, env);
  const childEnv = buildRustHostProcessEnv(env);
  return new Promise((resolve, reject) => {
    const child = spawn(binPath, ["run-process", "--json-lines"], {
      env: childEnv,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdoutPending = "";
    let stderrData = "";
    let settled = false;
    let timeout;
    const decoder = new StringDecoder("utf8");
    function settle(error, code = 0) {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(code);
    }
    function abort() {
      try {
        child.stdin.write(JSON.stringify({ event: "cancel" }) + "\n");
      } catch {
      }
      if (timeoutMs > 0) {
        setTimeout(() => {
          if (!settled) child.kill();
        }, Math.min(timeoutMs, 1e3)).unref();
      }
    }
    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill();
        settle(new Error(`c420ui-host run-process timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      timeout.unref();
    }
    child.on("error", (error) => settle(error));
    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });
    child.stdout.on("data", (chunk) => {
      stdoutPending += decoder.write(chunk);
      const lines = stdoutPending.split(/\r?\n/);
      stdoutPending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEvent(parseJsonLine(line));
        } catch (error) {
          settle(error instanceof Error ? error : new Error(String(error)));
          child.kill();
          return;
        }
      }
    });
    child.stdout.on("end", () => {
      stdoutPending += decoder.end();
      const line = stdoutPending.trim();
      if (!line) return;
      try {
        onEvent(parseJsonLine(line));
      } catch (error) {
        settle(error instanceof Error ? error : new Error(String(error)));
      }
    });
    child.on("close", (code) => {
      if (settled) return;
      if (stderrData.trim() && code !== 0) {
        stderrData = stderrData.slice(0, 500);
      }
      settle(null, code ?? 1);
    });
    signal?.addEventListener("abort", abort, { once: true });
    try {
      child.stdin.write(JSON.stringify(input) + "\n");
    } catch (error) {
      settle(error instanceof Error ? error : new Error(String(error)));
    }
    if (signal?.aborted) {
      abort();
    }
  });
}

// build-resources/c420ui/src/operational-logs.ts
var c420uiDefaultRedactionPatterns = [
  {
    id: "token-assignment",
    pattern: /\b(token|secret|password|passwd|api[_-]?key)=([^\s]+)/gi,
    replacement: "$1=[redacted]"
  },
  {
    id: "bearer-token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/g,
    replacement: "Bearer [redacted]"
  }
];
function redactC420UILogLine(line) {
  return c420uiDefaultRedactionPatterns.reduce(
    (redactedLine, redaction) => redactedLine.replace(redaction.pattern, redaction.replacement),
    line
  );
}
function createC420UIOperationalLogEvent(options) {
  return {
    source: options.source,
    line: options.redact === false ? options.line : redactC420UILogLine(options.line),
    level: options.level,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// build-resources/c420ui/src/rust-process-runner.ts
var rustProcessEnvAllowlist = /* @__PURE__ */ new Set([
  "PATH",
  "HOME",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "TMPDIR",
  "TEMP",
  "TMP",
  "CI",
  "FORCE_COLOR",
  "NO_COLOR",
  "npm_config_cache",
  "npm_config_userconfig",
  "npm_config_prefix",
  "npm_config_loglevel",
  "npm_config_update_notifier",
  "C420UI_HOST_BIN"
]);
function buildC420UIRustProcessEnv(env) {
  const safeEnv = {};
  for (const key of rustProcessEnvAllowlist) {
    const value = env[key];
    if (typeof value === "string") safeEnv[key] = value;
  }
  return safeEnv;
}
function emitActionLog(options, line, level = "info") {
  options.emitLog(createC420UIOperationalLogEvent({ source: "action", line, level }));
}
function mapEvent(options, event) {
  if (event.event === "stdout" || event.event === "stderr") {
    options.emitLog(createC420UIOperationalLogEvent({ source: event.event, line: event.line }));
    return;
  }
  if (event.event === "error") {
    emitActionLog(options, `[error] Failed to start ${options.label}: ${event.message}`, "error");
  }
}
async function runC420UIRustProcess(options) {
  if (options.signal?.aborted) {
    emitActionLog(options, `[action] Cancel requested for ${options.label}`);
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: "Action canceled before start."
    };
  }
  emitActionLog(options, `[action] Starting ${options.label}`);
  options.emitProgress({ state: "running", label: options.label });
  let exitCode = c420uiExitCodes.generalError;
  let canceled = false;
  let errorMessage;
  try {
    const hostExitCode = await runC420UIRustHostJsonLines({
      rootDir: options.rootDir,
      command: "run-process",
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      env: options.env,
      input: {
        command: options.command,
        args: options.args ?? [],
        cwd: options.cwd,
        env: buildC420UIRustProcessEnv(options.env),
        label: options.label
      },
      onEvent(event) {
        mapEvent(options, event);
        if (event.event === "exit") exitCode = event.code;
        if (event.event === "canceled") {
          canceled = true;
          errorMessage = event.message;
        }
        if (event.event === "error") {
          errorMessage = event.message;
        }
      }
    });
    if (exitCode === c420uiExitCodes.generalError && hostExitCode !== c420uiExitCodes.success) {
      exitCode = hostExitCode;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitActionLog(options, `[error] Failed to start ${options.label}: ${message}`, "error");
    options.emitProgress({ state: "failed", label: options.label });
    return { code: c420uiExitCodes.generalError, status: "failed", message };
  }
  if (canceled || options.signal?.aborted || exitCode === c420uiExitCodes.canceled) {
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: errorMessage ?? "Action canceled."
    };
  }
  const success = exitCode === c420uiExitCodes.success;
  if (!success) {
    emitActionLog(options, `[error] ${options.label} exited with code ${exitCode}`, "error");
  }
  options.emitProgress({
    state: success ? "success" : "failed",
    percent: success ? 100 : void 0,
    label: options.label
  });
  return {
    code: exitCode,
    status: success ? "success" : "failed",
    message: errorMessage
  };
}

// build-resources/c420ui/src/maintenance-config.ts
function validateTargetList(input, field) {
  if (input === void 0) return void 0;
  if (!Array.isArray(input)) {
    throw new Error(`${field} must be an array`);
  }
  return input.map((target, index) => {
    if (typeof target !== "string") {
      throw new Error(`${field}[${index}] must be a string`);
    }
    const trimmed = target.trim();
    if (!trimmed) {
      throw new Error(`${field}[${index}] must not be empty`);
    }
    if (trimmed.startsWith("/") || trimmed === "." || trimmed === "/" || trimmed.includes("\\")) {
      throw new Error(`${field}[${index}] must be a safe relative path`);
    }
    if (trimmed.split("/").includes("..")) {
      throw new Error(`${field}[${index}] must not contain ..`);
    }
    return trimmed;
  });
}
function validateC420UIMaintenanceConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("maintenance config must be an object");
  }
  const value = input;
  return {
    cleanupTargets: validateTargetList(value.cleanupTargets, "cleanupTargets"),
    permissionTargets: validateTargetList(value.permissionTargets, "permissionTargets")
  };
}

// build-resources/c420ui/src/rust-action-engine.ts
import { spawn as spawn2 } from "node:child_process";
import fs2 from "node:fs";
import path2 from "node:path";
import { StringDecoder as StringDecoder2 } from "node:string_decoder";

// build-resources/c420ui/src/actions.ts
var c420uiActionKinds = ["command", "planned", "internal"];
function getC420UIActionCliFlags(action) {
  const legacyCli = action.cli ?? [];
  return [...action.cliFlags ?? [], ...legacyCli];
}
function isC420UIPlannedAction(action) {
  return action.kind === "planned" || action.planned === true;
}
function assertC420UIActionContract(action) {
  if (!action.id.trim()) throw new Error("c420ui action id is required");
  if (!action.label.trim()) throw new Error(`${action.id}: label is required`);
}
function isRecord2(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requireString(value, message) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}
function requireOptionalStringArray(value, message) {
  if (value === void 0) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(message);
  }
}
function requireOptionalBoolean(action, key) {
  if (action[key] !== void 0 && typeof action[key] !== "boolean") {
    throw new Error(`Action ${key} must be boolean: ${String(action.id)}`);
  }
}
function requireOptionalString(action, key) {
  if (action[key] !== void 0 && typeof action[key] !== "string") {
    throw new Error(`Action ${key} must be string: ${String(action.id)}`);
  }
}
function validateActionEnv(action) {
  if (action.env === void 0) return;
  if (!isRecord2(action.env)) {
    throw new Error(`Action env must be an object: ${String(action.id)}`);
  }
  for (const [key, value] of Object.entries(action.env)) {
    if (!key.trim()) {
      throw new Error(`Action env contains an empty key: ${String(action.id)}`);
    }
    if (typeof value !== "string") {
      throw new Error(
        `Action env value must be string: ${String(action.id)} -> ${key}`
      );
    }
  }
}
function validateAllowedValue(value, allowed, message) {
  if (allowed && !allowed.includes(value)) throw new Error(message);
}
function validateC420UIActions(actions, options = {}) {
  if (!Array.isArray(actions)) throw new Error("actions registry must contain an array");
  const ids = /* @__PURE__ */ new Set();
  const cliAliases = /* @__PURE__ */ new Set();
  for (const item of actions) {
    if (!isRecord2(item)) throw new Error("Action entries must be objects");
    requireString(item.id, "Action missing id");
    if (!/^[a-z0-9-]+$/.test(item.id)) {
      throw new Error(`Invalid action id format: ${item.id}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate action id: ${item.id}`);
    ids.add(item.id);
    requireString(item.label, `Action missing label: ${item.id}`);
    requireString(item.group, `Action missing group: ${item.id}`);
    requireString(item.section, `Action missing section: ${item.id}`);
    requireString(item.kind, `Action missing kind: ${item.id}`);
    validateAllowedValue(
      item.group,
      options.allowedGroups,
      `Invalid action group: ${item.id} -> ${item.group}`
    );
    validateAllowedValue(
      item.section,
      options.allowedSections,
      `Invalid action section: ${item.id} -> ${item.section}`
    );
    validateAllowedValue(
      item.kind,
      options.allowedKinds ?? c420uiActionKinds,
      `Unsupported action kind: ${item.id} -> ${item.kind}`
    );
    requireOptionalStringArray(item.args, `Action args must be an array: ${item.id}`);
    requireOptionalStringArray(
      item.cli,
      `Action cli aliases must be an array: ${item.id}`
    );
    requireOptionalStringArray(
      item.cliFlags,
      `Action cliFlags aliases must be an array: ${item.id}`
    );
    if (item.scope !== void 0) {
      requireString(item.scope, `Action scope must be string: ${item.id}`);
      validateAllowedValue(
        item.scope,
        options.allowedScopes ?? c420uiKnownActionScopes,
        `Invalid action scope: ${item.id} -> ${item.scope}`
      );
    }
    for (const key of [
      "hidden",
      "longRunning",
      "dangerous",
      "planned",
      "requiresConfirmation",
      "requiresRoot"
    ]) {
      requireOptionalBoolean(item, key);
    }
    for (const key of [
      "command",
      "description",
      "confirmationTitle",
      "confirmationMessage",
      "confirmationPhrase",
      "warning",
      "artifactWorkflowId"
    ]) {
      requireOptionalString(item, key);
    }
    validateActionEnv(item);
    if (item.kind === "planned") {
      if (item.command || item.args) {
        throw new Error(`Planned action must not define command/args: ${item.id}`);
      }
    }
    if (item.kind === "command") {
      if (!item.command) throw new Error(`Command action missing command: ${item.id}`);
      if (!Array.isArray(item.args)) {
        throw new Error(`Command action args must be an array: ${item.id}`);
      }
    }
    for (const alias of [...item.cli ?? [], ...item.cliFlags ?? []]) {
      if (!alias.startsWith("--")) {
        throw new Error(`CLI alias must start with --: ${item.id} -> ${alias}`);
      }
      if (cliAliases.has(alias)) throw new Error(`Duplicate cli alias: ${alias}`);
      cliAliases.add(alias);
    }
    if (item.dangerous && item.requiresConfirmation !== true) {
      throw new Error(
        `Dangerous action must set requiresConfirmation=true: ${item.id}`
      );
    }
    if (item.dangerous && !(item.description || item.confirmationMessage)) {
      throw new Error(
        `Dangerous action missing description/confirmationMessage: ${item.id}`
      );
    }
  }
}
function validateC420UIActionRegistry(actions, options) {
  validateC420UIActions(actions, options);
}

// build-resources/c420ui/src/events.ts
function createC420UIEvent(event) {
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...event
  };
}

// build-resources/c420ui/src/rust-action-engine.ts
function createC420UIRustActionEngine(options) {
  const { bridge, rootDir, emit, rootProvider } = options;
  function listActions() {
    return bridge.actions();
  }
  function resolveActionById(actionId) {
    const action = listActions().find((candidate) => candidate.id === actionId);
    return action ? { found: true, action } : { found: false, reason: "not-found", query: actionId };
  }
  function resolveActionByCliFlag(flag) {
    const action = listActions().find(
      (candidate) => getC420UIActionCliFlags(candidate).includes(flag)
    );
    return action ? { found: true, action } : { found: false, reason: "not-found", query: flag };
  }
  async function runActionById(actionId, runOptions = {}) {
    const resolution = resolveActionById(actionId);
    if (!resolution.found) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`
      };
    }
    return runAction(resolution.action, runOptions);
  }
  async function runAction(action, runOptions = {}) {
    assertC420UIActionContract(action);
    const baseEnv = options.env ?? process.env;
    let actionEnv = rootProvider ? rootProvider.buildActionEnvironment(action, baseEnv) : baseEnv;
    let rootPolicy;
    if (rootProvider) {
      const scopeResult = rootProvider.validateActionScope(action, actionEnv);
      if (scopeResult.ok === false) {
        return {
          code: scopeResult.code,
          status: "failed",
          message: scopeResult.message
        };
      }
      const policy = rootProvider.resolveRootPolicy(action, rootDir, actionEnv);
      if (policy.requiresRoot === false && policy.warning) {
        emit?.(createC420UIEvent({ type: "log", source: "system", line: policy.warning }));
      }
      if (policy.requiresRoot) {
        rootPolicy = {
          requiresRoot: true,
          reason: policy.reason,
          actionEnv: rootProvider.buildRootActionEnvironment ? pickStringEnv(rootProvider.buildRootActionEnvironment(action, actionEnv)) : {}
        };
      }
    }
    const finalEvent = await runRustActionProcess({
      rootDir,
      action,
      actions: listActions(),
      env: pickStringEnv(actionEnv),
      rootPolicy,
      dryRun: runOptions.dryRun === true,
      yes: runOptions.yes === true,
      signal: runOptions.signal,
      requestRootAccess: async (request) => {
        if (!options.requestRootAccess) {
          const access = rootProvider?.validateRootAccess(rootDir, actionEnv);
          if (access?.ok === false) return access;
          actionEnv = rootProvider?.buildRootActionEnvironment?.(action, actionEnv) ?? actionEnv;
          return { ok: true, env: actionEnv };
        }
        return options.requestRootAccess(request);
      },
      emit,
      rootProvider,
      actionEnv
    });
    if (finalEvent) {
      return {
        code: finalEvent.code,
        status: normalizeActionStatus(finalEvent.status)
      };
    }
    return {
      code: c420uiExitCodes.generalError,
      status: "failed",
      message: "Action did not emit a finish event."
    };
  }
  return {
    listActions,
    resolveActionById,
    resolveActionByCliFlag,
    runActionById,
    runAction
  };
}
async function runRustActionProcess(options) {
  const binPath = resolveC420UIRustHostBinary2(options.rootDir, options.env);
  return new Promise((resolve, reject) => {
    const child = spawn2(binPath, ["action-run", "--json-lines"], {
      env: buildRustHostProcessEnv2(options.env),
      shell: false,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const decoder = new StringDecoder2("utf8");
    let stdoutPending = "";
    let stderrData = "";
    let finalEvent;
    let settled = false;
    const pendingEvents = /* @__PURE__ */ new Set();
    async function waitForPendingEvents() {
      while (pendingEvents.size > 0) {
        await Promise.all([...pendingEvents]);
      }
    }
    function settle(error) {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(finalEvent);
    }
    function send(event) {
      try {
        child.stdin.write(`${JSON.stringify(event)}
`);
      } catch {
      }
    }
    function abort() {
      send({ event: "cancel" });
    }
    function processLine(line) {
      const pending = handleRustActionEvent(line, options, send).then((event) => {
        if (event?.event === "action:finish") finalEvent = event;
      });
      pendingEvents.add(pending);
      pending.then(
        () => pendingEvents.delete(pending),
        (error) => {
          pendingEvents.delete(pending);
          settle(error);
        }
      );
    }
    child.on("error", (error) => settle(error));
    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });
    child.stdout.on("data", (chunk) => {
      stdoutPending += decoder.write(chunk);
      const lines = stdoutPending.split(/\r?\n/);
      stdoutPending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        processLine(line);
      }
    });
    child.stdout.on("end", () => {
      stdoutPending += decoder.end();
      const line = stdoutPending.trim();
      if (!line) return;
      processLine(line);
    });
    child.on("close", (code) => {
      void waitForPendingEvents().then(() => {
        if (!finalEvent && code && stderrData.trim()) {
          settle(new Error(`c420ui-host action-run exited with code ${code}.`));
          return;
        }
        settle();
      }, settle);
    });
    child.stdin.on("error", () => {
    });
    options.signal?.addEventListener("abort", abort, { once: true });
    child.stdin.write(`${JSON.stringify({
      rootDir: options.rootDir,
      actionId: options.action.id,
      dryRun: options.dryRun,
      yes: options.yes,
      env: options.env,
      actions: options.actions.map(toRustActionDefinition),
      rootPolicy: options.rootPolicy
    })}
`);
    if (options.signal?.aborted) abort();
  });
}
async function handleRustActionEvent(line, options, send) {
  const event = JSON.parse(line);
  if (event.event === "action:start") {
    options.emit?.(
      createC420UIEvent({
        type: "action:start",
        actionId: event.actionId,
        message: event.message,
        data: event.data
      })
    );
  } else if (event.event === "log") {
    options.emit?.(
      createC420UIEvent({
        type: "log",
        source: event.source,
        line: event.line,
        level: event.level
      })
    );
  } else if (event.event === "progress") {
    options.emit?.(
      createC420UIEvent({
        type: "progress",
        state: event.state,
        label: event.label,
        percent: event.percent
      })
    );
  } else if (event.event === "root-request") {
    const result = await options.requestRootAccess({
      action: options.action,
      rootDir: options.rootDir,
      actionEnv: options.actionEnv,
      reason: event.reason
    });
    send({
      event: "root-response",
      requestId: event.requestId,
      accepted: result.ok === true,
      env: result.ok === true ? pickStringEnv(result.env ?? {}) : {}
    });
  } else if (event.event === "action:finish") {
    options.emit?.(
      createC420UIEvent({
        type: "action:finish",
        actionId: event.actionId,
        message: event.actionId,
        data: { exitCode: event.code, status: event.status }
      })
    );
  } else if (event.event === "error") {
    options.emit?.(
      createC420UIEvent({
        type: "log",
        source: "system",
        level: "error",
        line: event.message
      })
    );
  }
  return event;
}
function toRustActionDefinition(action) {
  return {
    id: action.id,
    label: action.label,
    description: action.description,
    group: action.group,
    command: action.command,
    args: action.args ?? [],
    cliFlags: getC420UIActionCliFlags(action),
    dangerous: action.dangerous === true,
    planned: action.kind === "planned" || action.planned === true,
    requiresConfirmation: action.requiresConfirmation === true,
    requiresRoot: action.requiresRoot === true,
    env: action.env ?? {}
  };
}
function normalizeActionStatus(status) {
  if (status === "success" || status === "planned" || status === "canceled") return status;
  return "failed";
}
function pickStringEnv(env) {
  const output = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") output[key] = value;
  }
  return output;
}
function resolveC420UIRustHostBinary2(rootDir, env = {}) {
  let binPath = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  if (!binPath) {
    const debugPath = path2.join(rootDir, "build-resources/c420ui-rs/target/debug/c420ui-host");
    const releasePath = path2.join(rootDir, "build-resources/c420ui-rs/target/release/c420ui-host");
    if (fs2.existsSync(debugPath)) binPath = debugPath;
    else if (fs2.existsSync(releasePath)) binPath = releasePath;
  }
  if (!binPath || !fs2.existsSync(binPath)) {
    throw new Error("c420ui Rust host is missing. Run npm run build:c420ui-rs.");
  }
  return binPath;
}
function buildRustHostProcessEnv2(env = {}) {
  const childEnv = {};
  if (env.PATH) childEnv.PATH = env.PATH;
  else if (process.env.PATH) childEnv.PATH = process.env.PATH;
  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }
  return childEnv;
}

// build-resources/c420ui/src/terminal/settings.ts
import path3 from "node:path";
function configHome() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return xdgConfigHome;
  }
  return path3.join(process.env.HOME || ".", ".config");
}
function toolSettingsPath(stateDirectoryName) {
  return path3.join(configHome(), stateDirectoryName, "tool-settings.json");
}

// build-resources/c420ui/src/theme.json
var theme_default = {
  palette: {
    canvaLightBlue: "#07B9CE",
    canvaBlue: "#3969E7",
    canvaPurple: "#7D2AE7",
    success: "#00C853",
    warning: "#FFD166",
    error: "#FF4D4F",
    text: "#EAF7FF",
    muted: "#8FA3B8",
    background: "#10131A",
    surface: "#171B24",
    surfaceAlt: "#202635"
  },
  ansiFallback: {
    primary: "cyan",
    secondary: "blue",
    accent: "magenta",
    success: "green",
    warning: "yellow",
    error: "red"
  }
};

// build-resources/c420ui/src/terminal/theme.ts
var supportsTrueColor = process.env.COLORTERM === "truecolor" || process.env.COLORTERM === "24bit";
var colors = {
  lightBlue: supportsTrueColor ? theme_default.palette.canvaLightBlue : theme_default.ansiFallback.primary,
  blue: supportsTrueColor ? theme_default.palette.canvaBlue : theme_default.ansiFallback.secondary,
  purple: supportsTrueColor ? theme_default.palette.canvaPurple : theme_default.ansiFallback.accent,
  success: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  warning: supportsTrueColor ? theme_default.palette.warning : theme_default.ansiFallback.warning,
  error: supportsTrueColor ? theme_default.palette.error : theme_default.ansiFallback.error,
  text: supportsTrueColor ? theme_default.palette.text : "white",
  muted: supportsTrueColor ? theme_default.palette.muted : "gray",
  background: supportsTrueColor ? theme_default.palette.background : "black",
  surface: supportsTrueColor ? theme_default.palette.surface : "black",
  surfaceAlt: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  menuSelectedBg: supportsTrueColor ? theme_default.palette.canvaPurple : "magenta",
  menuSelectedFg: "white",
  menuInactiveSelectedBg: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  menuInactiveSelectedFg: supportsTrueColor ? theme_default.palette.canvaLightBlue : "cyan",
  footerBg: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  footerFg: "white",
  statusDetected: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  statusNotDetected: supportsTrueColor ? theme_default.palette.canvaPurple : theme_default.ansiFallback.accent,
  helpTitle: supportsTrueColor ? theme_default.palette.canvaBlue : theme_default.ansiFallback.secondary,
  helpSectionTitle: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  infoItemTitle: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  infoText: supportsTrueColor ? theme_default.palette.text : "white",
  descriptionText: supportsTrueColor ? theme_default.palette.text : "white",
  logo: supportsTrueColor ? theme_default.palette.canvaLightBlue : theme_default.ansiFallback.secondary,
  version: supportsTrueColor ? theme_default.palette.canvaLightBlue : theme_default.ansiFallback.secondary,
  phase: supportsTrueColor ? theme_default.palette.warning : theme_default.ansiFallback.warning,
  appImageLoading: supportsTrueColor ? theme_default.palette.warning : theme_default.ansiFallback.warning,
  activeBorder: supportsTrueColor ? theme_default.palette.canvaLightBlue : "cyan",
  inactiveBorder: supportsTrueColor ? theme_default.palette.canvaBlue : "blue",
  activeLabel: supportsTrueColor ? theme_default.palette.canvaLightBlue : "cyan",
  inactiveLabel: supportsTrueColor ? theme_default.palette.muted : "gray",
  activeBlockBg: supportsTrueColor ? theme_default.palette.surface : "black",
  activeCellBg: supportsTrueColor ? theme_default.palette.canvaBlue : "blue",
  activeCellFg: "white",
  activeCheckboxFg: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  activeCheckboxBg: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  inactiveCheckboxFg: supportsTrueColor ? theme_default.palette.muted : "gray"
};
var c420uiTheme = {
  supportsTrueColor,
  colors,
  header: {
    fg: colors.lightBlue,
    bg: colors.background,
    bold: true
  },
  menu: {
    fg: colors.text,
    bg: colors.background,
    border: {
      fg: colors.blue
    },
    selected: {
      fg: colors.menuSelectedFg,
      bg: colors.menuSelectedBg,
      bold: true
    },
    item: {
      fg: colors.text
    }
  },
  content: {
    fg: colors.text,
    bg: colors.background,
    border: {
      fg: colors.purple
    },
    label: {
      fg: colors.lightBlue
    }
  },
  logs: {
    fg: colors.text,
    bg: colors.background,
    border: {
      fg: colors.blue
    },
    label: {
      fg: colors.lightBlue
    }
  },
  footer: {
    fg: colors.footerFg,
    bg: colors.footerBg,
    bold: true
  },
  modal: {
    normalBorder: colors.lightBlue,
    dangerousBorder: colors.error,
    text: colors.text,
    background: colors.background
  }
};

// build-resources/c420ui/src/cli.ts
function writeLine(writer, line) {
  writer?.(line);
}
function renderHelp(bridge) {
  const project = bridge.projectInfo();
  const lines = [
    `${project.projectName} c420ui CLI bridge`,
    "",
    "Usage:",
    "  c420ui-cli [direct action] [--yes] [--dry-run]",
    "",
    "Global options:",
    "  -h, --help       Show this help",
    "  -y, --yes        Non-interactive confirmation",
    "      --force      Alias for --yes",
    "      --dry-run    Resolve action metadata without executing commands",
    "",
    "Direct actions:"
  ];
  const actionLines = bridge.actions().flatMap((action) => getC420UIActionCliFlags(action)).sort().map((flag) => `  ${flag}`);
  return [...lines, ...actionLines.length ? actionLines : ["  (none)"]];
}
function parseC420UICliArgs(argv) {
  const parsed = {
    help: false,
    dryRun: false,
    yes: false,
    directActionFlags: []
  };
  for (const arg of argv) {
    switch (arg) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--yes":
      case "-y":
      case "--force":
        parsed.yes = true;
        break;
      default:
        parsed.directActionFlags.push(arg);
        break;
    }
  }
  return parsed;
}
async function runC420UICli(options) {
  const engine = createC420UIRustActionEngine({
    bridge: options.bridge,
    rootDir: options.rootDir,
    env: options.env,
    emit: options.emit,
    rootProvider: options.rootProvider
  });
  const parsed = parseC420UICliArgs(options.argv);
  if (parsed.help) {
    for (const line of renderHelp(options.bridge)) {
      writeLine(options.writeStdout, line);
    }
    return { exitCode: c420uiExitCodes.success, handled: true };
  }
  const directActions = [];
  for (const flag of parsed.directActionFlags) {
    const resolution = engine.resolveActionByCliFlag(flag);
    if (!resolution.found) {
      writeLine(options.writeStderr, `Unknown option: ${flag}`);
      return { exitCode: c420uiExitCodes.invalidUsage, handled: true };
    }
    directActions.push(resolution.action);
  }
  if (directActions.length > 1) {
    writeLine(
      options.writeStderr,
      "Only one direct action can be executed per invocation."
    );
    return { exitCode: c420uiExitCodes.invalidUsage, handled: true };
  }
  const directAction = directActions[0];
  if (!directAction) {
    return { exitCode: c420uiExitCodes.invalidUsage, handled: false };
  }
  const result = await engine.runAction(directAction, {
    dryRun: parsed.dryRun,
    yes: parsed.yes
  });
  if (result.message) {
    const writer = result.status === "failed" ? options.writeStderr : options.writeStdout;
    writeLine(writer, result.message);
  }
  return { exitCode: result.code, handled: true };
}

// build-resources/c420ui/src/command-runner.ts
async function runC420UICommand(options) {
  const processRunner = options.processRunner ?? runC420UIRustProcess;
  return processRunner({
    rootDir: options.cwd,
    command: options.command,
    args: options.args ?? [],
    cwd: options.cwd,
    env: options.env,
    label: options.label,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    emitLog: options.emitLog,
    emitProgress: options.emitProgress
  });
}

// build-resources/c420ui/src/artifacts.ts
import path4 from "node:path";
var artifactCapabilityFields = [
  "supportsArtifacts",
  "supportsInstall",
  "supportsUninstall",
  "supportsPurge",
  "supportsRelease",
  "supportsRootActions",
  "supportsDryRun",
  "supportsPlannedActions"
];
var artifactWorkflowKinds = [
  "appimage",
  "flatpak",
  "tarball",
  "deb",
  "rpm",
  "aur",
  "native",
  "custom"
];
var artifactWorkflowScopes = [
  "user",
  "system",
  "portable",
  "release",
  "none"
];
var artifactActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
  "releaseActionId"
];
var executableArtifactActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId"
];
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertRequiredString(value, field, context) {
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string`);
  }
}
function assertOptionalBoolean2(value, field, context) {
  if (value[field] !== void 0 && typeof value[field] !== "boolean") {
    throw new Error(`${context}: ${field} must be a boolean when present`);
  }
}
function assertOptionalString2(value, field, context) {
  if (value[field] !== void 0 && typeof value[field] !== "string") {
    throw new Error(`${context}: ${field} must be a string when present`);
  }
}
function assertOptionalActionId(value, field, context) {
  if (value[field] === void 0) return;
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string when present`);
  }
}
function assertKnownValue(value, allowedValues, field, context) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${context}: ${field} must be one of ${allowedValues.join(", ")}`);
  }
}
function validateOutputPattern(outputPattern, context) {
  if (outputPattern === void 0) return;
  if (!outputPattern.trim()) {
    throw new Error(`${context}: outputPattern must be non-empty when present`);
  }
  if (outputPattern.includes("x64")) {
    throw new Error(`${context}: outputPattern must not normalize architecture names to x64`);
  }
  if (outputPattern.includes("${arch}")) {
    throw new Error(`${context}: outputPattern must preserve generated architecture globs instead of \${arch}`);
  }
}
function isExecutableArtifactActionField(field) {
  return executableArtifactActionIdFields.includes(field);
}
function isRootManagedArtifactActionField(field) {
  return field === "installActionId" || field === "uninstallActionId" || field === "purgeActionId";
}
function toConfigPath(configPath) {
  return path4.normalize(configPath.replace(/^[\\/]+/, ""));
}
function assertC420UIArtifactRecipeConfig(config, context = "artifact recipe config") {
  if (!isRecord3(config)) throw new Error(`${context}: artifacts config must be an object`);
  if (!isRecord3(config.capabilities)) {
    throw new Error(`${context}: capabilities must be an object`);
  }
  for (const field of artifactCapabilityFields) {
    if (typeof config.capabilities[field] !== "boolean") {
      throw new Error(`${context}: capabilities.${field} must be a boolean`);
    }
  }
  if (!Array.isArray(config.workflows)) {
    throw new Error(`${context}: workflows must be an array`);
  }
  const workflowIds = /* @__PURE__ */ new Set();
  for (const [index, workflow] of config.workflows.entries()) {
    const workflowContext = `${context}: workflows[${index}]`;
    if (!isRecord3(workflow)) throw new Error(`${workflowContext} must be an object`);
    for (const field of ["id", "kind", "label", "scope"]) {
      assertRequiredString(workflow, field, workflowContext);
    }
    const workflowId = workflow.id;
    if (workflowIds.has(workflowId)) {
      throw new Error(`${workflowContext}: duplicate workflow id ${workflowId}`);
    }
    workflowIds.add(workflowId);
    assertKnownValue(workflow.kind, artifactWorkflowKinds, "kind", workflowContext);
    assertKnownValue(workflow.scope, artifactWorkflowScopes, "scope", workflowContext);
    assertOptionalBoolean2(workflow, "planned", workflowContext);
    assertOptionalBoolean2(workflow, "requiresRoot", workflowContext);
    assertOptionalString2(workflow, "description", workflowContext);
    assertOptionalString2(workflow, "outputPattern", workflowContext);
    validateOutputPattern(workflow.outputPattern, workflowContext);
    for (const field of artifactActionIdFields) {
      assertOptionalActionId(workflow, field, workflowContext);
    }
  }
}
function validateC420UIArtifactRecipeConfig(config, context) {
  assertC420UIArtifactRecipeConfig(config, context);
  return config;
}
function validateC420UIArtifactWorkflowsAgainstActions(workflows, actions) {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const workflow of workflows) {
    for (const field of artifactActionIdFields) {
      const actionId = workflow[field];
      if (!actionId) continue;
      const action = actionsById.get(actionId);
      if (!action) {
        throw new Error(`Artifact workflow ${workflow.id} references unknown ${field} ${actionId}`);
      }
      const actionPlanned = isC420UIPlannedAction(action);
      if (workflow.planned === true && actionPlanned !== true) {
        throw new Error(`Artifact workflow ${workflow.id} is planned but ${field} ${actionId} is executable`);
      }
      if (workflow.planned !== true && isExecutableArtifactActionField(field) && actionPlanned) {
        throw new Error(`Artifact workflow ${workflow.id} is executable but ${field} ${actionId} is planned`);
      }
      if (workflow.requiresRoot === true && action.scope === "user") {
        throw new Error(`Artifact workflow ${workflow.id} requires root but ${field} ${actionId} is user-scoped`);
      }
      if (workflow.requiresRoot === false && action.requiresRoot === true) {
        throw new Error(`Artifact workflow ${workflow.id} declares requiresRoot=false but ${field} ${actionId} requires root`);
      }
      if (workflow.scope === "system" && isRootManagedArtifactActionField(field) && action.scope === "user") {
        throw new Error(`Artifact workflow ${workflow.id} is system-scoped but ${field} ${actionId} is user-scoped`);
      }
      if (workflow.scope === "system" && isRootManagedArtifactActionField(field) && action.scope === "system" && action.requiresRoot === false) {
        throw new Error(`Artifact workflow ${workflow.id} is system-scoped but ${field} ${actionId} declares requiresRoot=false`);
      }
    }
  }
}
function resolveC420UIArtifactOutputPattern(outputPattern, values) {
  validateOutputPattern(outputPattern, "artifact outputPattern");
  return toConfigPath(outputPattern.replaceAll("${version}", values.version));
}

// build-resources/c420ui/src/bridge.ts
function createC420UIBridge(bridge) {
  return bridge;
}

// build-resources/c420ui/src/detection.ts
function boolFromC420UIDetectionValue(value) {
  return value === "true";
}

// build-resources/c420ui/src/development-provider.ts
var c420uiDevelopmentTaskKinds = [
  "doctor",
  "validate",
  "build",
  "package",
  "install",
  "uninstall",
  "purge",
  "clean",
  "release",
  "custom"
];
var c420uiDevelopmentTaskRequiredForValues = [
  "development",
  "build",
  "package",
  "release",
  "validation"
];
function isRecord4(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requireString2(value, message) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}
function requireOptionalBoolean2(task, key) {
  if (task[key] !== void 0 && typeof task[key] !== "boolean") {
    throw new Error(`Development task ${key} must be boolean: ${String(task.id)}`);
  }
}
function validateOptionalScope(task) {
  if (task.scope === void 0) return;
  requireString2(task.scope, `Development task scope must be string: ${String(task.id)}`);
  if (!c420uiKnownActionScopes.includes(task.scope)) {
    throw new Error(`Invalid development task scope: ${String(task.id)} -> ${task.scope}`);
  }
}
function validateRequiredFor(task) {
  if (task.requiredFor === void 0) return;
  if (!Array.isArray(task.requiredFor)) {
    throw new Error(`Development task requiredFor must be an array: ${String(task.id)}`);
  }
  for (const value of task.requiredFor) {
    if (typeof value !== "string" || !c420uiDevelopmentTaskRequiredForValues.includes(
      value
    )) {
      throw new Error(`Invalid development task requiredFor: ${String(task.id)} -> ${String(value)}`);
    }
  }
}
function kindToWorkflowPhase(kind) {
  switch (kind) {
    case "doctor":
    case "clean":
    case "custom":
      return "development";
    case "validate":
      return "validation";
    case "build":
      return "build";
    case "package":
      return "package";
    case "install":
      return "install";
    case "uninstall":
      return "uninstall";
    case "purge":
      return "purge";
    case "release":
      return "release";
  }
}
function validateC420UIDevelopmentTasks(tasks) {
  if (!Array.isArray(tasks)) throw new Error("development tasks must be an array");
  const ids = /* @__PURE__ */ new Set();
  for (const item of tasks) {
    if (!isRecord4(item)) throw new Error("Development task entries must be objects");
    requireString2(item.id, "Development task missing id");
    if (ids.has(item.id)) throw new Error(`Duplicate development task id: ${item.id}`);
    ids.add(item.id);
    requireString2(item.label, `Development task missing label: ${item.id}`);
    requireString2(item.kind, `Development task missing kind: ${item.id}`);
    if (!c420uiDevelopmentTaskKinds.includes(item.kind)) {
      throw new Error(`Invalid development task kind: ${item.id} -> ${item.kind}`);
    }
    requireString2(item.actionId, `Development task missing actionId: ${item.id}`);
    if (item.description !== void 0) {
      requireString2(item.description, `Development task description must be string: ${item.id}`);
    }
    validateOptionalScope(item);
    requireOptionalBoolean2(item, "requiresRoot");
    requireOptionalBoolean2(item, "supportsDryRun");
    requireOptionalBoolean2(item, "planned");
    validateRequiredFor(item);
  }
}
function validateC420UIDevelopmentConfig(config) {
  if (!isRecord4(config)) throw new Error("development config must be an object");
  validateC420UIDevelopmentTasks(config.tasks);
}
function supportsDryRunAction(action) {
  if (isC420UIPlannedAction(action)) return false;
  if (action.dryRun === "disabled") return false;
  return action.kind === "command" || action.dryRun === "supported" || action.dryRun === "required";
}
function assertC420UIDevelopmentTaskMatchesAction(task, action) {
  validateC420UIDevelopmentTasks([task]);
  if (task.actionId !== action.id) {
    throw new Error(`Development task ${task.id} actionId does not match action ${action.id}`);
  }
  const plannedAction = isC420UIPlannedAction(action);
  if (task.planned === true && !plannedAction) {
    throw new Error(`Development task ${task.id} is planned but action ${action.id} is executable`);
  }
  if (task.planned !== true && plannedAction) {
    throw new Error(`Development task ${task.id} is executable but action ${action.id} is planned`);
  }
  if (task.requiresRoot !== void 0 && Boolean(task.requiresRoot) !== Boolean(action.requiresRoot)) {
    throw new Error(`Development task ${task.id} requiresRoot contradicts action ${action.id}`);
  }
  if (task.scope !== void 0 && task.scope !== action.scope) {
    throw new Error(`Development task ${task.id} scope contradicts action ${action.id}`);
  }
  if (task.supportsDryRun === true && !supportsDryRunAction(action)) {
    throw new Error(`Development task ${task.id} promises dry-run but action ${action.id} does not support it`);
  }
  const workflowPhase = kindToWorkflowPhase(task.kind);
  if (action.phase !== void 0 && action.phase !== workflowPhase) {
    throw new Error(`Development task ${task.id} phase ${workflowPhase} contradicts action ${action.id} phase ${action.phase}`);
  }
}
function createC420UIDevelopmentWorkflowFromAction(task, action) {
  assertC420UIDevelopmentTaskMatchesAction(task, action);
  const phase = kindToWorkflowPhase(task.kind);
  const workflowAction = {
    ...action,
    phase
  };
  return {
    id: task.id,
    label: task.label || action.label,
    phase,
    actions: [workflowAction],
    requiresRoot: action.requiresRoot,
    supportsDryRun: task.supportsDryRun
  };
}

// build-resources/canva-linux/c420ui-adapter/adapter.ts
import fs15 from "node:fs";
import path16 from "node:path";

// build-resources/c420ui/src/terminal/logo.ts
var c420uiLogoLines = [
  "\u2584\u2584  \u2588 \u2588 \u2584\u2584\u2584 \u2584\u2580\u2584  \u2584 \u2584  \u2584",
  "\u2588   \u2580\u2584\u2588  \u2584\u2580 \u2588 \u2588  \u2588 \u2588  \u2588",
  "\u2580\u2580    \u2588 \u2588\u2584\u2584  \u2580   \u2580\u2584\u2580  \u2580"
];

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
import fs9 from "node:fs";
import path10 from "node:path";
import {
  execFileSync
} from "node:child_process";

// build-resources/canva-linux/project-root.ts
import fs3 from "node:fs";
import path5 from "node:path";
function isProjectRoot(dir) {
  return fs3.existsSync(path5.join(dir, "package.json")) && fs3.existsSync(path5.join(dir, "build-resources/canva-linux/config/actions.json")) && fs3.existsSync(path5.join(dir, "build-resources/canva-linux/config/project-ui.json"));
}
function scriptDirFromArgv() {
  const scriptPath = process.argv[1];
  if (!scriptPath) return null;
  return path5.dirname(path5.resolve(scriptPath));
}
function searchUpwards(startDir) {
  let current = path5.resolve(startDir);
  while (true) {
    if (isProjectRoot(current)) return current;
    const parent = path5.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function defaultRootSearchDir() {
  const fromEnv = process.env.CANVA_SCRIPT_REPO_ROOT;
  if (fromEnv) return path5.resolve(fromEnv);
  const fromScript = scriptDirFromArgv();
  if (fromScript) {
    const match = searchUpwards(fromScript);
    if (match) return match;
  }
  return path5.resolve(process.cwd());
}
function findCanvaLinuxProjectRoot(startDir = defaultRootSearchDir()) {
  const fromStart = searchUpwards(startDir);
  if (fromStart) return fromStart;
  return defaultRootSearchDir();
}

// build-resources/canva-linux/c420ui-adapter/detection/artifact-fragments.ts
import fs4 from "node:fs";
import path6 from "node:path";
var ARTIFACTS_CONFIG_PATH = "build-resources/canva-linux/config/artifacts.json";
var ARTIFACT_PATH_COLLATOR = new Intl.Collator(void 0, {
  numeric: true,
  sensitivity: "base"
});
var SUPPORTED_ARTIFACT_PATTERN_EXAMPLES = [
  "*.AppImage",
  "*.flatpak",
  "linux-unpacked",
  "*.tar.gz",
  "SHA256SUMS",
  ".deb",
  ".rpm",
  "PKGBUILD",
  "*.pkg.tar.*"
];
function readJsonFile(filePath) {
  return JSON.parse(fs4.readFileSync(filePath, "utf8"));
}
function readPackageVersion(rootDir) {
  return readJsonFile(path6.join(rootDir, "package.json")).version ?? "unknown";
}
function loadArtifactWorkflows(rootDir) {
  const configPath = path6.join(rootDir, ARTIFACTS_CONFIG_PATH);
  if (!fs4.existsSync(configPath)) return [];
  const config = readJsonFile(configPath);
  return Array.isArray(config.workflows) ? config.workflows : [];
}
function normalizeConfigPath(configPath) {
  return configPath.split(/[\\/]+/).filter(Boolean).join(path6.sep);
}
function resolveOutputPattern(outputPattern, version) {
  return normalizeConfigPath(outputPattern.replaceAll("${version}", version));
}
function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
function patternToRegExp(pattern) {
  const normalized = normalizeConfigPath(pattern);
  const source = normalized.split("*").map(escapeRegExp).join("[^\\/]*");
  return new RegExp(`^${source}$`);
}
function artifactKind(id, kind) {
  if (id === "linux-unpacked" || id.includes("linux-unpacked")) return "linux-unpacked";
  if (id === "release-checksums") return "sha256sums";
  return kind;
}
function candidatePathsForPattern(rootDir, outputPattern) {
  const resolvedPattern = normalizeConfigPath(outputPattern);
  if (!resolvedPattern.includes("*")) {
    const absolutePath = path6.join(rootDir, resolvedPattern);
    return fs4.existsSync(absolutePath) ? [absolutePath] : [];
  }
  const firstWildcard = resolvedPattern.indexOf("*");
  const scanRootRelative = path6.dirname(resolvedPattern.slice(0, firstWildcard));
  const scanRoot = path6.join(rootDir, scanRootRelative || ".");
  if (!fs4.existsSync(scanRoot)) return [];
  const matcher = patternToRegExp(resolvedPattern);
  const candidates = [];
  for (const entry of fs4.readdirSync(scanRoot, { withFileTypes: true })) {
    const absolutePath = path6.join(scanRoot, entry.name);
    const relativePath = normalizeConfigPath(path6.relative(rootDir, absolutePath));
    if (matcher.test(relativePath)) candidates.push(absolutePath);
  }
  return candidates.sort(ARTIFACT_PATH_COLLATOR.compare);
}
function readMetadataJson(filePath) {
  try {
    const raw = readJsonFile(filePath);
    return raw && typeof raw === "object" ? raw : void 0;
  } catch {
    return void 0;
  }
}
function firstMetadataVersion(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}
function normalizeMetadata(metadata) {
  if (!metadata) return {};
  const version = firstMetadataVersion(
    metadata.baseVersion,
    metadata.basePhase,
    metadata.version
  );
  const fullVersion = firstMetadataVersion(
    metadata.fullVersion,
    metadata.version,
    metadata.baseVersion,
    metadata.basePhase
  );
  const hash = metadata.canvaLinuxSourceHash?.trim();
  return {
    metadataFound: true,
    ...version ? { version } : {},
    ...fullVersion ? { fullVersion } : {},
    hash: hash || "unknown",
    hashKind: "canvaLinuxSourceHash"
  };
}
function readVersionSidecar(filePath) {
  const raw = fs4.readFileSync(filePath, "utf8").trim();
  return raw ? { version: raw, fullVersion: raw } : {};
}
function readArtifactPackageJsonVersion(artifactPath) {
  const packageJsonPath = path6.join(artifactPath, "package.json");
  if (!fs4.existsSync(packageJsonPath)) return {};
  const version = readJsonFile(packageJsonPath).version?.trim();
  return version ? { version, fullVersion: version } : {};
}
function readArtifactMetadata(rootDir, artifactPath, artifactKindValue) {
  const sidecars = [
    `${artifactPath}.build-metadata.json`,
    `${artifactPath}.version.json`,
    `${artifactPath}.version`
  ];
  for (const sidecar of sidecars) {
    if (!fs4.existsSync(sidecar)) continue;
    if (sidecar.endsWith(".json")) return normalizeMetadata(readMetadataJson(sidecar));
    return readVersionSidecar(sidecar);
  }
  if (fs4.existsSync(artifactPath) && fs4.statSync(artifactPath).isDirectory()) {
    const markers = [
      path6.join(artifactPath, "resources/config/canva-linux/build-metadata.json"),
      path6.join(artifactPath, "config/canva-linux/build-metadata.json"),
      ...artifactKindValue === "linux-unpacked" ? [
        path6.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json"),
        path6.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
      ] : []
    ];
    for (const marker of markers) {
      if (fs4.existsSync(marker)) return normalizeMetadata(readMetadataJson(marker));
    }
    return readArtifactPackageJsonVersion(artifactPath);
  }
  return {};
}
function inferVersionFromFilename(artifactPath, packageVersion) {
  const name = path6.basename(artifactPath);
  if (name.includes(packageVersion)) return packageVersion;
  const match = name.match(/^canva-linux-([0-9][^-]*(?:[-+.][A-Za-z0-9.]+)*)-/);
  return match?.[1];
}
function toRelativeArtifactPath(rootDir, artifactPath) {
  return normalizeConfigPath(path6.relative(rootDir, artifactPath));
}
function buildCanvaLinuxArtifactFragments(rootDir) {
  void SUPPORTED_ARTIFACT_PATTERN_EXAMPLES;
  const packageVersion = readPackageVersion(rootDir);
  const workflows = loadArtifactWorkflows(rootDir);
  const fragments = [];
  for (const workflow of workflows) {
    if (typeof workflow.id !== "string" || typeof workflow.kind !== "string" || typeof workflow.label !== "string") continue;
    if (typeof workflow.outputPattern !== "string") {
      fragments.push({
        id: workflow.id,
        kind: artifactKind(workflow.id, workflow.kind),
        label: workflow.label,
        detected: false
      });
      continue;
    }
    const outputPattern = resolveOutputPattern(workflow.outputPattern, packageVersion);
    const candidates = candidatePathsForPattern(rootDir, outputPattern);
    const artifactPath = candidates.at(-1);
    const detected = Boolean(artifactPath);
    const kind = artifactKind(workflow.id, workflow.kind);
    const metadata = artifactPath ? readArtifactMetadata(rootDir, artifactPath, kind) : {};
    const fallbackVersion = artifactPath && kind !== "linux-unpacked" ? inferVersionFromFilename(artifactPath, packageVersion) : void 0;
    const version = metadata.version ?? fallbackVersion;
    const hash = metadata.hash ?? (fallbackVersion ? "unknown" : void 0);
    fragments.push({
      id: workflow.id,
      kind,
      label: workflow.label,
      detected,
      ...artifactPath ? { path: toRelativeArtifactPath(rootDir, artifactPath) } : {},
      ...version ? { version } : {},
      ...metadata.fullVersion ? { fullVersion: metadata.fullVersion } : {},
      ...hash ? { hash, hashKind: metadata.hashKind ?? "canvaLinuxSourceHash" } : {}
    });
  }
  return fragments;
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
import fs6 from "node:fs";
import path7 from "node:path";

// build-resources/c420ui/operations/detection/version-marker.ts
import fs5 from "node:fs";
function readVersionFile(versionFile) {
  if (fs5.existsSync(versionFile)) {
    return fs5.readFileSync(versionFile, "utf8").trim();
  }
  return "";
}
function readPackageJsonVersion(packageFile) {
  if (!fs5.existsSync(packageFile)) return "";
  try {
    const pkg = JSON.parse(fs5.readFileSync(packageFile, "utf8"));
    return pkg.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataFullVersion(metadataFile) {
  if (!fs5.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs5.readFileSync(metadataFile, "utf8"));
    return m.fullVersion || m.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataBaseVersion(metadataFile) {
  if (!fs5.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs5.readFileSync(metadataFile, "utf8"));
    return m.baseVersion || m.basePhase || m.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataHash(metadataFile, field = "canvaLinuxSourceHash") {
  if (!fs5.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs5.readFileSync(metadataFile, "utf8"));
    return m[field] || "";
  } catch {
    return "";
  }
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
function detectAppImageArtifacts(rootDir) {
  const distDir = path7.join(rootDir, "dist");
  if (!fs6.existsSync(distDir)) return false;
  try {
    const files = fs6.readdirSync(distDir);
    return files.some((file) => file.endsWith(".AppImage"));
  } catch {
    return false;
  }
}
function findLatestAppImageArtifact(rootDir) {
  const distDir = path7.join(rootDir, "dist");
  if (!fs6.existsSync(distDir)) return "";
  try {
    const files = fs6.readdirSync(distDir).filter((file) => file.endsWith(".AppImage")).sort();
    const latest = files[files.length - 1];
    return latest ? path7.join("dist", latest) : "";
  } catch {
    return "";
  }
}
function findArtifactBuildMetadataMarker(artifactPath, rootDir) {
  if (!artifactPath) return "";
  const absoluteArtifactPath = path7.isAbsolute(artifactPath) ? artifactPath : path7.join(rootDir, artifactPath);
  const markers = [
    `${absoluteArtifactPath}.build-metadata.json`,
    `${absoluteArtifactPath}.version.json`,
    `${absoluteArtifactPath}.version`
  ];
  for (const marker of markers) {
    if (fs6.existsSync(marker)) return marker;
  }
  return "";
}
function detectAppImageVersion(rootDir) {
  const file = findLatestAppImageArtifact(rootDir);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir);
  let version = readBuildMetadataBaseVersion(metadata);
  if (version) return version;
  const findMetadataInDist = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs6.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path7.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  const distDir = path7.join(rootDir, "dist");
  if (fs6.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataBaseVersion(distMetadata);
    if (version) return version;
  }
  if (!file) return "";
  const name = path7.basename(file);
  const match = name.match(
    /^canva-linux-([0-9]+\.[0-9]+\.[0-9]+[-+.a-zA-Z0-9]*)-[^-]+\.AppImage$/
  );
  return match?.[1] ?? "";
}
function detectAppImageFullVersion(rootDir) {
  const file = findLatestAppImageArtifact(rootDir);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir);
  let version = readBuildMetadataFullVersion(metadata);
  if (version) return version;
  const findMetadataInDist = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs6.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path7.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  const distDir = path7.join(rootDir, "dist");
  if (fs6.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataFullVersion(distMetadata);
    if (version) return version;
  }
  return detectAppImageVersion(rootDir);
}
function detectAppImageHash(rootDir) {
  const file = findLatestAppImageArtifact(rootDir);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir);
  let hash = readBuildMetadataHash(metadata, "canvaLinuxSourceHash");
  if (hash) return hash;
  const findMetadataInDist = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs6.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path7.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  const distDir = path7.join(rootDir, "dist");
  if (fs6.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    hash = readBuildMetadataHash(distMetadata, "canvaLinuxSourceHash");
    if (hash) return hash;
  }
  return "";
}

// build-resources/c420ui/operations/detection/flatpak-detection.ts
import fs7 from "node:fs";
import path8 from "node:path";
import os from "node:os";
import { spawnSync as spawnSync2 } from "node:child_process";
var APP_ID = "io.github.coletivo420.canva-linux";
function detectFlatpakSystemInstall() {
  try {
    const result = spawnSync2("flatpak", ["--system", "info", APP_ID], {
      stdio: "ignore"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
function detectFlatpakUserInstall() {
  try {
    const result = spawnSync2("flatpak", ["--user", "info", APP_ID], {
      stdio: "ignore"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
function findFlatpakVersionMarker(scopeRoot) {
  const markerBase = `app/${APP_ID}/current/active/files/share/canva-linux/version`;
  const directPath = path8.join(scopeRoot, markerBase);
  if (fs7.existsSync(directPath)) return directPath;
  const appDir = path8.join(scopeRoot, `app/${APP_ID}`);
  if (!fs7.existsSync(appDir)) return "";
  const findVersionMarker = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs7.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path8.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findVersionMarker(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/active/files/share/canva-linux/version")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  return findVersionMarker(appDir, 0);
}
function readFlatpakVersionMarkerKey(markerFile, key) {
  if (!fs7.existsSync(markerFile)) return "";
  try {
    const raw = fs7.readFileSync(markerFile, "utf8").trim();
    if (!raw) return "";
    if (raw.includes(`"${key}"`)) {
      const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
      if (match) return match[1] ?? "";
    }
  } catch {
  }
  return "";
}
function readFlatpakVersionMarker(markerFile) {
  if (!fs7.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "version");
  if (version) return version;
  try {
    return fs7.readFileSync(markerFile, "utf8").split("\n")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}
function readFlatpakFullVersionMarker(markerFile) {
  if (!fs7.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "fullVersion");
  if (version) return version;
  return readFlatpakVersionMarker(markerFile);
}
function detectFlatpakSystemVersion() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;
  try {
    const result = spawnSync2(
      "flatpak",
      ["--system", "info", APP_ID, "--show-version"],
      { encoding: "utf8" }
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}
function detectFlatpakUserVersion() {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path8.join(home, ".local/share/flatpak")
  );
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;
  try {
    const result = spawnSync2(
      "flatpak",
      ["--user", "info", APP_ID, "--show-version"],
      { encoding: "utf8" }
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}
function detectFlatpakSystemFullVersion() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;
  return detectFlatpakSystemVersion();
}
function detectFlatpakUserFullVersion() {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path8.join(home, ".local/share/flatpak")
  );
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;
  return detectFlatpakUserVersion();
}
function readFlatpakHashMarker(markerFile) {
  return readFlatpakVersionMarkerKey(markerFile, "canvaLinuxSourceHash");
}
function detectFlatpakSystemHash() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  return readFlatpakHashMarker(marker);
}
function detectFlatpakUserHash() {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path8.join(home, ".local/share/flatpak")
  );
  return readFlatpakHashMarker(marker);
}

// build-resources/c420ui/operations/detection/native-detection.ts
import fs8 from "node:fs";
import path9 from "node:path";
import os2 from "node:os";
var APP_EXECUTABLE = "canva-linux";
var APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";
function detectNativeSystemInstall() {
  return fs8.existsSync("/opt/canva-linux") || fs8.existsSync(`/usr/local/bin/${APP_EXECUTABLE}`) || fs8.existsSync(`/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`);
}
function detectNativeUserInstall() {
  const home = os2.homedir();
  return fs8.existsSync(path9.join(home, ".local/opt/canva-linux")) || fs8.existsSync(path9.join(home, `.local/bin/${APP_EXECUTABLE}`)) || fs8.existsSync(
    path9.join(home, `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`)
  );
}
function detectNativeSystemVersion() {
  let version = readBuildMetadataBaseVersion(
    "/opt/canva-linux/config/canva-linux/build-metadata.json"
  );
  if (version) return version;
  version = readVersionFile("/opt/canva-linux/CANVA_LINUX_VERSION");
  if (version) return version;
  return readPackageJsonVersion("/opt/canva-linux/package.json");
}
function detectNativeUserVersion() {
  const home = os2.homedir();
  let version = readBuildMetadataBaseVersion(
    path9.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json")
  );
  if (version) return version;
  version = readVersionFile(
    path9.join(home, ".local/opt/canva-linux/CANVA_LINUX_VERSION")
  );
  if (version) return version;
  return readPackageJsonVersion(
    path9.join(home, ".local/opt/canva-linux/package.json")
  );
}
function detectNativeSystemFullVersion() {
  const version = readBuildMetadataFullVersion(
    "/opt/canva-linux/config/canva-linux/build-metadata.json"
  );
  if (version) return version;
  return detectNativeSystemVersion();
}
function detectNativeUserFullVersion() {
  const home = os2.homedir();
  const version = readBuildMetadataFullVersion(
    path9.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json")
  );
  if (version) return version;
  return detectNativeUserVersion();
}
function detectNativeSystemHash() {
  return readBuildMetadataHash(
    "/opt/canva-linux/config/canva-linux/build-metadata.json",
    "canvaLinuxSourceHash"
  );
}
function detectNativeUserHash() {
  const home = os2.homedir();
  return readBuildMetadataHash(
    path9.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json"),
    "canvaLinuxSourceHash"
  );
}

// build-resources/c420ui/operations/detection/install-detection.ts
function detectInstallations(rootDir) {
  return {
    DETECTED_NATIVE_SYSTEM: detectNativeSystemInstall(),
    DETECTED_NATIVE_USER: detectNativeUserInstall(),
    DETECTED_FLATPAK_SYSTEM: detectFlatpakSystemInstall(),
    DETECTED_FLATPAK_USER: detectFlatpakUserInstall(),
    DETECTED_APPIMAGE_ARTIFACTS: detectAppImageArtifacts(rootDir),
    DETECTED_NATIVE_SYSTEM_VERSION: detectNativeSystemVersion(),
    DETECTED_NATIVE_USER_VERSION: detectNativeUserVersion(),
    DETECTED_FLATPAK_SYSTEM_VERSION: detectFlatpakSystemVersion(),
    DETECTED_FLATPAK_USER_VERSION: detectFlatpakUserVersion(),
    DETECTED_APPIMAGE_VERSION: detectAppImageVersion(rootDir),
    DETECTED_NATIVE_SYSTEM_FULL_VERSION: detectNativeSystemFullVersion(),
    DETECTED_NATIVE_USER_FULL_VERSION: detectNativeUserFullVersion(),
    DETECTED_FLATPAK_SYSTEM_FULL_VERSION: detectFlatpakSystemFullVersion(),
    DETECTED_FLATPAK_USER_FULL_VERSION: detectFlatpakUserFullVersion(),
    DETECTED_APPIMAGE_FULL_VERSION: detectAppImageFullVersion(rootDir),
    DETECTED_NATIVE_SYSTEM_HASH: detectNativeSystemHash(),
    DETECTED_NATIVE_USER_HASH: detectNativeUserHash(),
    DETECTED_FLATPAK_SYSTEM_HASH: detectFlatpakSystemHash(),
    DETECTED_FLATPAK_USER_HASH: detectFlatpakUserHash(),
    DETECTED_APPIMAGE_HASH: detectAppImageHash(rootDir)
  };
}

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
var cachedPackageJson;
function readPackage(rootDir) {
  if (cachedPackageJson?.rootDir === rootDir) {
    return cachedPackageJson.packageJson;
  }
  const packageJson = JSON.parse(
    fs9.readFileSync(path10.join(rootDir, "package.json"), "utf8")
  );
  cachedPackageJson = {
    rootDir,
    packageJson
  };
  return packageJson;
}
function readPackageDependencyVersion(rootDir, name) {
  const packageJson = readPackage(rootDir);
  return packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
}
function normalizeSemverRange(range) {
  if (!range) return void 0;
  return range.replace(/[\^~><=]/g, "").split(" ")[0];
}
function readNodeVersion(rootDir) {
  const packageJson = readPackage(rootDir);
  return normalizeSemverRange(packageJson.engines?.node) ?? process.versions.node;
}
var readNpmVersion = /* @__PURE__ */ (() => {
  let cached;
  let attempted = false;
  return () => {
    if (attempted) {
      return cached;
    }
    attempted = true;
    try {
      cached = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
      return cached;
    } catch {
      return void 0;
    }
  };
})();
var emptyInstallations = {
  nativeSystem: false,
  nativeUser: false,
  flatpakSystem: false,
  flatpakUser: false,
  appImageArtifacts: false,
  nativeSystemVersion: "",
  nativeUserVersion: "",
  flatpakSystemVersion: "",
  flatpakUserVersion: "",
  appImageVersion: "",
  nativeSystemFullVersion: "",
  nativeUserFullVersion: "",
  flatpakSystemFullVersion: "",
  flatpakUserFullVersion: "",
  appImageFullVersion: "",
  nativeSystemHash: "",
  nativeUserHash: "",
  flatpakSystemHash: "",
  flatpakUserHash: "",
  appImageHash: ""
};
function readPhase(rootDir) {
  const projectUiPath = path10.join(rootDir, "build-resources/canva-linux/config/project-ui.json");
  try {
    if (!fs9.existsSync(projectUiPath)) return "unknown";
    const projectUi = JSON.parse(fs9.readFileSync(projectUiPath, "utf8"));
    return projectUi.phase ?? "unknown";
  } catch {
    return "unknown";
  }
}
function safeProjectMetadata(rootDir) {
  let version = "unknown";
  let phase = "unknown";
  try {
    version = readPackage(rootDir).version || "unknown";
  } catch {
    version = "unknown";
  }
  try {
    phase = readPhase(rootDir);
  } catch {
    phase = "unknown";
  }
  return {
    version,
    phase,
    appId: "io.github.coletivo420.canva-linux",
    executable: "canva-linux",
    repository: "https://github.com/coletivo420/canva-linux"
  };
}
function buildInstallations(values, artifactFragments = []) {
  const appImageFragment = artifactFragments.find(
    (fragment) => fragment.kind === "appimage" || fragment.id.includes("appimage")
  );
  return {
    nativeSystem: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_SYSTEM),
    nativeUser: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_USER),
    flatpakSystem: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_SYSTEM),
    flatpakUser: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_USER),
    appImageArtifacts: appImageFragment?.detected ?? boolFromC420UIDetectionValue(values.DETECTED_APPIMAGE_ARTIFACTS),
    nativeSystemVersion: values.DETECTED_NATIVE_SYSTEM_VERSION || "",
    nativeUserVersion: values.DETECTED_NATIVE_USER_VERSION || "",
    flatpakSystemVersion: values.DETECTED_FLATPAK_SYSTEM_VERSION || "",
    flatpakUserVersion: values.DETECTED_FLATPAK_USER_VERSION || "",
    appImageVersion: appImageFragment?.version || values.DETECTED_APPIMAGE_VERSION || "",
    // Detected Installations renderers should prefer *FullVersion fields and
    // fall back to the base *Version fields for older detectors/markers.
    nativeSystemFullVersion: values.DETECTED_NATIVE_SYSTEM_FULL_VERSION || values.DETECTED_NATIVE_SYSTEM_VERSION || "",
    nativeUserFullVersion: values.DETECTED_NATIVE_USER_FULL_VERSION || values.DETECTED_NATIVE_USER_VERSION || "",
    flatpakSystemFullVersion: values.DETECTED_FLATPAK_SYSTEM_FULL_VERSION || values.DETECTED_FLATPAK_SYSTEM_VERSION || "",
    flatpakUserFullVersion: values.DETECTED_FLATPAK_USER_FULL_VERSION || values.DETECTED_FLATPAK_USER_VERSION || "",
    appImageFullVersion: appImageFragment?.fullVersion || appImageFragment?.version || values.DETECTED_APPIMAGE_FULL_VERSION || values.DETECTED_APPIMAGE_VERSION || "",
    nativeSystemHash: values.DETECTED_NATIVE_SYSTEM_HASH || "",
    nativeUserHash: values.DETECTED_NATIVE_USER_HASH || "",
    flatpakSystemHash: values.DETECTED_FLATPAK_SYSTEM_HASH || "",
    flatpakUserHash: values.DETECTED_FLATPAK_USER_HASH || "",
    appImageHash: appImageFragment?.hash || values.DETECTED_APPIMAGE_HASH || "",
    nativeSystemHashKind: "canvaLinuxSourceHash",
    nativeUserHashKind: "canvaLinuxSourceHash",
    flatpakSystemHashKind: "canvaLinuxSourceHash",
    flatpakUserHashKind: "canvaLinuxSourceHash",
    appImageHashKind: "canvaLinuxSourceHash"
  };
}
function createCanvaLinuxDetectionProvider(options = {}) {
  const detect = options.detectInstallations ?? detectInstallations;
  return {
    id: "canva-linux-detection-provider",
    label: "Canva Linux detection provider",
    buildOverviewStatus(rootDir) {
      const project = safeProjectMetadata(rootDir);
      const warnings = [];
      let values = {};
      try {
        const result = detect(rootDir);
        for (const [key, value] of Object.entries(result)) {
          values[key] = String(value);
        }
      } catch (error) {
        warnings.push(
          `Installation detection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const artifactFragments = buildCanvaLinuxArtifactFragments(rootDir);
      return {
        project,
        runtime: {
          electronVersion: normalizeSemverRange(
            readPackageDependencyVersion(rootDir, "electron")
          ) ?? "unknown",
          nodeVersion: readNodeVersion(rootDir),
          npmVersion: readNpmVersion() ?? "unknown"
        },
        installations: {
          ...emptyInstallations,
          ...buildInstallations(values, artifactFragments)
        },
        artifactFragments,
        warnings
      };
    }
  };
}
function buildCanvaLinuxOverviewStatus(rootDir = findCanvaLinuxProjectRoot()) {
  return createCanvaLinuxDetectionProvider().buildOverviewStatus(rootDir);
}

// build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts
import { execFileSync as execFileSync2 } from "node:child_process";
import fs11 from "node:fs";
import path12 from "node:path";

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
import fs10 from "node:fs";
import path11 from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
var UNKNOWN_BASE_VERSION = "0.0.0";
var UNKNOWN_DISPLAY_VERSION = "0.0.0";
var UNKNOWN_BUILD_REVISION = "unknown";
var UNKNOWN_SOURCE_HASH = "unknown";
var RUNTIME_DIR = path11.dirname(fileURLToPath(import.meta.url));
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
function readJsonFile2(filePath) {
  try {
    return JSON.parse(fs10.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function candidateMetadataPaths() {
  const cwd = process.cwd();
  return [
    path11.join(cwd, ".build", "canva-linux", "build-metadata.effective.json"),
    path11.join(cwd, "build-resources", "canva-linux", "config", "build-metadata.json"),
    path11.join(RUNTIME_DIR, "..", "..", ".build", "canva-linux", "build-metadata.effective.json"),
    path11.join(RUNTIME_DIR, "..", "..", "build-resources", "canva-linux", "config", "build-metadata.json"),
    path11.join(RUNTIME_DIR, "..", ".build", "canva-linux", "build-metadata.effective.json"),
    path11.join(RUNTIME_DIR, "..", "build-resources", "canva-linux", "config", "build-metadata.json")
  ];
}
function fallbackBaseMetadata() {
  const packageJson = readJsonFile2(path11.join(process.cwd(), "package.json")) ?? {};
  const projectUi = readJsonFile2(
    path11.join(
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
    const metadata = readJsonFile2(filePath);
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
function readJsonFile3(filePath) {
  try {
    return JSON.parse(fs11.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir) {
  return fs11.existsSync(path12.join(rootDir, ".git"));
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
    const value = execFileSync2("git", ["rev-parse", "--short=7", "HEAD"], {
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
  const packageJson = readJsonFile3(path12.join(rootDir, "package.json"));
  const projectUi = readJsonFile3(
    path12.join(rootDir, "build-resources", "canva-linux", "config", "project-ui.json")
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
  const metadata = readJsonFile3(
    path12.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function loadEffectiveFileMetadata(rootDir, metadataModule) {
  const metadata = readJsonFile3(
    path12.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json")
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
function missingBuildMetadataError() {
  return new Error("Missing Canva Linux build metadata. Run npm run build:metadata.");
}
function loadEffectiveBuildMetadata(rootDir, options = {}) {
  const resolvedRootDir = path12.resolve(rootDir);
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
  const packaged = loadPackagedMetadata(resolvedRootDir, metadataModule);
  if (packaged) return packaged;
  if (options.allowFallback) {
    return fallbackEffectiveBuildMetadata(resolvedRootDir, metadataModule);
  }
  throw missingBuildMetadataError();
}

// build-resources/canva-linux/c420ui-adapter/artifacts.ts
import fs13 from "node:fs";
import path14 from "node:path";

// build-resources/canva-linux/actions/registry.ts
import fs12 from "node:fs";
import path13 from "node:path";
var ACTION_GROUPS = ["install", "development", "maintenance"];
var ACTION_SECTIONS = [
  "Install",
  "Package generation",
  "Build",
  "Validation",
  "Maintenance",
  "Uninstall"
];
var ACTION_KINDS = ["command", "planned"];
var INSTALL_SCOPES = ["system", "user"];
var cachedRoot = null;
var cachedActions = null;
function findProjectRoot(startDir) {
  return findCanvaLinuxProjectRoot(startDir);
}
function actionsPath(rootDir = findProjectRoot()) {
  return path13.join(rootDir, "build-resources/canva-linux/config/actions.json");
}
function validateCanvaLinuxGroupSection(action) {
  if (action.group === "install" && action.section !== "Install") {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
  if (action.group === "development" && !["Package generation", "Build", "Validation"].includes(action.section)) {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
  if (action.group === "maintenance" && !["Maintenance", "Uninstall"].includes(action.section)) {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
}
function validateCanvaLinuxActions(actions) {
  validateC420UIActionRegistry(actions, {
    allowedGroups: ACTION_GROUPS,
    allowedSections: ACTION_SECTIONS,
    allowedKinds: ACTION_KINDS,
    allowedScopes: INSTALL_SCOPES
  });
  for (const action of actions) {
    validateCanvaLinuxGroupSection(action);
  }
}
function loadCanvaLinuxActionRegistry(rootDir = findProjectRoot()) {
  const resolvedRoot = path13.resolve(rootDir);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(
    fs12.readFileSync(actionsPath(resolvedRoot), "utf8")
  );
  validateCanvaLinuxActions(actions);
  cachedRoot = resolvedRoot;
  cachedActions = actions;
  return actions;
}
function loadCanvaLinuxActions(rootDir = findProjectRoot()) {
  return loadCanvaLinuxActionRegistry(rootDir);
}

// build-resources/canva-linux/c420ui-adapter/actions.ts
function actionPhase(action) {
  if (action.phase) return action.phase;
  if (action.group === "install") return "install";
  if (action.group === "maintenance") return void 0;
  return void 0;
}
function toC420UIActionDescriptor(action) {
  const isCommandAction = action.kind === "command";
  const kind = isCommandAction ? "command" : "planned";
  return {
    ...action,
    kind,
    phase: actionPhase(action),
    cliFlags: action.cli
  };
}
function loadCanvaLinuxC420UIActions(rootDir) {
  return loadCanvaLinuxActions(rootDir).map(toC420UIActionDescriptor);
}

// build-resources/canva-linux/c420ui-adapter/artifacts.ts
var ARTIFACTS_CONFIG_PATH2 = "build-resources/canva-linux/config/artifacts.json";
function readJsonFile4(filePath) {
  if (!fs13.existsSync(filePath)) {
    throw new Error(`Missing Canva Linux configuration file: ${filePath}`);
  }
  try {
    return JSON.parse(fs13.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse configuration file ${filePath}: ${message}`);
  }
}
var cachedArtifactsConfig = null;
var cachedArtifactsConfigPath = null;
function loadArtifactsConfig(rootDir) {
  const configPath = path14.join(rootDir, ARTIFACTS_CONFIG_PATH2);
  if (cachedArtifactsConfig && cachedArtifactsConfigPath === configPath) {
    return cachedArtifactsConfig;
  }
  const config = readJsonFile4(configPath);
  cachedArtifactsConfig = validateC420UIArtifactRecipeConfig(config, configPath);
  cachedArtifactsConfigPath = configPath;
  return cachedArtifactsConfig;
}
function loadCanvaLinuxCapabilities(rootDir = process.env.CANVA_SCRIPT_REPO_ROOT ?? process.cwd()) {
  return { ...loadArtifactsConfig(rootDir).capabilities };
}
function loadCanvaLinuxArtifactWorkflows(rootDir, version) {
  const config = loadArtifactsConfig(rootDir);
  validateC420UIArtifactWorkflowsAgainstActions(
    config.workflows,
    loadCanvaLinuxC420UIActions(rootDir)
  );
  return config.workflows.map((workflow) => ({
    ...workflow,
    outputPattern: workflow.outputPattern ? resolveC420UIArtifactOutputPattern(workflow.outputPattern, { version }) : void 0
  }));
}

// build-resources/canva-linux/c420ui-adapter/development.ts
import fs14 from "node:fs";
import path15 from "node:path";
function readJsonFile5(filePath) {
  return JSON.parse(fs14.readFileSync(filePath, "utf8"));
}
function loadCanvaLinuxDevelopmentTasks(rootDir) {
  const developmentConfigPath = path15.join(
    rootDir,
    "build-resources/canva-linux/config/development.json"
  );
  const config = readJsonFile5(developmentConfigPath);
  validateC420UIDevelopmentConfig(config);
  return config.tasks;
}
function validateCanvaLinuxDevelopmentTasksAgainstActions(tasks, actions) {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const task of tasks) {
    const action = actionsById.get(task.actionId);
    if (!action) {
      throw new Error(`Development task ${task.id} references unknown actionId ${task.actionId}`);
    }
    createC420UIDevelopmentWorkflowFromAction(task, action);
  }
}
function loadCanvaLinuxDevelopmentWorkflows(rootDir, actions = loadCanvaLinuxC420UIActions(rootDir)) {
  const tasks = loadCanvaLinuxDevelopmentTasks(rootDir);
  validateCanvaLinuxDevelopmentTasksAgainstActions(tasks, actions);
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  return tasks.map((task) => {
    const action = actionsById.get(task.actionId);
    if (!action) {
      throw new Error(`Development task ${task.id} references unknown actionId ${task.actionId}`);
    }
    return createC420UIDevelopmentWorkflowFromAction(task, action);
  });
}

// build-resources/canva-linux/c420ui-adapter/adapter.ts
function readJsonFile6(filePath) {
  return JSON.parse(fs15.readFileSync(filePath, "utf8"));
}
function stateHome() {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) return xdgStateHome;
  return path16.join(process.env.HOME || ".", ".local/state");
}
function createCanvaLinuxC420UIAdapter(rootDir) {
  const resolvedRootDir = path16.resolve(rootDir);
  const projectUiPath = path16.join(resolvedRootDir, "build-resources/canva-linux/config/project-ui.json");
  const packageJsonPath = path16.join(resolvedRootDir, "package.json");
  const actionsJsonPath = path16.join(resolvedRootDir, "build-resources/canva-linux/config/actions.json");
  const artifactsJsonPath = path16.join(resolvedRootDir, "build-resources/canva-linux/config/artifacts.json");
  const buildMetadataPath = path16.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/build-metadata.json"
  );
  const c420uiPackageJsonPath = path16.join(
    resolvedRootDir,
    "build-resources/c420ui/package.json"
  );
  const hostDependenciesJsonPath = path16.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/host-dependencies.json"
  );
  const maintenanceJsonPath = path16.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/maintenance.json"
  );
  function loadProjectUi() {
    return readJsonFile6(projectUiPath);
  }
  function loadPackageJson() {
    return readJsonFile6(packageJsonPath);
  }
  function loadBuildMetadata() {
    return loadEffectiveBuildMetadata(resolvedRootDir);
  }
  function loadC420UIPackageJson() {
    return readJsonFile6(c420uiPackageJsonPath);
  }
  function loadHostDependencies() {
    const config = readJsonFile6(hostDependenciesJsonPath);
    return validateC420UIHostDependencyConfig(config);
  }
  function loadMaintenanceConfig() {
    const config = readJsonFile6(maintenanceJsonPath);
    return validateC420UIMaintenanceConfig(config);
  }
  function getPackageVersion() {
    return loadPackageJson().version ?? "unknown";
  }
  function getEffectiveProjectDisplayVersion() {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.displayVersion) return buildMetadata.displayVersion;
    const projectUi = loadProjectUi();
    if (projectUi.displayVersion) return projectUi.displayVersion;
    return getPackageVersion();
  }
  function getEffectiveProjectPhase() {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.phase) return buildMetadata.phase;
    const projectUi = loadProjectUi();
    if (projectUi.phase) return projectUi.phase;
    return "unknown";
  }
  function getEffectiveProjectFullVersion() {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.fullVersion) return buildMetadata.fullVersion;
    if (buildMetadata.version) return buildMetadata.version;
    return getPackageVersion();
  }
  function getEffectiveProjectBuildRevision() {
    return loadBuildMetadata().buildRevision || "unknown";
  }
  function getEffectiveProjectSourceHash() {
    return loadBuildMetadata().canvaLinuxSourceHash || "unknown";
  }
  function getEffectiveProjectCombinedSourceHash() {
    return loadBuildMetadata().combinedSourceHash || "unknown";
  }
  function loadProjectConfig() {
    const projectUi = loadProjectUi();
    return {
      projectName: projectUi.projectName,
      projectSubtitle: projectUi.projectSubtitle,
      displayVersion: getEffectiveProjectDisplayVersion(),
      phase: getEffectiveProjectPhase(),
      fullVersion: getEffectiveProjectFullVersion(),
      buildRevision: getEffectiveProjectBuildRevision(),
      hash: getEffectiveProjectSourceHash(),
      hashKind: "canvaLinuxSourceHash",
      combinedHash: getEffectiveProjectCombinedSourceHash(),
      combinedHashKind: "combinedSourceHash",
      status: projectUi.status,
      logoLines: [...projectUi.logoLines],
      appId: projectUi.appId,
      executableName: projectUi.executableName,
      repositoryUrl: projectUi.repositoryUrl,
      launcherCommand: projectUi.launcherCommand,
      stateDirectoryName: projectUi.stateDirectoryName
    };
  }
  function loadBrandConfig() {
    return {
      name: "c420ui",
      version: loadC420UIPackageJson().version ?? "unknown",
      hash: loadBuildMetadata().c420uiSourceHash || "unknown",
      hashKind: "c420uiSourceHash",
      logoLines: [...c420uiLogoLines]
    };
  }
  function getSessionLogPath() {
    const fromEnv = process.env.CANVA_TOOL_SESSION_LOG?.trim();
    if (fromEnv) return fromEnv;
    return path16.join(
      stateHome(),
      loadProjectUi().stateDirectoryName,
      "tool-session.log"
    );
  }
  function getSessionId() {
    return process.env.CANVA_TOOL_SESSION_ID?.trim() || "";
  }
  function getToolSettingsPath() {
    return toolSettingsPath(loadProjectUi().stateDirectoryName);
  }
  function loadCanvaLinuxActions2() {
    if (!fs15.existsSync(actionsJsonPath)) {
      throw new Error(`Missing Canva Linux actions registry: ${actionsJsonPath}`);
    }
    return loadCanvaLinuxC420UIActions(resolvedRootDir);
  }
  function loadArtifactWorkflows2() {
    return loadCanvaLinuxArtifactWorkflows(
      resolvedRootDir,
      getPackageVersion()
    );
  }
  function loadWorkflows() {
    return loadCanvaLinuxDevelopmentWorkflows(resolvedRootDir);
  }
  function projectInfo() {
    const project = loadProjectConfig();
    return {
      projectName: project.projectName,
      projectSubtitle: project.projectSubtitle,
      displayVersion: project.fullVersion ?? getEffectiveProjectFullVersion(),
      phase: project.phase,
      fullVersion: project.fullVersion,
      buildRevision: project.buildRevision,
      status: project.status,
      appId: project.appId,
      repositoryUrl: project.repositoryUrl
    };
  }
  function actions() {
    return loadCanvaLinuxActions2();
  }
  function artifactWorkflows() {
    return loadArtifactWorkflows2();
  }
  function overviewStatus() {
    return buildCanvaLinuxOverviewStatus(resolvedRootDir);
  }
  async function runAction(actionId, context) {
    const action = loadCanvaLinuxActions2().find((item) => item.id === actionId);
    if (!action) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`
      };
    }
    if (!action.command) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `${actionId} has no command`
      };
    }
    if (context.signal?.aborted) {
      context.emitProgress({ state: "canceled", percent: 0, label: action.label });
      return {
        code: c420uiExitCodes.canceled,
        status: "canceled",
        message: "Action canceled before start."
      };
    }
    return runC420UICommand({
      command: action.command,
      args: action.args ?? [],
      cwd: resolvedRootDir,
      env: context.env,
      label: action.label,
      signal: context.signal,
      emitLog: context.emitLog,
      emitProgress: context.emitProgress
    });
  }
  function toC420UIConfig() {
    const projectUi = loadProjectUi();
    return {
      rootDir: resolvedRootDir,
      title: projectUi.c420uiTitle,
      brand: loadBrandConfig(),
      project: loadProjectConfig(),
      releaseNotes: projectUi.versionReleaseNotes,
      sessionLogPath: getSessionLogPath(),
      sessionId: getSessionId(),
      hostDependencies: loadHostDependencies(),
      maintenance: loadMaintenanceConfig()
    };
  }
  const adapter = {
    id: "canva-linux",
    rootDir: resolvedRootDir,
    projectInfo,
    actions,
    artifactWorkflows,
    runAction,
    overviewStatus,
    hostDependencies: loadHostDependencies,
    maintenance: loadMaintenanceConfig,
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      artifactsJson: artifactsJsonPath,
      buildMetadata: buildMetadataPath,
      c420uiPackageJson: c420uiPackageJsonPath,
      hostDependenciesJson: hostDependenciesJsonPath,
      maintenanceJson: maintenanceJsonPath
    },
    loadProjectInfo: loadProjectConfig,
    loadConfig: toC420UIConfig,
    loadProjectUi,
    loadPackageJson,
    loadBuildMetadata,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions2,
    loadArtifactWorkflows: loadArtifactWorkflows2,
    loadWorkflows,
    loadCapabilities: () => loadCanvaLinuxCapabilities(resolvedRootDir),
    getEffectiveProjectDisplayVersion,
    getEffectiveProjectPhase,
    getEffectiveProjectFullVersion,
    getEffectiveProjectBuildRevision,
    getSessionLogPath,
    getSessionId,
    getToolSettingsPath,
    toC420UIConfig,
    loadHostDependencies,
    loadMaintenanceConfig
  };
  return createC420UIBridge(adapter);
}

// build-resources/canva-linux/c420ui-adapter/root-provider.ts
var conditionalSystemRootActionIds = /* @__PURE__ */ new Set([
  "purge",
  "uninstall-detected"
]);
function buildCanvaLinuxRootActionEnvironment(action, baseEnv) {
  const env = {
    ...baseEnv,
    ...action.env || {}
  };
  if (env.CANVA_NATIVE_SCOPE === "user" || env.CANVA_FLATPAK_SCOPE === "user") {
    env.C420UI_ACTION_SCOPE = "user";
  } else if (env.CANVA_NATIVE_SCOPE === "system" || env.CANVA_FLATPAK_SCOPE === "system" || action.scope === "system") {
    env.C420UI_ACTION_SCOPE = "system";
  } else if (action.scope) {
    env.C420UI_ACTION_SCOPE = action.scope;
  }
  return env;
}
function hasCanvaLinuxUserScope(action, actionEnv) {
  return isC420UIUserScope(action.scope) || actionEnv.CANVA_NATIVE_SCOPE === "user" || actionEnv.CANVA_FLATPAK_SCOPE === "user";
}
function createCanvaLinuxRootProvider(options = {}) {
  const base = createC420UILinuxRootProviderBase({
    id: "canva-linux-root-provider",
    label: "Canva Linux root provider",
    sudoCommand: "sudo",
    rootAuthEnvKey: "C420UI_ROOT_AUTH",
    rootAuthEnvValue: "1",
    runCommand: options.runCommand,
    buildActionEnvironment: buildCanvaLinuxRootActionEnvironment,
    actionHasUserScope: hasCanvaLinuxUserScope
  });
  return {
    ...base,
    resolveRootPolicy(action, rootDir, actionEnv) {
      void actionEnv;
      if (action.requiresRoot === true) {
        return { requiresRoot: true, reason: `${action.id}: requiresRoot=true` };
      }
      if (conditionalSystemRootActionIds.has(action.id)) {
        try {
          const status = buildCanvaLinuxOverviewStatus(rootDir);
          if (status.installations.nativeSystem || status.installations.flatpakSystem) {
            return {
              requiresRoot: true,
              reason: `${action.id}: detected system installation`
            };
          }
          if (status.warnings.length) {
            return {
              requiresRoot: false,
              warning: `[warn] Unable to detect system installations for root policy: ${status.warnings.join("; ")}`
            };
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            requiresRoot: false,
            warning: `[warn] Unable to detect system installations for root policy: ${message}`
          };
        }
      }
      return { requiresRoot: false };
    }
  };
}

// build-resources/canva-linux/c420ui-adapter/bridge.ts
function createCanvaLinuxBridge(rootDir = process.cwd()) {
  return createCanvaLinuxC420UIAdapter(rootDir);
}

// build-resources/canva-linux/c420ui-adapter/cli.ts
function emitDirectCliEvent(event) {
  if (event.type !== "log") return;
  const line = `${event.line}
`;
  if (event.source === "stderr") {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}
async function runCanvaLinuxC420UICli(argv) {
  const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  const bridge = createCanvaLinuxBridge(rootDir);
  const result = await runC420UICli({
    bridge,
    rootDir,
    argv,
    env: process.env,
    rootProvider: createCanvaLinuxRootProvider(),
    emit: emitDirectCliEvent,
    writeStdout: (line) => process.stdout.write(`${line}
`),
    writeStderr: (line) => process.stderr.write(`${line}
`)
  });
  return result.exitCode;
}

// build-resources/c420ui/scripts/run-c420ui-cli.ts
runCanvaLinuxC420UICli(process.argv.slice(2)).then((code) => {
  process.exit(code);
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
