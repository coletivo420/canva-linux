import blessed from 'blessed';
import type { ChildProcess } from 'node:child_process';
import { CANVA_LOGO_LINES } from './logo';
import { getActionsByGroup, type TuiAction } from './action-registry';
import { runAction } from './process-runner';

type View = 'main' | 'install' | 'development' | 'maintenance' | 'help' | 'logs';

export function createApp(opts: { version: string; phase: string; rootDir: string }) {
  const screen = blessed.screen({ smartCSR: true, title: 'Canva Linux TUI', fullUnicode: true });
  const header = blessed.box({ top: 0, height: 2, width: '100%', tags: true, content: `{bold}Canva Linux{/bold}  ${opts.version}\nPhase: ${opts.phase}` });
  const menu = blessed.list({ top: 2, left: 0, width: '35%', height: '85%', keys: true, mouse: true, border: 'line', label: 'Main Menu' });
  const content = blessed.box({ top: 2, left: '35%', width: '65%', height: '55%', border: 'line', label: 'Overview', tags: true });
  const logs = blessed.log({ top: '57%', left: '35%', width: '65%', height: '30%', border: 'line', label: 'Logs', keys: true, mouse: true, scrollback: 5000, tags: true });
  const footer = blessed.box({ bottom: 0, height: 1, width: '100%', content: 'q Quit | Enter Select | Esc Back | Tab Focus | ? Help' });
  screen.append(header); screen.append(menu); screen.append(content); screen.append(logs); screen.append(footer);

  const mainItems: Array<{ label: string; view: View }> = [
    { label: 'Install', view: 'install' },
    { label: 'Development', view: 'development' },
    { label: 'Maintenance & Uninstall', view: 'maintenance' },
    { label: 'Help', view: 'help' },
  ];

  let currentView: View = 'main';
  let currentActions: TuiAction[] = [];
  let running = false;
  let currentChild: ChildProcess | null = null;
  let renderScheduled = false;

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    setTimeout(() => { renderScheduled = false; screen.render(); }, 50);
  }

  function appendLogText(text: string) {
    for (const line of text.split(/\r?\n/)) if (line.length > 0) logs.log(line);
    scheduleRender();
  }

  function setView(view: View) {
    currentView = view;
    if (view === 'main') {
      currentActions = [];
      menu.setItems(mainItems.map((item) => item.label));
      content.setLabel('Overview');
      content.setContent(CANVA_LOGO_LINES.join('\n'));
      screen.render();
      return;
    }
    if (view === 'help') {
      currentActions = [];
      menu.setItems(['Back to Main']);
      content.setLabel('Help');
      content.setContent('Use arrows and Enter. Esc goes back. q exits.');
      screen.render();
      return;
    }
    const group = view === 'install' ? 'install' : view === 'maintenance' ? 'maintenance' : 'development';
    currentActions = getActionsByGroup(group);
    menu.setItems(currentActions.map((action) => action.label));
    content.setLabel(view[0].toUpperCase() + view.slice(1));
    content.setContent('Select an action and press Enter.');
    screen.render();
  }

  function runTuiAction(action: TuiAction) {
    if (action.kind === 'planned' || action.planned) {
      content.setLabel(action.label);
      content.setContent('This action is planned and not implemented in this phase.');
      screen.render();
      return;
    }
    if (action.dangerous) {
      content.setLabel(action.label);
      content.setContent('This action is dangerous. Confirmation dialogs will be added in the next phase.');
      screen.render();
      return;
    }
    if (!action.command) return;
    if (running) {
      appendLogText('[warn] Another action is already running.\n');
      return;
    }
    running = true;
    content.setLabel(`Canva Linux — ${action.label}`);
    content.setContent('Status: Running');
    logs.log(`$ ${action.command} ${(action.args ?? []).join(' ')}`);
    currentChild = runAction(action.command, action.args ?? [], (text) => appendLogText(text), (code) => {
      running = false;
      currentChild = null;
      content.setContent(code === 0 ? 'Status: Success' : `Status: Failed (${code ?? 'null'})`);
      screen.render();
    });
  }

  menu.on('select', (_, index) => {
    if (currentView === 'main') {
      const selected = mainItems[index];
      if (selected) setView(selected.view);
      return;
    }
    if (currentView === 'help') {
      setView('main');
      return;
    }
    const action = currentActions[index];
    if (action) runTuiAction(action);
  });

  screen.key(['q', 'C-c'], () => { if (currentChild && running) currentChild.kill('SIGINT'); screen.destroy(); process.exit(0); });
  screen.key(['escape'], () => setView('main'));
  screen.key(['?'], () => setView('help'));

  setView('main');
  menu.focus();
  return screen;
}
