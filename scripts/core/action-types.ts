export const ACTION_GROUPS = ['install', 'development', 'maintenance'] as const;
export const ACTION_SECTIONS = ['Install', 'Package generation', 'Build', 'Validation', 'Maintenance', 'Uninstall'] as const;
export const ACTION_KINDS = ['command', 'planned', 'internal'] as const;
export const INSTALL_SCOPES = ['system', 'user'] as const;

export type ActionGroup = (typeof ACTION_GROUPS)[number];
export type ActionSection = (typeof ACTION_SECTIONS)[number];
export type ActionKind = (typeof ACTION_KINDS)[number];
export type InstallScope = (typeof INSTALL_SCOPES)[number];

type BaseAction = {
  id: string;
  label: string;
  group: ActionGroup;
  section: ActionSection;
  cli?: string[];
  longRunning?: boolean;
  dangerous?: boolean;
  planned?: boolean;
  description?: string;
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
  confirmationPhrase?: string;
  hidden?: boolean;
  requiresRoot?: boolean;
  scope?: InstallScope;
  warning?: string;
  env?: Record<string, string>;
};

export type CommandAction = BaseAction & {
  kind: 'command';
  command: string;
  args: string[];
};

export type PlannedAction = BaseAction & {
  kind: 'planned';
  command?: never;
  args?: never;
};

export type InternalAction = BaseAction & {
  kind: 'internal';
  command?: string;
  args?: string[];
};

export type CanvaAction = CommandAction | PlannedAction | InternalAction;
