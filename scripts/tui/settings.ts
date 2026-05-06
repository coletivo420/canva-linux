import fs from "node:fs";
import path from "node:path";

export const ROOT_LAUNCH_GUARD_MESSAGE = [
  "Do not run Canva Linux Install and Development Tool with sudo or as root.",
  "",
  "Run this tool as your regular user. When an operation needs administrator privileges, Canva Linux will ask for authentication only for that specific action.",
  "",
  "Running the whole tool as root may break file ownership, user sessions, build artifacts and desktop integration.",
].join("\n");

export type ToolSettings = {
  tool: {
    generalLogsEnabled: boolean;
    terminalTextSelectionMode: boolean;
  };
  runtime: Record<string, unknown>;
};

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  tool: {
    generalLogsEnabled: true,
    terminalTextSelectionMode: false,
  },
  runtime: {},
};

function configHome(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) return xdgConfigHome;
  return path.join(process.env.HOME || ".", ".config");
}

export function toolSettingsPath(): string {
  return path.join(configHome(), "canva-linux", "tool-settings.json");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSettings(raw: unknown): ToolSettings {
  const rawRoot = isObject(raw) ? raw : {};
  const rawTool = isObject(rawRoot.tool) ? rawRoot.tool : {};
  const runtime = isObject(rawRoot.runtime) ? rawRoot.runtime : {};

  return {
    tool: {
      generalLogsEnabled:
        typeof rawTool.generalLogsEnabled === "boolean"
          ? rawTool.generalLogsEnabled
          : DEFAULT_TOOL_SETTINGS.tool.generalLogsEnabled,
      terminalTextSelectionMode:
        typeof rawTool.terminalTextSelectionMode === "boolean"
          ? rawTool.terminalTextSelectionMode
          : DEFAULT_TOOL_SETTINGS.tool.terminalTextSelectionMode,
    },
    runtime,
  };
}

export function loadToolSettings(): ToolSettings {
  const settingsPath = toolSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    try {
      saveToolSettings(DEFAULT_TOOL_SETTINGS);
    } catch {
      // The TUI can still run with defaults when the config path is unavailable.
    }
    return structuredClone(DEFAULT_TOOL_SETTINGS);
  }

  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(settingsPath, "utf8")));
  } catch {
    return structuredClone(DEFAULT_TOOL_SETTINGS);
  }
}

export function saveToolSettings(settings: ToolSettings): void {
  const settingsPath = toolSettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    `${JSON.stringify(normalizeSettings(settings), null, 2)}\n`,
    "utf8",
  );
}
