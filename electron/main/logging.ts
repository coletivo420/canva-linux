"use strict";

const fs = require("fs");
const path = require("path");

const { normalizeArgs, createLogSignature } = require("./logging-normalize");

type CredentialStoragePolicy = import("./credential-storage").CredentialStoragePolicy;

type StatusLevel = "ok" | "warn" | "critical";
type LogOptions = { source?: string; level?: StatusLevel };
type AppLike = { getPath(name: string): string };
type DebugLog = (category: string, ...args: unknown[]) => boolean;
type StatusLogger = (
  category: string,
  level: StatusLevel,
  message: string,
  options?: { source?: string },
) => void;

const LOG_COLORS = {
  ok: "\x1b[32m",
  warn: "\x1b[33m",
  critical: "\x1b[31m",
  reset: "\x1b[0m",
};

const RELEASE_STATUS = {
  corrected: [
    "Global debug categories now use canonical names, including drag -> dnd compatibility.",
    "Window-open logging now distinguishes internal Canva tabs from real OAuth popup flows.",
    "Upload diagnostics now preserve ingress context from drop, paste, picker, and file-bearing network handoff.",
    "OAuth popup diagnostics no longer reference an undefined tab object during popup title or favicon updates.",
    "Linux no longer disables Electron hardware acceleration by default.",
    "GPU diagnostics are centralized in current.log.",
  ],
  validated: [
    "Application startup on Linux Wayland.",
    "Persistent session initialization and fixed Home tab shell behavior.",
    "Custom eyedropper behavior preserved after the global debug expansion.",
    "Host drag-and-drop into the Canva editor on Wayland with a real file drop.",
    "GPU backend selection with CANVA_GPU_BACKEND=auto,opengl,vulkan,software,force.",
    "Flatpak DRI access and Chromium GPU feature status logging.",
  ],
  underObservation: [
    "Host file picker continuation and clipboard-driven imports inside Canva.",
    "OAuth popup completion paths after the WebContentsView migration with a clean local session.",
    "Non-fatal DBus, VAAPI, and compositor warnings that do not block startup.",
    "Vulkan/ANGLE behavior across Intel, AMD, NVIDIA, Wayland, and X11.",
  ],
};

function errorMessage(error: unknown): string {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : String(error);
}

function formatTerminalPrefix({
  category,
  source = "main",
  level = "ok",
}: {
  category: string;
  source?: string;
  level?: StatusLevel;
}): string {
  const prefix = `[canva:${source}:${category}]`;
  const color = LOG_COLORS[level];
  if (!color) return prefix;
  return `${color}${prefix}${LOG_COLORS.reset}`;
}

function formatFilePrefix({
  category,
  source = "main",
  level = "ok",
}: {
  category: string;
  source?: string;
  level?: StatusLevel;
}): string {
  return `[canva:${source}:${category}:${level}]`;
}

function formatDebugList(items: string[] = []): string {
  return items.map((item, index) => `${index + 1}.${item}`).join(" | ");
}

function createCentralLogger({ app }: { app: AppLike }) {
  let logFilePath: string | null = null;
  let lastDebugSignature: string | null = null;

  function appendFileLine(prefix: string, normalizedArgs: string[]): void {
    if (!logFilePath) return;
    const line = `${new Date().toISOString()} ${prefix} ${normalizedArgs.join(" ")}\n`;
    try {
      fs.appendFileSync(logFilePath, line, "utf8");
    } catch {}
  }

  function write(
    level: StatusLevel,
    prefix: string,
    normalizedArgs: string[],
  ): void {
    if (level === "critical") {
      console.error(prefix, ...normalizedArgs);
      return;
    }
    if (level === "warn") {
      console.warn(prefix, ...normalizedArgs);
      return;
    }
    console.log(prefix, ...normalizedArgs);
  }

  function initLogFile(): string {
    const logsDirPath = path.join(app.getPath("userData"), "logs");
    const currentLogPath = path.join(logsDirPath, "current.log");
    fs.mkdirSync(logsDirPath, { recursive: true });
    if (fs.existsSync(currentLogPath)) {
      fs.unlinkSync(currentLogPath);
    }
    fs.writeFileSync(currentLogPath, "", "utf8");
    logFilePath = currentLogPath;
    return currentLogPath;
  }

  function logDebug(
    category: string,
    args: unknown[] = [],
    { source = "main", level = "ok" }: LogOptions = {},
  ): void {
    const normalizedArgs = normalizeArgs(args);
    const signature = createLogSignature([
      source,
      category,
      level,
      ...normalizedArgs,
    ]);
    if (signature === lastDebugSignature) {
      return;
    }
    lastDebugSignature = signature;

    const terminalPrefix = formatTerminalPrefix({ category, source, level });
    const filePrefix = formatFilePrefix({ category, source, level });
    write(level, terminalPrefix, normalizedArgs);
    appendFileLine(filePrefix, normalizedArgs);
  }

  function logStatus(
    category: string,
    level: StatusLevel,
    message: string,
    { source = "main" }: { source?: string } = {},
  ): void {
    const normalizedArgs = normalizeArgs([message]);
    const terminalPrefix = formatTerminalPrefix({ category, source, level });
    const filePrefix = formatFilePrefix({ category, source, level });
    write(level, terminalPrefix, normalizedArgs);
    appendFileLine(filePrefix, normalizedArgs);
  }

  return {
    initLogFile,
    logDebug,
    logStatus,
    getLogFilePath() {
      return logFilePath;
    },
  };
}

function createStatusLogger({
  app,
  debugLog,
  logStatus,
  appVersion,
}: {
  app: AppLike;
  debugLog: DebugLog;
  logStatus: StatusLogger;
  appVersion: string;
}) {
  function logReleaseStatus() {
    debugLog(
      "startup",
      "release",
      `version=${appVersion}`,
      `downloads=${app.getPath("downloads")}`,
    );
    debugLog("startup", "corrected", formatDebugList(RELEASE_STATUS.corrected));
    debugLog("startup", "validated", formatDebugList(RELEASE_STATUS.validated));
    debugLog(
      "startup",
      "under-observation",
      formatDebugList(RELEASE_STATUS.underObservation),
    );
  }

  function logCredentialStoragePolicy(policy: CredentialStoragePolicy) {
    const summary =
      `credential-storage-policy backend=${policy.backend} ` +
      `mode=${policy.mode} security=${policy.security} ` +
      `partition=${policy.partition} cache=${String(policy.cache)} ` +
      `persistentLoginAvailable=${String(policy.persistentLoginAvailable)}`;

    if (policy.mode === "ephemeral") {
      logStatus(
        "session",
        policy.security === "insecure-basic-text" ? "critical" : "warn",
        `${summary} WARNING: ${policy.warning || "Persistent login is disabled because secure credential storage could not be verified."}`,
      );
      return;
    }

    if (policy.security === "secure") {
      logStatus(
        "session",
        "ok",
        `${summary} OK: secure Linux secret storage backend detected.`,
      );
      return;
    }

    logStatus(
      "session",
      "ok",
      `${summary} OK: platform default credential storage policy selected.`,
    );
  }

  return {
    logCredentialStoragePolicy,
    logReleaseStatus,
    logStatus,
  };
}

export {
  createCentralLogger,
  createStatusLogger,
  errorMessage,
  formatDebugList,
  formatFilePrefix,
  formatTerminalPrefix,
};
