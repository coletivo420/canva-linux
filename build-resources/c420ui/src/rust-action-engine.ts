import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";

import {
  assertC420UIActionContract,
  getC420UIActionCliFlags,
  type c420uiAction,
} from "./actions.js";
import type { c420uiActionResult, c420uiProjectBridge } from "./bridge.js";
import { createC420UIEvent, type C420UIEventSink } from "./events.js";
import { c420uiExitCodes } from "./exit-codes.js";
import type { c420uiRootProvider } from "./root-provider.js";

export type c420uiRootAccessRequest = {
  action: c420uiAction;
  rootDir: string;
  actionEnv: NodeJS.ProcessEnv;
  reason: string;
};

export type c420uiRootAccessRequestResult =
  | { ok: true; env?: NodeJS.ProcessEnv }
  | { ok: false; code: number; message: string };

export type c420uiRootAccessRequester = (
  request: c420uiRootAccessRequest,
) =>
  | Promise<c420uiRootAccessRequestResult>
  | c420uiRootAccessRequestResult;

export type c420uiActionEngineOptions = {
  bridge: c420uiProjectBridge;
  rootDir: string;
  projectConfigRoot?: string;
  env?: NodeJS.ProcessEnv;
  emit?: C420UIEventSink;
  rootProvider?: c420uiRootProvider;
  requestRootAccess?: c420uiRootAccessRequester;
};

export type c420uiRunActionOptions = {
  dryRun?: boolean;
  yes?: boolean;
  signal?: AbortSignal;
};

export type c420uiActionResolution =
  | { found: true; action: c420uiAction }
  | { found: false; reason: "not-found"; query: string };

type RustActionEvent =
  | {
      event: "action:start";
      actionId: string;
      message: string;
      data?: Record<string, unknown>;
    }
  | { event: "log"; source: string; line: string; level?: string }
  | { event: "progress"; state: string; label?: string; percent?: number }
  | { event: "root-request"; requestId: string; actionId: string; reason: string }
  | { event: "action:finish"; actionId: string; status: string; code: number }
  | { event: "error"; message: string };

export function createC420UIRustActionEngine(options: c420uiActionEngineOptions) {
  const { bridge, rootDir, emit, rootProvider, projectConfigRoot } = options;

  function listActions(): c420uiAction[] {
    return bridge.actions();
  }

  function resolveActionById(actionId: string): c420uiActionResolution {
    const action = listActions().find((candidate) => candidate.id === actionId);
    return action
      ? { found: true, action }
      : { found: false, reason: "not-found", query: actionId };
  }

  function resolveActionByCliFlag(flag: string): c420uiActionResolution {
    const action = listActions().find((candidate) =>
      getC420UIActionCliFlags(candidate).includes(flag),
    );
    return action
      ? { found: true, action }
      : { found: false, reason: "not-found", query: flag };
  }

  async function runActionById(
    actionId: string,
    runOptions: c420uiRunActionOptions = {},
  ): Promise<c420uiActionResult> {
    const resolution = resolveActionById(actionId);
    if (!resolution.found) {
      if (projectConfigRoot) {
        return runAction(createProjectConfigResolvedAction(actionId), runOptions);
      }
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`,
      };
    }
    return runAction(resolution.action, runOptions);
  }

  async function runAction(
    action: c420uiAction,
    runOptions: c420uiRunActionOptions = {},
  ): Promise<c420uiActionResult> {
    assertC420UIActionContract(action);
    const baseEnv = options.env ?? process.env;
    let actionEnv = rootProvider
      ? rootProvider.buildActionEnvironment(action, baseEnv)
      : baseEnv;

    let rootPolicy:
      | {
          requiresRoot: boolean;
          reason?: string;
          actionEnv?: Record<string, string>;
        }
      | undefined;

    if (rootProvider) {
      const scopeResult = rootProvider.validateActionScope(action, actionEnv);
      if (scopeResult.ok === false) {
        return {
          code: scopeResult.code,
          status: "failed",
          message: scopeResult.message,
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
          actionEnv: rootProvider.buildRootActionEnvironment
            ? pickStringEnv(rootProvider.buildRootActionEnvironment(action, actionEnv))
            : {},
        };
      }
    }

    const finalEvent = await runRustActionProcess({
      rootDir,
      projectConfigRoot,
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
          actionEnv =
            rootProvider?.buildRootActionEnvironment?.(action, actionEnv) ?? actionEnv;
          return { ok: true, env: actionEnv };
        }
        return options.requestRootAccess(request);
      },
      emit,
      rootProvider,
      actionEnv,
    });

    if (finalEvent) {
      return {
        code: finalEvent.code,
        status: normalizeActionStatus(finalEvent.status),
      };
    }
    return {
      code: c420uiExitCodes.generalError,
      status: "failed",
      message: "Action did not emit a finish event.",
    };
  }

  return {
    listActions,
    resolveActionById,
    resolveActionByCliFlag,
    runActionById,
    runAction,
  };
}

function createProjectConfigResolvedAction(actionId: string): c420uiAction {
  return {
    id: actionId,
    label: actionId,
    group: "custom",
    kind: "command",
  };
}

async function runRustActionProcess(options: {
  rootDir: string;
  projectConfigRoot?: string;
  action: c420uiAction;
  actions: c420uiAction[];
  env: Record<string, string>;
  rootPolicy?: { requiresRoot: boolean; reason?: string; actionEnv?: Record<string, string> };
  dryRun: boolean;
  yes: boolean;
  signal?: AbortSignal;
  requestRootAccess(request: c420uiRootAccessRequest): Promise<c420uiRootAccessRequestResult> | c420uiRootAccessRequestResult;
  emit?: C420UIEventSink;
  rootProvider?: c420uiRootProvider;
  actionEnv: NodeJS.ProcessEnv;
}): Promise<{ actionId: string; status: string; code: number } | undefined> {
  const binPath = resolveC420UIRustHostBinary(options.rootDir, options.env);

  return new Promise((resolve, reject) => {
    const child = spawn(binPath, ["action-run", "--json-lines"], {
      env: buildRustHostProcessEnv(options.env),
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const decoder = new StringDecoder("utf8");
    let stdoutPending = "";
    let stderrData = "";
    let finalEvent: { actionId: string; status: string; code: number } | undefined;
    let settled = false;
    const pendingEvents = new Set<Promise<void>>();

    async function waitForPendingEvents(): Promise<void> {
      while (pendingEvents.size > 0) {
        await Promise.all([...pendingEvents]);
      }
    }

    function settle(error?: Error): void {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(finalEvent);
    }

    function send(event: unknown): void {
      try {
        child.stdin.write(`${JSON.stringify(event)}\n`);
      } catch {}
    }

    function abort(): void {
      send({ event: "cancel" });
    }

    function processLine(line: string): void {
      const pending = handleRustActionEvent(line, options, send).then((event) => {
        if (event?.event === "action:finish") finalEvent = event;
      });
      pendingEvents.add(pending);
      pending.then(
        () => pendingEvents.delete(pending),
        (error) => {
          pendingEvents.delete(pending);
          settle(error);
        },
      );
    }

    child.on("error", (error) => settle(error));
    child.stderr.on("data", (chunk: Buffer) => {
      stderrData += chunk.toString();
    });
    child.stdout.on("data", (chunk: Buffer) => {
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
    child.stdin.on("error", () => {});

    options.signal?.addEventListener("abort", abort, { once: true });
    child.stdin.write(`${JSON.stringify({
      rootDir: options.rootDir,
      actionId: options.action.id,
      projectConfigRoot: options.projectConfigRoot,
      dryRun: options.dryRun,
      yes: options.yes,
      env: options.env,
      actions: options.projectConfigRoot ? [] : options.actions.map(toRustActionDefinition),
      rootPolicy: options.rootPolicy,
    })}\n`);
    if (options.signal?.aborted) abort();
  });
}

async function handleRustActionEvent(
  line: string,
  options: {
    rootDir: string;
    action: c420uiAction;
    emit?: C420UIEventSink;
    requestRootAccess(request: c420uiRootAccessRequest): Promise<c420uiRootAccessRequestResult> | c420uiRootAccessRequestResult;
    actionEnv: NodeJS.ProcessEnv;
  },
  send: (event: unknown) => void,
): Promise<RustActionEvent | undefined> {
  const event = JSON.parse(line) as RustActionEvent;
  if (event.event === "action:start") {
    options.emit?.(
      createC420UIEvent({
        type: "action:start",
        actionId: event.actionId,
        message: event.message,
        data: event.data,
      }),
    );
  } else if (event.event === "log") {
    options.emit?.(
      createC420UIEvent({
        type: "log",
        source: event.source as never,
        line: event.line,
        level: event.level as never,
      }),
    );
  } else if (event.event === "progress") {
    options.emit?.(
      createC420UIEvent({
        type: "progress",
        state: event.state as never,
        label: event.label,
        percent: event.percent,
      }),
    );
  } else if (event.event === "root-request") {
    const result = await options.requestRootAccess({
      action: options.action,
      rootDir: options.rootDir,
      actionEnv: options.actionEnv,
      reason: event.reason,
    });
    send({
      event: "root-response",
      requestId: event.requestId,
      accepted: result.ok === true,
      env: result.ok === true ? pickStringEnv(result.env ?? {}) : {},
    });
  } else if (event.event === "action:finish") {
    options.emit?.(
      createC420UIEvent({
        type: "action:finish",
        actionId: event.actionId,
        message: event.actionId,
        data: { exitCode: event.code, status: event.status },
      }),
    );
  } else if (event.event === "error") {
    options.emit?.(
      createC420UIEvent({
        type: "log",
        source: "system",
        level: "error",
        line: event.message,
      }),
    );
  }
  return event;
}

function toRustActionDefinition(action: c420uiAction): Record<string, unknown> {
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
    env: action.env ?? {},
  };
}

function normalizeActionStatus(status: string): c420uiActionResult["status"] {
  if (status === "success" || status === "planned" || status === "canceled") return status;
  return "failed";
}

function pickStringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") output[key] = value;
  }
  return output;
}

function resolveC420UIRustHostBinary(rootDir: string, env: NodeJS.ProcessEnv = {}): string {
  let binPath = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  if (!binPath) {
    const debugPath = path.join(rootDir, "build-resources/c420ui-rs/target/debug/c420ui-host");
    const releasePath = path.join(rootDir, "build-resources/c420ui-rs/target/release/c420ui-host");
    if (fs.existsSync(debugPath)) binPath = debugPath;
    else if (fs.existsSync(releasePath)) binPath = releasePath;
  }
  if (!binPath || !fs.existsSync(binPath)) {
    throw new Error("c420ui Rust host is missing. Run npm run build:c420ui-rs.");
  }
  return binPath;
}

function buildRustHostProcessEnv(env: NodeJS.ProcessEnv = {}): Record<string, string> {
  const childEnv: Record<string, string> = {};
  if (env.PATH) childEnv.PATH = env.PATH;
  else if (process.env.PATH) childEnv.PATH = process.env.PATH;
  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }
  return childEnv;
}
