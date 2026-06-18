import type { C420UIActionDescriptor } from "./actions.js";
import type { C420UIConfig } from "./types.js";

export type C420UITuiRenderInput = {
  brand: {
    name: string;
    version: string;
    hash?: string;
  };
  project: {
    name: string;
    subtitle: string;
    version: string;
    phase?: string;
    hash?: string;
  };
  actions: Array<{
    id: string;
    label: string;
    group: string;
    dangerous?: boolean;
    planned?: boolean;
  }>;
  logs: Array<{
    source: string;
    line: string;
    level?: string;
  }>;
  progress?: {
    state: string;
    label?: string;
    percent?: number;
  };
};

export type C420UITuiRenderInputOptions = {
  config: C420UIConfig;
  actions: readonly C420UIActionDescriptor[];
  logs?: C420UITuiRenderInput["logs"];
  progress?: C420UITuiRenderInput["progress"];
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
    },
    project: {
      name: requireNonEmpty(config.project.projectName, "project.name"),
      subtitle: requireNonEmpty(config.project.projectSubtitle, "project.subtitle"),
      version: requireNonEmpty(
        config.project.fullVersion ?? config.project.displayVersion,
        "project.version",
      ),
      phase: optionalNonEmpty(config.project.phase),
      hash: optionalNonEmpty(config.project.hash),
    },
    actions: options.actions.map((action) => ({
      id: requireNonEmpty(action.id, "action.id"),
      label: requireNonEmpty(action.label, `${action.id}.label`),
      group: requireNonEmpty(action.group, `${action.id}.group`),
      dangerous: action.dangerous === true || action.requiresConfirmation === true || undefined,
      planned: action.planned === true || action.kind === "planned" || undefined,
    })),
    logs: (options.logs ?? []).map((log) => ({
      source: requireNonEmpty(log.source, "log.source"),
      line: String(log.line),
      level: optionalNonEmpty(log.level),
    })),
  };

  if (options.progress) {
    input.progress = {
      state: requireNonEmpty(options.progress.state, "progress.state"),
      label: optionalNonEmpty(options.progress.label),
      percent: options.progress.percent,
    };
  }

  return input;
}

function requireNonEmpty(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`${label} is required`);
  return value;
}

function optionalNonEmpty(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}
