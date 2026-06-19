import type { c420uiAction } from "./actions.js";
import type { C420UIConfig } from "./types.js";

export type C420UITuiRenderInput = {
  brand: {
    name: string;
    version: string;
    hash?: string;
    logoLines: string[];
  };
  project: {
    name: string;
    subtitle: string;
    version: string;
    displayVersion: string;
    phase?: string;
    hash?: string;
    logoLines: string[];
    releaseNotes: string;
    appId: string;
    executableName: string;
    repositoryUrl: string;
    launcherCommand: string;
  };
  actions: Array<{
    id: string;
    label: string;
    group: string;
    description?: string;
    warning?: string;
    dangerous?: boolean;
    planned?: boolean;
  }>;
  view:
    | "main"
    | "install"
    | "development"
    | "maintenance"
    | "settings"
    | "help";
  focusZone: "menu" | "diagnostics" | "content" | "logs";
  menu: {
    label: string;
    items: Array<{
      id: string;
      label: string;
      view?: C420UITuiRenderInput["view"];
      actionId?: string;
      description?: string;
      warning?: string;
      dangerous?: boolean;
      planned?: boolean;
    }>;
    selected: number;
  };
  panels: {
    detectedInstallations: { label: string; lines: string[] };
    generatedArtifacts: { label: string; lines: string[] };
    linuxArtifacts: { label: string; lines: string[] };
    content: { label: string; lines: string[] };
    logs: {
      label: string;
      lines: Array<{
        source: string;
        line: string;
        level?: string;
      }>;
    };
  };
  logs: Array<{
    source: string;
    line: string;
    level?: string;
  }>;
  footer: {
    textSelectionMode: boolean;
    items: string[];
  };
  progress?: {
    state: string;
    label?: string;
    percent?: number;
  };
  modal?: {
    kind: "confirm" | "input" | "message";
    title: string;
    message: string;
    dangerous?: boolean;
    secret?: boolean;
  };
  theme: {
    supportsTrueColor: boolean;
    colors: {
      lightBlue: string;
      blue: string;
      purple: string;
      success: string;
      warning: string;
      error: string;
      text: string;
      muted: string;
      background: string;
      surface: string;
      surfaceAlt: string;
      menuSelectedBg: string;
      menuSelectedFg: string;
      menuInactiveSelectedBg: string;
      menuInactiveSelectedFg: string;
      footerBg: string;
      footerFg: string;
      activeBorder: string;
      inactiveBorder: string;
      activeLabel: string;
      inactiveLabel: string;
      activeCellBg: string;
      activeCellFg: string;
    };
  };
};

export type C420UITuiRenderInputOptions = {
  config: C420UIConfig;
  actions: readonly c420uiAction[];
  logs?: C420UITuiRenderInput["logs"];
  progress?: C420UITuiRenderInput["progress"];
  view?: C420UITuiRenderInput["view"];
  focusZone?: C420UITuiRenderInput["focusZone"];
  menu?: C420UITuiRenderInput["menu"];
  panels?: Partial<C420UITuiRenderInput["panels"]>;
  footer?: C420UITuiRenderInput["footer"];
  modal?: C420UITuiRenderInput["modal"];
  theme?: C420UITuiRenderInput["theme"];
};

export function createC420UITuiRenderInput(
  options: C420UITuiRenderInputOptions,
): C420UITuiRenderInput {
  const { config } = options;
  const input: C420UITuiRenderInput = {
    brand: {
      name: requireNonEmpty(config.brand.name, "brand.name"),
      version: requireNonEmpty(config.brand.version, "brand.version"),
      hash: optionalNonEmpty(config.brand.hash),
      logoLines: config.brand.logoLines,
    },
    project: {
      name: requireNonEmpty(config.project.projectName, "project.name"),
      subtitle: requireNonEmpty(
        config.project.projectSubtitle,
        "project.subtitle",
      ),
      version: requireNonEmpty(
        config.project.fullVersion ?? config.project.displayVersion,
        "project.version",
      ),
      displayVersion: requireNonEmpty(
        config.project.displayVersion,
        "project.displayVersion",
      ),
      phase: optionalNonEmpty(config.project.phase),
      hash: optionalNonEmpty(config.project.hash),
      logoLines: config.project.logoLines,
      releaseNotes: config.releaseNotes,
      appId: requireNonEmpty(config.project.appId, "project.appId"),
      executableName: requireNonEmpty(
        config.project.executableName,
        "project.executableName",
      ),
      repositoryUrl: requireNonEmpty(
        config.project.repositoryUrl,
        "project.repositoryUrl",
      ),
      launcherCommand: requireNonEmpty(
        config.project.launcherCommand,
        "project.launcherCommand",
      ),
    },
    actions: options.actions.map((action) => ({
      id: requireNonEmpty(action.id, "action.id"),
      label: requireNonEmpty(action.label, `${action.id}.label`),
      group: requireNonEmpty(action.group, `${action.id}.group`),
      description: optionalNonEmpty(action.description),
      warning: optionalNonEmpty(action.warning),
      dangerous:
        action.dangerous === true ||
        action.requiresConfirmation === true ||
        undefined,
      planned: action.planned === true || action.kind === "planned" || undefined,
    })),
    view: options.view ?? "main",
    focusZone: options.focusZone ?? "menu",
    menu: options.menu ?? createLegacyMenu(options.view ?? "main", options.actions),
    panels: {
      detectedInstallations: options.panels?.detectedInstallations ?? {
        label: "Detected Installations",
        lines: [],
      },
      generatedArtifacts: options.panels?.generatedArtifacts ?? {
        label: "Generated Artifacts",
        lines: [],
      },
      linuxArtifacts: options.panels?.linuxArtifacts ?? {
        label: "Linux Artifacts",
        lines: [],
      },
      content: options.panels?.content ?? {
        label: "Overview",
        lines: createOverviewLines(config),
      },
      logs: options.panels?.logs ?? {
        label: "Logs",
        lines: (options.logs ?? []).map((log) => ({
          source: requireNonEmpty(log.source, "log.source"),
          line: String(log.line),
          level: optionalNonEmpty(log.level),
        })),
      },
    },
    logs: (options.logs ?? []).map((log) => ({
      source: requireNonEmpty(log.source, "log.source"),
      line: String(log.line),
      level: optionalNonEmpty(log.level),
    })),
    footer: options.footer ?? {
      textSelectionMode: false,
      items: [
        "Tab Focus",
        "Enter Select",
        "Space Toggle",
        "F5 Copy Logs",
        "? Help",
        "q Quit",
      ],
    },
    theme: options.theme ?? {
      supportsTrueColor: true,
      colors: {
        lightBlue: "#00C4CC",
        blue: "#007C89",
        purple: "#7D2AE8",
        success: "#00843D",
        warning: "#E67E22",
        error: "#EB001B",
        text: "#FFFFFF",
        muted: "#9EA1A2",
        background: "#0E1318",
        surface: "#181D23",
        surfaceAlt: "#252B33",
        menuSelectedBg: "#7D2AE8",
        menuSelectedFg: "#FFFFFF",
        menuInactiveSelectedBg: "#252B33",
        menuInactiveSelectedFg: "#00C4CC",
        activeBorder: "#00C4CC",
        inactiveBorder: "#252B33",
        activeLabel: "#FFFFFF",
        inactiveLabel: "#9EA1A2",
        activeCellBg: "#00C4CC",
        activeCellFg: "#000000",
        footerBg: "#181D23",
        footerFg: "#9EA1A2",
      },
    },
  };

  if (options.progress) {
    input.progress = {
      state: requireNonEmpty(options.progress.state, "progress.state"),
      label: optionalNonEmpty(options.progress.label),
      percent: options.progress.percent,
    };
  }

  if (options.modal) {
    input.modal = options.modal;
  }

  return input;
}

function createLegacyMenu(
  view: C420UITuiRenderInput["view"],
  actions: readonly c420uiAction[],
): C420UITuiRenderInput["menu"] {
  if (view === "main") {
    return {
      label: "Main Menu",
      items: [
        { id: "view-install", label: "Install", view: "install" },
        { id: "view-development", label: "Development", view: "development" },
        {
          id: "view-maintenance",
          label: "Maintenance & Uninstall",
          view: "maintenance",
        },
        {
          id: "view-settings",
          label: "Application Settings",
          view: "settings",
        },
        { id: "view-help", label: "Help", view: "help" },
      ],
      selected: 0,
    };
  }

  const group =
    view === "install"
      ? "install"
      : view === "maintenance"
        ? "maintenance"
        : "development";

  return {
    label: `${view.charAt(0).toUpperCase()}${view.slice(1)} Actions`,
    items: actions
      .filter((action) => action.group === group)
      .map((action) => ({
        id: requireNonEmpty(action.id, "action.id"),
        label: requireNonEmpty(action.label, `${action.id}.label`),
        description: optionalNonEmpty(action.description),
        warning: optionalNonEmpty(action.warning),
        dangerous:
          action.dangerous === true ||
          action.requiresConfirmation === true ||
          undefined,
        planned:
          action.planned === true || action.kind === "planned" || undefined,
        actionId: action.id,
      })),
    selected: 0,
  };
}

function createOverviewLines(config: C420UIConfig): string[] {
  return [
    ...config.project.logoLines,
    "",
    "Version:",
    `  ${config.project.displayVersion}`,
    "",
    "Hash:",
    `  ${config.project.hash ?? "unknown"}`,
    "",
    "Phase:",
    `  ${config.project.phase ?? "unknown"}`,
    "",
    "Version Release Notes:",
    `  ${config.releaseNotes}`,
    "",
    "Package / Version Information:",
    `  App ID: ${config.project.appId}`,
    `  Executable: ${config.project.executableName}`,
    `  Repository: ${config.project.repositoryUrl}`,
  ];
}

function requireNonEmpty(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`${label} is required`);
  return value;
}

function optionalNonEmpty(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}
