#!/usr/bin/env node

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
function defaultC420UILinuxRootValidationCommand(sudoHelperPath) {
  return { command: "bash", args: [sudoHelperPath, "--validate"] };
}
function defaultC420UILinuxRootValidationStdinCommand(sudoHelperPath) {
  return { command: "bash", args: [sudoHelperPath, "--validate-stdin"] };
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
        options.sudoHelperPath
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
        options.sudoHelperPath
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

// build-resources/c420ui/src/actions.ts
var c420uiActionKinds = ["command", "planned", "internal"];
function getC420UIActionCliFlags(action) {
  const legacyCli = action.cli ?? [];
  return [...action.cliFlags ?? [], ...legacyCli];
}
function isC420UIPlannedAction(action) {
  return action.kind === "planned" || action.planned === true;
}
function requiresC420UIActionConfirmation(action) {
  return action.dangerous === true || action.requiresConfirmation === true;
}
function assertC420UIActionContract(action) {
  if (!action.id.trim()) throw new Error("c420ui action id is required");
  if (!action.label.trim()) throw new Error(`${action.id}: label is required`);
}
function isRecord(value) {
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
  if (!isRecord(action.env)) {
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
    if (!isRecord(item)) throw new Error("Action entries must be objects");
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

// build-resources/c420ui/src/exit-codes.ts
var c420uiExitCodes = {
  success: 0,
  generalError: 1,
  invalidUsage: 64,
  rootPolicyError: 64,
  plannedAction: 78,
  canceled: 130
};

// build-resources/c420ui/src/action-engine.ts
function createC420UIActionEngine(options) {
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
    const dryRun = runOptions.dryRun === true;
    const yes = runOptions.yes === true;
    if (dryRun) {
      emit?.(
        createC420UIEvent({
          type: "action:start",
          actionId: action.id,
          message: action.label,
          data: { dryRun }
        })
      );
      const result2 = {
        code: c420uiExitCodes.success,
        status: "success",
        message: "dry-run"
      };
      emit?.(
        createC420UIEvent({
          type: "action:finish",
          actionId: action.id,
          message: action.label,
          data: { exitCode: result2.code, status: result2.status }
        })
      );
      return result2;
    }
    if (isC420UIPlannedAction(action)) {
      emit?.(
        createC420UIEvent({
          type: "action:planned",
          actionId: action.id,
          message: action.description ?? action.label
        })
      );
      return {
        code: c420uiExitCodes.plannedAction,
        status: "planned",
        message: action.description
      };
    }
    if (requiresC420UIActionConfirmation(action) && !yes) {
      return {
        code: c420uiExitCodes.generalError,
        status: "failed",
        message: `[error] Action requires confirmation: ${action.label}
[info] Re-run with --yes after confirming intent.`
      };
    }
    const baseEnv = options.env ?? process.env;
    let actionEnv = rootProvider ? rootProvider.buildActionEnvironment(action, baseEnv) : baseEnv;
    if (rootProvider) {
      const scopeResult = rootProvider.validateActionScope(action, actionEnv);
      if (scopeResult.ok === false) {
        return {
          code: scopeResult.code,
          status: "failed",
          message: scopeResult.message
        };
      }
      const rootPolicy = rootProvider.resolveRootPolicy(
        action,
        rootDir,
        actionEnv
      );
      if (rootPolicy.requiresRoot === false && rootPolicy.warning) {
        emit?.(
          createC420UIEvent({
            type: "log",
            source: "system",
            line: rootPolicy.warning
          })
        );
      }
      if (rootPolicy.requiresRoot) {
        if (options.requestRootAccess) {
          const requested = await options.requestRootAccess({
            action,
            rootDir,
            actionEnv,
            reason: rootPolicy.reason
          });
          if (requested.ok === false) {
            return {
              code: requested.code,
              status: requested.code === c420uiExitCodes.canceled ? "canceled" : "failed",
              message: requested.message
            };
          }
          actionEnv = requested.env ?? (rootProvider.buildRootActionEnvironment ? rootProvider.buildRootActionEnvironment(action, actionEnv) : actionEnv);
        } else {
          const access = rootProvider.validateRootAccess(rootDir, actionEnv);
          if (access.ok === false) {
            return {
              code: access.code,
              status: "failed",
              message: access.message
            };
          }
          actionEnv = rootProvider.buildRootActionEnvironment ? rootProvider.buildRootActionEnvironment(action, actionEnv) : actionEnv;
        }
      }
    }
    emit?.(
      createC420UIEvent({
        type: "action:start",
        actionId: action.id,
        message: action.label,
        data: { dryRun }
      })
    );
    const context = {
      rootDir,
      dryRun,
      yes,
      env: actionEnv,
      signal: runOptions.signal,
      emitLog(event) {
        emit?.(createC420UIEvent({ type: "log", ...event }));
      },
      emitProgress(event) {
        emit?.(createC420UIEvent({ type: "progress", ...event }));
      }
    };
    const result = await bridge.runAction(action.id, context);
    emit?.(
      createC420UIEvent({
        type: "action:finish",
        actionId: action.id,
        message: action.label,
        data: { exitCode: result.code, status: result.status }
      })
    );
    return result;
  }
  return {
    listActions,
    resolveActionById,
    resolveActionByCliFlag,
    runActionById,
    runAction
  };
}

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
  const engine = createC420UIActionEngine({
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
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

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

// build-resources/c420ui/src/command-runner.ts
function emitOperationalLog(options, event) {
  options.emitLog(createC420UIOperationalLogEvent(event));
}
function emitDecodedChunk(stream, chunk, source, emitLog) {
  stream.pending += stream.decoder.write(chunk);
  const lines = stream.pending.split(/\r?\n/);
  stream.pending = lines.pop() ?? "";
  for (const line of lines) {
    emitLog(createC420UIOperationalLogEvent({ source, line }));
  }
}
function emitRemainingChunk(stream, source, emitLog) {
  if (stream.ended) return;
  stream.pending += stream.decoder.end();
  if (stream.pending) {
    emitLog(createC420UIOperationalLogEvent({ source, line: stream.pending }));
  }
  stream.pending = "";
  stream.ended = true;
}
async function runC420UICommand(options) {
  const spawnCommand = options.spawnCommand ?? spawn;
  const args = options.args ?? [];
  const stdoutStream = { decoder: new StringDecoder("utf8"), pending: "", ended: false };
  const stderrStream = { decoder: new StringDecoder("utf8"), pending: "", ended: false };
  const cancelSignal = options.cancelSignal ?? "SIGINT";
  const cancelKillSignal = options.cancelKillSignal ?? "SIGTERM";
  const cancelKillTimeoutMs = options.cancelKillTimeoutMs ?? 5e3;
  if (options.signal?.aborted) {
    emitOperationalLog(options, {
      source: "action",
      line: `[action] Cancel requested for ${options.label}`,
      level: "info"
    });
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: "Action canceled before start."
    };
  }
  return new Promise((resolve) => {
    let settled = false;
    let closeObserved = false;
    let cancellationRequested = false;
    let canceledProgressEmitted = false;
    let cancelKillTimer;
    let child;
    function emitCanceledProgress() {
      if (canceledProgressEmitted) return;
      canceledProgressEmitted = true;
      options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    }
    function clearCancelKillTimer() {
      if (!cancelKillTimer) return;
      clearTimeout(cancelKillTimer);
      cancelKillTimer = void 0;
    }
    function settle(result) {
      if (settled) return;
      settled = true;
      clearCancelKillTimer();
      options.signal?.removeEventListener("abort", abortAction);
      resolve(result);
    }
    function abortAction() {
      cancellationRequested = true;
      emitOperationalLog(options, {
        source: "action",
        line: `[action] Cancel requested for ${options.label}`,
        level: "info"
      });
      emitCanceledProgress();
      child.kill(cancelSignal);
      cancelKillTimer = setTimeout(() => {
        if (!closeObserved) child.kill(cancelKillSignal);
      }, cancelKillTimeoutMs);
      cancelKillTimer.unref();
    }
    emitOperationalLog(options, {
      source: "action",
      line: `[action] Starting ${options.label}`,
      level: "info"
    });
    options.emitProgress({ state: "running", label: options.label });
    try {
      child = spawnCommand(options.command, args, {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitOperationalLog(options, {
        source: "action",
        line: `[error] Failed to start ${options.label}: ${message}`,
        level: "error"
      });
      options.emitProgress({ state: "failed", label: options.label });
      settle({ code: c420uiExitCodes.generalError, status: "failed", message });
      return;
    }
    options.signal?.addEventListener("abort", abortAction, { once: true });
    child.stdout?.on("data", (chunk) => {
      emitDecodedChunk(stdoutStream, chunk, "stdout", options.emitLog);
    });
    child.stderr?.on("data", (chunk) => {
      emitDecodedChunk(stderrStream, chunk, "stderr", options.emitLog);
    });
    child.stdout?.on("end", () => {
      emitRemainingChunk(stdoutStream, "stdout", options.emitLog);
    });
    child.stderr?.on("end", () => {
      emitRemainingChunk(stderrStream, "stderr", options.emitLog);
    });
    child.on("error", (error) => {
      if (settled) return;
      if (options.signal?.aborted) {
        settle({ code: c420uiExitCodes.canceled, status: "canceled", message: "Action canceled." });
        return;
      }
      emitOperationalLog(options, {
        source: "action",
        line: `[error] Failed to start ${options.label}: ${error.message}`,
        level: "error"
      });
      options.emitProgress({ state: "failed", label: options.label });
      settle({ code: c420uiExitCodes.generalError, status: "failed", message: error.message });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      closeObserved = true;
      clearCancelKillTimer();
      setImmediate(() => {
        if (settled) return;
        emitRemainingChunk(stdoutStream, "stdout", options.emitLog);
        emitRemainingChunk(stderrStream, "stderr", options.emitLog);
        if (cancellationRequested || options.signal?.aborted || signal === cancelSignal) {
          emitCanceledProgress();
          settle({ code: c420uiExitCodes.canceled, status: "canceled", message: "Action canceled." });
          return;
        }
        const resultCode = code ?? c420uiExitCodes.generalError;
        const success = resultCode === c420uiExitCodes.success;
        if (!success) {
          emitOperationalLog(options, {
            source: "action",
            line: `[error] ${options.label} exited with code ${resultCode}`,
            level: "error"
          });
        }
        options.emitProgress({
          state: success ? "success" : "failed",
          percent: success ? 100 : void 0,
          label: options.label
        });
        settle({
          code: resultCode,
          status: success ? "success" : "failed"
        });
      });
    });
  });
}

// build-resources/c420ui/src/artifacts.ts
import path from "node:path";
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
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertRequiredString(value, field, context) {
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string`);
  }
}
function assertOptionalBoolean(value, field, context) {
  if (value[field] !== void 0 && typeof value[field] !== "boolean") {
    throw new Error(`${context}: ${field} must be a boolean when present`);
  }
}
function assertOptionalString(value, field, context) {
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
  return path.normalize(configPath.replace(/^[\\/]+/, ""));
}
function assertC420UIArtifactRecipeConfig(config, context = "artifact recipe config") {
  if (!isRecord2(config)) throw new Error(`${context}: artifacts config must be an object`);
  if (!isRecord2(config.capabilities)) {
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
    if (!isRecord2(workflow)) throw new Error(`${workflowContext} must be an object`);
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
    assertOptionalBoolean(workflow, "planned", workflowContext);
    assertOptionalBoolean(workflow, "requiresRoot", workflowContext);
    assertOptionalString(workflow, "description", workflowContext);
    assertOptionalString(workflow, "outputPattern", workflowContext);
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
function isRecord3(value) {
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
    if (!isRecord3(item)) throw new Error("Development task entries must be objects");
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
  if (!isRecord3(config)) throw new Error("development config must be an object");
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
import fs12 from "node:fs";
import path13 from "node:path";

// build-resources/c420ui/src/terminal/logo.ts
var c420uiLogoLines = [
  "\u2584\u2584  \u2588 \u2588 \u2584\u2584\u2584 \u2584\u2580\u2584  \u2584 \u2584  \u2584",
  "\u2588   \u2580\u2584\u2588  \u2584\u2580 \u2588 \u2588  \u2588 \u2588  \u2588",
  "\u2580\u2580    \u2588 \u2588\u2584\u2584  \u2580   \u2580\u2584\u2580  \u2580"
];

// build-resources/c420ui/src/terminal/settings.ts
import path2 from "node:path";
function configHome() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return xdgConfigHome;
  }
  return path2.join(process.env.HOME || ".", ".config");
}
function toolSettingsPath(stateDirectoryName) {
  return path2.join(configHome(), stateDirectoryName, "tool-settings.json");
}

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
import fs7 from "node:fs";
import path8 from "node:path";
import {
  execFileSync
} from "node:child_process";

// build-resources/canva-linux/project-root.ts
import fs from "node:fs";
import path3 from "node:path";
function isProjectRoot(dir) {
  return fs.existsSync(path3.join(dir, "package.json")) && fs.existsSync(path3.join(dir, "build-resources/canva-linux/config/actions.json")) && fs.existsSync(path3.join(dir, "build-resources/canva-linux/config/project-ui.json"));
}
function scriptDirFromArgv() {
  const scriptPath = process.argv[1];
  if (!scriptPath) return null;
  return path3.dirname(path3.resolve(scriptPath));
}
function searchUpwards(startDir) {
  let current = path3.resolve(startDir);
  while (true) {
    if (isProjectRoot(current)) return current;
    const parent = path3.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function defaultRootSearchDir() {
  const fromEnv = process.env.CANVA_SCRIPT_REPO_ROOT;
  if (fromEnv) return path3.resolve(fromEnv);
  const fromScript = scriptDirFromArgv();
  if (fromScript) {
    const match = searchUpwards(fromScript);
    if (match) return match;
  }
  return path3.resolve(process.cwd());
}
function findCanvaLinuxProjectRoot(startDir = defaultRootSearchDir()) {
  const fromStart = searchUpwards(startDir);
  if (fromStart) return fromStart;
  return defaultRootSearchDir();
}

// build-resources/canva-linux/c420ui-adapter/detection/artifact-fragments.ts
import fs2 from "node:fs";
import path4 from "node:path";
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
  return JSON.parse(fs2.readFileSync(filePath, "utf8"));
}
function readPackageVersion(rootDir) {
  return readJsonFile(path4.join(rootDir, "package.json")).version ?? "unknown";
}
function loadArtifactWorkflows(rootDir) {
  const configPath = path4.join(rootDir, ARTIFACTS_CONFIG_PATH);
  if (!fs2.existsSync(configPath)) return [];
  const config = readJsonFile(configPath);
  return Array.isArray(config.workflows) ? config.workflows : [];
}
function normalizeConfigPath(configPath) {
  return configPath.split(/[\\/]+/).filter(Boolean).join(path4.sep);
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
    const absolutePath = path4.join(rootDir, resolvedPattern);
    return fs2.existsSync(absolutePath) ? [absolutePath] : [];
  }
  const firstWildcard = resolvedPattern.indexOf("*");
  const scanRootRelative = path4.dirname(resolvedPattern.slice(0, firstWildcard));
  const scanRoot = path4.join(rootDir, scanRootRelative || ".");
  if (!fs2.existsSync(scanRoot)) return [];
  const matcher = patternToRegExp(resolvedPattern);
  const candidates = [];
  for (const entry of fs2.readdirSync(scanRoot, { withFileTypes: true })) {
    const absolutePath = path4.join(scanRoot, entry.name);
    const relativePath = normalizeConfigPath(path4.relative(rootDir, absolutePath));
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
  return {
    ...version ? { version } : {},
    ...fullVersion ? { fullVersion } : {}
  };
}
function readVersionSidecar(filePath) {
  const raw = fs2.readFileSync(filePath, "utf8").trim();
  return raw ? { version: raw, fullVersion: raw } : {};
}
function readArtifactPackageJsonVersion(artifactPath) {
  const packageJsonPath = path4.join(artifactPath, "package.json");
  if (!fs2.existsSync(packageJsonPath)) return {};
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
    if (!fs2.existsSync(sidecar)) continue;
    if (sidecar.endsWith(".json")) return normalizeMetadata(readMetadataJson(sidecar));
    return readVersionSidecar(sidecar);
  }
  if (fs2.existsSync(artifactPath) && fs2.statSync(artifactPath).isDirectory()) {
    const markers = [
      path4.join(artifactPath, "resources/config/canva-linux/build-metadata.json"),
      path4.join(artifactPath, "config/canva-linux/build-metadata.json"),
      ...artifactKindValue === "linux-unpacked" ? [path4.join(rootDir, "build-resources/canva-linux/config/build-metadata.json")] : []
    ];
    for (const marker of markers) {
      if (fs2.existsSync(marker)) return normalizeMetadata(readMetadataJson(marker));
    }
    return readArtifactPackageJsonVersion(artifactPath);
  }
  return {};
}
function inferVersionFromFilename(artifactPath, packageVersion) {
  const name = path4.basename(artifactPath);
  if (name.includes(packageVersion)) return packageVersion;
  const match = name.match(/^canva-linux-([0-9][^-]*(?:[-+.][A-Za-z0-9.]+)*)-/);
  return match?.[1];
}
function toRelativeArtifactPath(rootDir, artifactPath) {
  return normalizeConfigPath(path4.relative(rootDir, artifactPath));
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
    fragments.push({
      id: workflow.id,
      kind,
      label: workflow.label,
      detected,
      ...artifactPath ? { path: toRelativeArtifactPath(rootDir, artifactPath) } : {},
      ...metadata.version ? { version: metadata.version } : fallbackVersion ? { version: fallbackVersion } : {},
      ...metadata.fullVersion ? { fullVersion: metadata.fullVersion } : {}
    });
  }
  return fragments;
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
import fs4 from "node:fs";
import path5 from "node:path";

// build-resources/c420ui/operations/detection/version-marker.ts
import fs3 from "node:fs";
function readVersionFile(versionFile) {
  if (fs3.existsSync(versionFile)) {
    return fs3.readFileSync(versionFile, "utf8").trim();
  }
  return "";
}
function readPackageJsonVersion(packageFile) {
  if (!fs3.existsSync(packageFile)) return "";
  try {
    const pkg = JSON.parse(fs3.readFileSync(packageFile, "utf8"));
    return pkg.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataFullVersion(metadataFile) {
  if (!fs3.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs3.readFileSync(metadataFile, "utf8"));
    return m.fullVersion || m.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataBaseVersion(metadataFile) {
  if (!fs3.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs3.readFileSync(metadataFile, "utf8"));
    return m.baseVersion || m.basePhase || m.version || "";
  } catch {
    return "";
  }
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
function detectAppImageArtifacts(rootDir) {
  const distDir = path5.join(rootDir, "dist");
  if (!fs4.existsSync(distDir)) return false;
  try {
    const files = fs4.readdirSync(distDir);
    return files.some((file) => file.endsWith(".AppImage"));
  } catch {
    return false;
  }
}
function findLatestAppImageArtifact(rootDir) {
  const distDir = path5.join(rootDir, "dist");
  if (!fs4.existsSync(distDir)) return "";
  try {
    const files = fs4.readdirSync(distDir).filter((file) => file.endsWith(".AppImage")).sort();
    const latest = files[files.length - 1];
    return latest ? path5.join("dist", latest) : "";
  } catch {
    return "";
  }
}
function findArtifactBuildMetadataMarker(artifactPath, rootDir) {
  if (!artifactPath) return "";
  const absoluteArtifactPath = path5.isAbsolute(artifactPath) ? artifactPath : path5.join(rootDir, artifactPath);
  const markers = [
    `${absoluteArtifactPath}.build-metadata.json`,
    `${absoluteArtifactPath}.version.json`,
    `${absoluteArtifactPath}.version`
  ];
  for (const marker of markers) {
    if (fs4.existsSync(marker)) return marker;
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
      const entries = fs4.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path5.join(dir, entry.name);
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
  const distDir = path5.join(rootDir, "dist");
  if (fs4.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataBaseVersion(distMetadata);
    if (version) return version;
  }
  if (!file) return "";
  const name = path5.basename(file);
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
      const entries = fs4.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path5.join(dir, entry.name);
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
  const distDir = path5.join(rootDir, "dist");
  if (fs4.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataFullVersion(distMetadata);
    if (version) return version;
  }
  return detectAppImageVersion(rootDir);
}

// build-resources/c420ui/operations/detection/flatpak-detection.ts
import fs5 from "node:fs";
import path6 from "node:path";
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
  const directPath = path6.join(scopeRoot, markerBase);
  if (fs5.existsSync(directPath)) return directPath;
  const appDir = path6.join(scopeRoot, `app/${APP_ID}`);
  if (!fs5.existsSync(appDir)) return "";
  const findVersionMarker = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs5.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path6.join(dir, entry.name);
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
  if (!fs5.existsSync(markerFile)) return "";
  try {
    const raw = fs5.readFileSync(markerFile, "utf8").trim();
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
  if (!fs5.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "version");
  if (version) return version;
  try {
    return fs5.readFileSync(markerFile, "utf8").split("\n")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}
function readFlatpakFullVersionMarker(markerFile) {
  if (!fs5.existsSync(markerFile)) return "";
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
    path6.join(home, ".local/share/flatpak")
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
    path6.join(home, ".local/share/flatpak")
  );
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;
  return detectFlatpakUserVersion();
}

// build-resources/c420ui/operations/detection/native-detection.ts
import fs6 from "node:fs";
import path7 from "node:path";
import os2 from "node:os";
var APP_EXECUTABLE = "canva-linux";
var APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";
function detectNativeSystemInstall() {
  return fs6.existsSync("/opt/canva-linux") || fs6.existsSync(`/usr/local/bin/${APP_EXECUTABLE}`) || fs6.existsSync(`/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`);
}
function detectNativeUserInstall() {
  const home = os2.homedir();
  return fs6.existsSync(path7.join(home, ".local/opt/canva-linux")) || fs6.existsSync(path7.join(home, `.local/bin/${APP_EXECUTABLE}`)) || fs6.existsSync(
    path7.join(home, `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`)
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
    path7.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json")
  );
  if (version) return version;
  version = readVersionFile(
    path7.join(home, ".local/opt/canva-linux/CANVA_LINUX_VERSION")
  );
  if (version) return version;
  return readPackageJsonVersion(
    path7.join(home, ".local/opt/canva-linux/package.json")
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
    path7.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json")
  );
  if (version) return version;
  return detectNativeUserVersion();
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
    DETECTED_APPIMAGE_FULL_VERSION: detectAppImageFullVersion(rootDir)
  };
}

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
var cachedPackageJson;
function readPackage(rootDir) {
  if (cachedPackageJson?.rootDir === rootDir) {
    return cachedPackageJson.packageJson;
  }
  const packageJson = JSON.parse(
    fs7.readFileSync(path8.join(rootDir, "package.json"), "utf8")
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
  appImageFullVersion: ""
};
function readPhase(rootDir) {
  const phaseFile = path8.join(rootDir, "scripts/app-identity-common.sh");
  if (!fs7.existsSync(phaseFile)) return "unknown";
  const content = fs7.readFileSync(phaseFile, "utf8");
  const match = content.match(/^PROJECT_PHASE="([^"]+)"/m);
  return match?.[1] ?? "unknown";
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
    appImageFullVersion: appImageFragment?.fullVersion || appImageFragment?.version || values.DETECTED_APPIMAGE_FULL_VERSION || values.DETECTED_APPIMAGE_VERSION || ""
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
import fs8 from "node:fs";
import { createRequire } from "node:module";
import path9 from "node:path";
var UNKNOWN_BASE_VERSION = "0.0.0";
var UNKNOWN_BUILD_REVISION = "unknown";
function loadBuildMetadataModule(rootDir) {
  const requireFromRoot = createRequire(path9.join(rootDir, "package.json"));
  const compiledModule = path9.join(rootDir, ".build/electron/main/build-metadata.js");
  if (!fs8.existsSync(compiledModule)) return null;
  try {
    return requireFromRoot(compiledModule);
  } catch {
    return null;
  }
}
function readJsonFile2(filePath) {
  try {
    return JSON.parse(fs8.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir) {
  return fs8.existsSync(path9.join(rootDir, ".git"));
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
  const packageJson = readJsonFile2(path9.join(rootDir, "package.json"));
  const projectUi = readJsonFile2(
    path9.join(rootDir, "build-resources", "canva-linux", "config", "project-ui.json")
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
    path9.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function loadEffectiveFileMetadata(rootDir, metadataModule) {
  const metadata = readJsonFile2(
    path9.join(rootDir, ".build", "canva-linux", "build-metadata.effective.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function fallbackEffectiveBuildMetadata(rootDir = process.cwd(), metadataModule) {
  const module = metadataModule ?? loadBuildMetadataModule(path9.resolve(rootDir));
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
  const resolvedRootDir = path9.resolve(rootDir);
  const metadataModule = loadBuildMetadataModule(resolvedRootDir);
  if (!metadataModule) {
    const effective2 = readJsonFile2(
      path9.join(resolvedRootDir, ".build", "canva-linux", "build-metadata.effective.json")
    );
    if (effective2) return effective2;
    const packaged = readJsonFile2(
      path9.join(resolvedRootDir, "build-resources", "canva-linux", "config", "build-metadata.json")
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

// build-resources/canva-linux/c420ui-adapter/artifacts.ts
import fs10 from "node:fs";
import path11 from "node:path";

// build-resources/canva-linux/actions/registry.ts
import fs9 from "node:fs";
import path10 from "node:path";
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
  return path10.join(rootDir, "build-resources/canva-linux/config/actions.json");
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
  const resolvedRoot = path10.resolve(rootDir);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(
    fs9.readFileSync(actionsPath(resolvedRoot), "utf8")
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
function readJsonFile3(filePath) {
  if (!fs10.existsSync(filePath)) {
    throw new Error(`Missing Canva Linux configuration file: ${filePath}`);
  }
  try {
    return JSON.parse(fs10.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse configuration file ${filePath}: ${message}`);
  }
}
var cachedArtifactsConfig = null;
var cachedArtifactsConfigPath = null;
function loadArtifactsConfig(rootDir) {
  const configPath = path11.join(rootDir, ARTIFACTS_CONFIG_PATH2);
  if (cachedArtifactsConfig && cachedArtifactsConfigPath === configPath) {
    return cachedArtifactsConfig;
  }
  const config = readJsonFile3(configPath);
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
import fs11 from "node:fs";
import path12 from "node:path";
function readJsonFile4(filePath) {
  return JSON.parse(fs11.readFileSync(filePath, "utf8"));
}
function loadCanvaLinuxDevelopmentTasks(rootDir) {
  const developmentConfigPath = path12.join(
    rootDir,
    "build-resources/canva-linux/config/development.json"
  );
  const config = readJsonFile4(developmentConfigPath);
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
function readJsonFile5(filePath) {
  return JSON.parse(fs12.readFileSync(filePath, "utf8"));
}
function readAppIdentity(identityPath) {
  try {
    const content = fs12.readFileSync(identityPath, "utf8");
    return {
      projectDisplayVersion: content.match(/^PROJECT_DISPLAY_VERSION="([^"]+)"/m)?.[1],
      projectPhase: content.match(/^PROJECT_PHASE="([^"]+)"/m)?.[1]
    };
  } catch {
    return {};
  }
}
function stateHome() {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) return xdgStateHome;
  return path13.join(process.env.HOME || ".", ".local/state");
}
function createCanvaLinuxC420UIAdapter(rootDir) {
  const resolvedRootDir = path13.resolve(rootDir);
  const projectUiPath = path13.join(resolvedRootDir, "build-resources/canva-linux/config/project-ui.json");
  const packageJsonPath = path13.join(resolvedRootDir, "package.json");
  const actionsJsonPath = path13.join(resolvedRootDir, "build-resources/canva-linux/config/actions.json");
  const artifactsJsonPath = path13.join(resolvedRootDir, "build-resources/canva-linux/config/artifacts.json");
  const appIdentityPath = path13.join(
    resolvedRootDir,
    "scripts/app-identity-common.sh"
  );
  const buildMetadataPath = path13.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/build-metadata.json"
  );
  const c420uiPackageJsonPath = path13.join(
    resolvedRootDir,
    "build-resources/c420ui/package.json"
  );
  function loadProjectUi() {
    return readJsonFile5(projectUiPath);
  }
  function loadPackageJson() {
    return readJsonFile5(packageJsonPath);
  }
  function loadAppIdentity() {
    return readAppIdentity(appIdentityPath);
  }
  function loadBuildMetadata() {
    return loadEffectiveBuildMetadata(resolvedRootDir);
  }
  function loadC420UIPackageJson() {
    return readJsonFile5(c420uiPackageJsonPath);
  }
  function getPackageVersion() {
    return loadPackageJson().version ?? "unknown";
  }
  function getProjectPhase() {
    const fromEnv = process.env.CANVA_PROJECT_PHASE?.trim();
    if (fromEnv) return fromEnv;
    const identity = loadAppIdentity();
    if (identity.projectPhase) return identity.projectPhase;
    return loadProjectUi().phase || "unknown";
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
    return getProjectPhase();
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
  function loadProjectConfig() {
    const projectUi = loadProjectUi();
    return {
      projectName: projectUi.projectName,
      projectSubtitle: projectUi.projectSubtitle,
      displayVersion: getEffectiveProjectDisplayVersion(),
      phase: getEffectiveProjectPhase(),
      fullVersion: getEffectiveProjectFullVersion(),
      buildRevision: getEffectiveProjectBuildRevision(),
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
      logoLines: [...c420uiLogoLines]
    };
  }
  function getSessionLogPath() {
    const fromEnv = process.env.CANVA_TOOL_SESSION_LOG?.trim();
    if (fromEnv) return fromEnv;
    return path13.join(
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
    if (!fs12.existsSync(actionsJsonPath)) {
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
      sessionId: getSessionId()
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
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      artifactsJson: artifactsJsonPath,
      appIdentity: appIdentityPath,
      buildMetadata: buildMetadataPath,
      c420uiPackageJson: c420uiPackageJsonPath
    },
    loadProjectInfo: loadProjectConfig,
    loadConfig: toC420UIConfig,
    loadProjectUi,
    loadPackageJson,
    loadAppIdentity,
    loadBuildMetadata,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions2,
    loadArtifactWorkflows: loadArtifactWorkflows2,
    loadWorkflows,
    loadCapabilities: () => loadCanvaLinuxCapabilities(resolvedRootDir),
    getProjectPhase,
    getEffectiveProjectDisplayVersion,
    getEffectiveProjectPhase,
    getEffectiveProjectFullVersion,
    getEffectiveProjectBuildRevision,
    getSessionLogPath,
    getSessionId,
    getToolSettingsPath,
    toC420UIConfig
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
    sudoHelperPath: "build-resources/c420ui/host/linux/sudo-helper.sh",
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
