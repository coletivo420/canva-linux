#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/c420ui/src/scopes.ts
var c420uiKnownActionScopes = ["user", "system", "auto"];
function normalizeC420UIActionScope(scope) {
  const normalized = scope?.trim();
  return normalized || void 0;
}
function isC420UIUserScope(scope) {
  return normalizeC420UIActionScope(scope) === "user";
}

// packages/c420ui/src/linux-root-provider.ts
var import_node_child_process = require("node:child_process");

// packages/c420ui/src/root-provider.ts
var c420uiRootPolicyExitCode = 64;

// packages/c420ui/src/linux-root-provider.ts
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
  const runCommand = options.runCommand ?? import_node_child_process.spawnSync;
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

// packages/c420ui/src/actions.ts
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

// packages/c420ui/src/events.ts
function createC420UIEvent(event) {
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...event
  };
}

// packages/c420ui/src/exit-codes.ts
var c420uiExitCodes = {
  success: 0,
  generalError: 1,
  invalidUsage: 64,
  rootPolicyError: 64,
  plannedAction: 78,
  canceled: 130
};

// packages/c420ui/src/action-engine.ts
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

// packages/c420ui/src/cli.ts
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

// packages/c420ui/src/command-runner.ts
var import_node_child_process2 = require("node:child_process");
var import_node_string_decoder = require("node:string_decoder");

// packages/c420ui/src/operational-logs.ts
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

// packages/c420ui/src/command-runner.ts
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
  stream.pending += stream.decoder.end();
  if (stream.pending) {
    emitLog(createC420UIOperationalLogEvent({ source, line: stream.pending }));
  }
  stream.pending = "";
}
async function runC420UICommand(options) {
  const spawnCommand = options.spawnCommand ?? import_node_child_process2.spawn;
  const args = options.args ?? [];
  const stdoutStream = { decoder: new import_node_string_decoder.StringDecoder("utf8"), pending: "" };
  const stderrStream = { decoder: new import_node_string_decoder.StringDecoder("utf8"), pending: "" };
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
}

// packages/c420ui/src/artifacts.ts
var import_node_path = __toESM(require("node:path"));
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
  return import_node_path.default.normalize(configPath.replace(/^[\\/]+/, ""));
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

// packages/c420ui/src/bridge.ts
function createC420UIBridge(bridge) {
  return bridge;
}

// packages/c420ui/src/detection.ts
function parseC420UIDetectionKeyValueLines(text, allowedKeys) {
  const result = {};
  const allowed = allowedKeys ? new Set(allowedKeys) : null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index);
    if (allowed && !allowed.has(key)) continue;
    result[key] = line.slice(index + 1);
  }
  return result;
}
function boolFromC420UIDetectionValue(value) {
  return value === "true";
}

// packages/c420ui/src/development-provider.ts
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

// scripts/c420ui-adapter/adapter.ts
var import_node_fs8 = __toESM(require("node:fs"));
var import_node_path10 = __toESM(require("node:path"));

// packages/c420ui/src/terminal/logo.ts
var c420uiLogoLines = [
  "\u2584\u2584  \u2588 \u2588 \u2584\u2584\u2584 \u2584\u2580\u2584  \u2584 \u2584  \u2584",
  "\u2588   \u2580\u2584\u2588  \u2584\u2580 \u2588 \u2588  \u2588 \u2588  \u2588",
  "\u2580\u2580    \u2588 \u2588\u2584\u2584  \u2580   \u2580\u2584\u2580  \u2580"
];

// packages/c420ui/src/terminal/settings.ts
var import_node_path2 = __toESM(require("node:path"));
function configHome() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return xdgConfigHome;
  }
  return import_node_path2.default.join(process.env.HOME || ".", ".config");
}
function toolSettingsPath(stateDirectoryName) {
  return import_node_path2.default.join(configHome(), stateDirectoryName, "tool-settings.json");
}

// scripts/c420ui-adapter/detection/provider.ts
var import_node_fs3 = __toESM(require("node:fs"));
var import_node_path5 = __toESM(require("node:path"));
var import_node_child_process3 = require("node:child_process");

// scripts/canva-linux/project-root.ts
var import_node_fs = __toESM(require("node:fs"));
var import_node_path3 = __toESM(require("node:path"));
function defaultRootSearchDir() {
  return import_node_path3.default.resolve(__dirname, "../..");
}
function findCanvaLinuxProjectRoot(startDir = defaultRootSearchDir()) {
  let current = import_node_path3.default.resolve(startDir);
  while (true) {
    if (import_node_fs.default.existsSync(import_node_path3.default.join(current, "package.json")) && import_node_fs.default.existsSync(import_node_path3.default.join(current, "config/canva-linux/actions.json")) && import_node_fs.default.existsSync(import_node_path3.default.join(current, "config/canva-linux/project-ui.json"))) {
      return current;
    }
    const parent = import_node_path3.default.dirname(current);
    if (parent === current) return defaultRootSearchDir();
    current = parent;
  }
}

// scripts/c420ui-adapter/detection/artifact-fragments.ts
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path4 = __toESM(require("node:path"));
var ARTIFACTS_CONFIG_PATH = "config/canva-linux/artifacts.json";
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
  return JSON.parse(import_node_fs2.default.readFileSync(filePath, "utf8"));
}
function readPackageVersion(rootDir) {
  return readJsonFile(import_node_path4.default.join(rootDir, "package.json")).version ?? "unknown";
}
function loadArtifactWorkflows(rootDir) {
  const configPath = import_node_path4.default.join(rootDir, ARTIFACTS_CONFIG_PATH);
  if (!import_node_fs2.default.existsSync(configPath)) return [];
  const config = readJsonFile(configPath);
  return Array.isArray(config.workflows) ? config.workflows : [];
}
function normalizeConfigPath(configPath) {
  return configPath.split(/[\\/]+/).filter(Boolean).join(import_node_path4.default.sep);
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
    const absolutePath = import_node_path4.default.join(rootDir, resolvedPattern);
    return import_node_fs2.default.existsSync(absolutePath) ? [absolutePath] : [];
  }
  const firstWildcard = resolvedPattern.indexOf("*");
  const scanRootRelative = import_node_path4.default.dirname(resolvedPattern.slice(0, firstWildcard));
  const scanRoot = import_node_path4.default.join(rootDir, scanRootRelative || ".");
  if (!import_node_fs2.default.existsSync(scanRoot)) return [];
  const matcher = patternToRegExp(resolvedPattern);
  const candidates = [];
  for (const entry of import_node_fs2.default.readdirSync(scanRoot, { withFileTypes: true })) {
    const absolutePath = import_node_path4.default.join(scanRoot, entry.name);
    const relativePath = normalizeConfigPath(import_node_path4.default.relative(rootDir, absolutePath));
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
  const version = firstMetadataVersion(metadata.version, metadata.baseVersion, metadata.basePhase);
  const fullVersion = firstMetadataVersion(metadata.fullVersion, metadata.version, metadata.baseVersion, metadata.basePhase);
  return {
    ...version ? { version } : {},
    ...fullVersion ? { fullVersion } : {}
  };
}
function readVersionSidecar(filePath) {
  const raw = import_node_fs2.default.readFileSync(filePath, "utf8").trim();
  return raw ? { version: raw, fullVersion: raw } : {};
}
function readArtifactPackageJsonVersion(artifactPath) {
  const packageJsonPath = import_node_path4.default.join(artifactPath, "package.json");
  if (!import_node_fs2.default.existsSync(packageJsonPath)) return {};
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
    if (!import_node_fs2.default.existsSync(sidecar)) continue;
    if (sidecar.endsWith(".json")) return normalizeMetadata(readMetadataJson(sidecar));
    return readVersionSidecar(sidecar);
  }
  if (import_node_fs2.default.existsSync(artifactPath) && import_node_fs2.default.statSync(artifactPath).isDirectory()) {
    const markers = [
      import_node_path4.default.join(artifactPath, "resources/config/canva-linux/build-metadata.json"),
      import_node_path4.default.join(artifactPath, "config/canva-linux/build-metadata.json"),
      ...artifactKindValue === "linux-unpacked" ? [import_node_path4.default.join(rootDir, "config/canva-linux/build-metadata.json")] : []
    ];
    for (const marker of markers) {
      if (import_node_fs2.default.existsSync(marker)) return normalizeMetadata(readMetadataJson(marker));
    }
    return readArtifactPackageJsonVersion(artifactPath);
  }
  return {};
}
function inferVersionFromFilename(artifactPath, packageVersion) {
  const name = import_node_path4.default.basename(artifactPath);
  if (name.includes(packageVersion)) return packageVersion;
  const match = name.match(/^canva-linux-([0-9][^-]*(?:[-+.][A-Za-z0-9.]+)*)-/);
  return match?.[1];
}
function toRelativeArtifactPath(rootDir, artifactPath) {
  return normalizeConfigPath(import_node_path4.default.relative(rootDir, artifactPath));
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

// scripts/c420ui-adapter/detection/provider.ts
var canvaLinuxDetectionKeys = [
  "DETECTED_NATIVE_SYSTEM",
  "DETECTED_NATIVE_USER",
  "DETECTED_FLATPAK_SYSTEM",
  "DETECTED_FLATPAK_USER",
  "DETECTED_APPIMAGE_ARTIFACTS",
  "DETECTED_NATIVE_SYSTEM_VERSION",
  "DETECTED_NATIVE_USER_VERSION",
  "DETECTED_FLATPAK_SYSTEM_VERSION",
  "DETECTED_FLATPAK_USER_VERSION",
  "DETECTED_APPIMAGE_VERSION",
  "DETECTED_NATIVE_SYSTEM_FULL_VERSION",
  "DETECTED_NATIVE_USER_FULL_VERSION",
  "DETECTED_FLATPAK_SYSTEM_FULL_VERSION",
  "DETECTED_FLATPAK_USER_FULL_VERSION",
  "DETECTED_APPIMAGE_FULL_VERSION"
];
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
function readPackage(rootDir) {
  return JSON.parse(
    import_node_fs3.default.readFileSync(import_node_path5.default.join(rootDir, "package.json"), "utf8")
  );
}
function readPhase(rootDir) {
  const content = import_node_fs3.default.readFileSync(
    import_node_path5.default.join(rootDir, "scripts/app-identity-common.sh"),
    "utf8"
  );
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
function detectionCommand() {
  return [
    "source scripts/install-detection-common.sh",
    "detect_installations",
    "print_detection_status_env"
  ].join("\n");
}
function runInstallDetection(rootDir, runCommand) {
  const warnings = [];
  let ok = true;
  try {
    const result = runCommand("bash", ["-c", detectionCommand()], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (result.error) {
      ok = false;
      warnings.push(`Installation detection failed to start: ${result.error.message}`);
    }
    const stderr = result.stderr?.trim();
    if (stderr) warnings.push(stderr);
    if ((result.status ?? 0) !== 0) {
      ok = false;
      warnings.push(
        `Installation detection exited with status ${result.status ?? "unknown"}.`
      );
    }
    return {
      ok,
      values: parseC420UIDetectionKeyValueLines(
        result.stdout || "",
        canvaLinuxDetectionKeys
      ),
      warnings
    };
  } catch (error) {
    warnings.push(
      `Installation detection failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return { ok: false, values: {}, warnings };
  }
}
function createInstallDetectionProbe(runCommand) {
  return {
    id: "canva-linux-install-detection",
    label: "Canva Linux installation detection",
    run(rootDir) {
      return runInstallDetection(rootDir, runCommand);
    }
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
  const runCommand = options.runCommand ?? import_node_child_process3.spawnSync;
  return {
    id: "canva-linux-detection-provider",
    label: "Canva Linux detection provider",
    buildOverviewStatus(rootDir) {
      const project = safeProjectMetadata(rootDir);
      const probe = createInstallDetectionProbe(runCommand);
      const detection = probe.run(rootDir);
      const artifactFragments = buildCanvaLinuxArtifactFragments(rootDir);
      return {
        project,
        installations: {
          ...emptyInstallations,
          ...buildInstallations(detection.values, artifactFragments)
        },
        artifactFragments,
        warnings: detection.warnings ?? []
      };
    }
  };
}
function buildCanvaLinuxOverviewStatus(rootDir = findCanvaLinuxProjectRoot()) {
  return createCanvaLinuxDetectionProvider().buildOverviewStatus(rootDir);
}

// scripts/c420ui-adapter/build-metadata-loader.ts
var import_node_child_process4 = require("node:child_process");
var import_node_fs4 = __toESM(require("node:fs"));
var import_node_module = require("node:module");
var import_node_path6 = __toESM(require("node:path"));
var UNKNOWN_BASE_VERSION = "0.0.0";
var UNKNOWN_BUILD_REVISION = "unknown";
function loadBuildMetadataModule(rootDir) {
  const requireFromRoot = (0, import_node_module.createRequire)(import_node_path6.default.join(rootDir, "package.json"));
  const candidates = [
    import_node_path6.default.join(rootDir, ".build/electron/main/build-metadata.js"),
    import_node_path6.default.join(rootDir, "electron/main/build-metadata.ts")
  ];
  for (const candidate of candidates) {
    try {
      return requireFromRoot(candidate);
    } catch {
      continue;
    }
  }
  throw new Error("Unable to load electron/main/build-metadata module");
}
function readJsonFile2(filePath) {
  try {
    return JSON.parse(import_node_fs4.default.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir) {
  return import_node_fs4.default.existsSync(import_node_path6.default.join(rootDir, ".git"));
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
    const value = (0, import_node_child_process4.execFileSync)("git", ["rev-parse", "--short=7", "HEAD"], {
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
  const packageJson = readJsonFile2(import_node_path6.default.join(rootDir, "package.json"));
  const projectUi = readJsonFile2(
    import_node_path6.default.join(rootDir, "config", "canva-linux", "project-ui.json")
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
    import_node_path6.default.join(rootDir, "config", "canva-linux", "build-metadata.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function fallbackEffectiveBuildMetadata(rootDir = process.cwd(), metadataModule) {
  const module2 = metadataModule ?? loadBuildMetadataModule(import_node_path6.default.resolve(rootDir));
  return module2.createBuildMetadata({
    baseVersion: UNKNOWN_BASE_VERSION,
    baseDisplayVersion: UNKNOWN_BASE_VERSION,
    basePhase: UNKNOWN_BASE_VERSION,
    buildRevision: UNKNOWN_BUILD_REVISION
  });
}
function loadEffectiveBuildMetadata(rootDir) {
  const resolvedRootDir = import_node_path6.default.resolve(rootDir);
  const metadataModule = loadBuildMetadataModule(resolvedRootDir);
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

// scripts/c420ui-adapter/artifacts.ts
var import_node_fs6 = __toESM(require("node:fs"));
var import_node_path8 = __toESM(require("node:path"));

// scripts/canva-linux/actions/registry.ts
var import_node_fs5 = __toESM(require("node:fs"));
var import_node_path7 = __toESM(require("node:path"));
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
  return import_node_path7.default.join(rootDir, "config/canva-linux/actions.json");
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
  const resolvedRoot = import_node_path7.default.resolve(rootDir);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(
    import_node_fs5.default.readFileSync(actionsPath(resolvedRoot), "utf8")
  );
  validateCanvaLinuxActions(actions);
  cachedRoot = resolvedRoot;
  cachedActions = actions;
  return actions;
}
function loadCanvaLinuxActions(rootDir = findProjectRoot()) {
  return loadCanvaLinuxActionRegistry(rootDir);
}

// scripts/c420ui-adapter/actions.ts
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

// scripts/c420ui-adapter/artifacts.ts
var ARTIFACTS_CONFIG_PATH2 = "config/canva-linux/artifacts.json";
function readJsonFile3(filePath) {
  if (!import_node_fs6.default.existsSync(filePath)) {
    throw new Error(`Missing Canva Linux configuration file: ${filePath}`);
  }
  try {
    return JSON.parse(import_node_fs6.default.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse configuration file ${filePath}: ${message}`);
  }
}
var cachedArtifactsConfig = null;
var cachedArtifactsConfigPath = null;
function loadArtifactsConfig(rootDir) {
  const configPath = import_node_path8.default.join(rootDir, ARTIFACTS_CONFIG_PATH2);
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

// scripts/c420ui-adapter/development.ts
var import_node_fs7 = __toESM(require("node:fs"));
var import_node_path9 = __toESM(require("node:path"));
function readJsonFile4(filePath) {
  return JSON.parse(import_node_fs7.default.readFileSync(filePath, "utf8"));
}
function loadCanvaLinuxDevelopmentTasks(rootDir) {
  const developmentConfigPath = import_node_path9.default.join(
    rootDir,
    "config/canva-linux/development.json"
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

// scripts/c420ui-adapter/adapter.ts
function readJsonFile5(filePath) {
  return JSON.parse(import_node_fs8.default.readFileSync(filePath, "utf8"));
}
function readAppIdentity(identityPath) {
  try {
    const content = import_node_fs8.default.readFileSync(identityPath, "utf8");
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
  return import_node_path10.default.join(process.env.HOME || ".", ".local/state");
}
function createCanvaLinuxC420UIAdapter(rootDir) {
  const resolvedRootDir = import_node_path10.default.resolve(rootDir);
  const projectUiPath = import_node_path10.default.join(resolvedRootDir, "config/canva-linux/project-ui.json");
  const packageJsonPath = import_node_path10.default.join(resolvedRootDir, "package.json");
  const actionsJsonPath = import_node_path10.default.join(resolvedRootDir, "config/canva-linux/actions.json");
  const artifactsJsonPath = import_node_path10.default.join(resolvedRootDir, "config/canva-linux/artifacts.json");
  const appIdentityPath = import_node_path10.default.join(
    resolvedRootDir,
    "scripts/app-identity-common.sh"
  );
  const buildMetadataPath = import_node_path10.default.join(
    resolvedRootDir,
    "config/canva-linux/build-metadata.json"
  );
  const c420uiPackageJsonPath = import_node_path10.default.join(
    resolvedRootDir,
    "packages/c420ui/package.json"
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
    return import_node_path10.default.join(
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
    if (!import_node_fs8.default.existsSync(actionsJsonPath)) {
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

// scripts/c420ui-adapter/root-provider.ts
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
    sudoHelperPath: "packages/c420ui/host/linux/sudo-helper.sh",
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

// scripts/c420ui-adapter/bridge.ts
function createCanvaLinuxBridge(rootDir = process.cwd()) {
  return createCanvaLinuxC420UIAdapter(rootDir);
}

// scripts/c420ui-adapter/cli.ts
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

// scripts/run-c420ui-cli.ts
runCanvaLinuxC420UICli(process.argv.slice(2)).then((code) => {
  process.exit(code);
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
