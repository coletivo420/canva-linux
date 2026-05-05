import fs from 'node:fs';
import path from 'node:path';

export type TuiActionGroup = 'install' | 'development' | 'maintenance';
export type TuiActionKind = 'command' | 'planned' | 'internal';

export type TuiAction = {
  id: string;
  label: string;
  group: TuiActionGroup;
  section: string;
  kind: TuiActionKind;
  command?: string;
  args?: string[];
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
};

function actionsPath(rootDir = process.cwd()) {
  return path.join(rootDir, 'scripts/actions.json');
}

export function loadTuiActions(rootDir = process.cwd()): TuiAction[] {
  return JSON.parse(fs.readFileSync(actionsPath(rootDir), 'utf8')) as TuiAction[];
}

export function getActionsByGroup(group: TuiActionGroup, rootDir = process.cwd()): TuiAction[] {
  return loadTuiActions(rootDir).filter((action) => action.group === group && !action.hidden);
}
