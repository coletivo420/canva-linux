import blessed from 'blessed';
import type { ChildProcess } from 'node:child_process';
import { CANVA_LOGO_LINES } from './logo';
import { getActionsByGroup, type TuiAction } from './action-registry';
import { confirmDialog } from './modal';
import { runAction } from './process-runner';
import { tuiTheme } from './theme';

type View = 'main' | 'install' | 'development' | 'maintenance' | 'help' | 'logs';
type ProcessState = 'idle' | 'running' | 'cancel-requested' | 'success' | 'failed' | 'canceled';

export function createApp(opts: { version: string; phase: string; rootDir: string; title: string; toolTitle: string; releaseNotes: string }) {
  const screen = blessed.screen({ smartCSR: true, title: opts.title, fullUnicode: true });
  const header = blessed.box({ top: 0, height: 2, width: '100%', tags: true, content: `{bold}${opts.toolTitle}{/bold}\nPhase: ${opts.phase}`, style: tuiTheme.header });
  const menu = blessed.list({ top: 2, left: 0, width: '35%', height: '85%', keys: true, mouse: true, border: 'line', label: 'Main Menu', style: tuiTheme.menu });
  const content = blessed.box({ top: 2, left: '35%', width: '65%', height: '55%', border: 'line', label: 'Overview', tags: true, style: tuiTheme.content });
  const logs = blessed.log({ top: '57%', left: '35%', width: '65%', height: '30%', border: 'line', label: 'Logs', keys: true, mouse: true, scrollback: 5000, tags: true, style: tuiTheme.logs });
  const footer = blessed.box({ bottom: 0, height: 1, width: '100%', tags: true, content: `{bold}q{/bold} Quit | {bold}Enter{/bold} Select | {bold}Esc{/bold} Back | {bold}?{/bold} Help | PageUp/PageDown Logs`, style: tuiTheme.footer });
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
  let processState: ProcessState = 'idle';
  let currentAction: TuiAction | null = null;
  let currentChild: ChildProcess | null = null;
  let renderScheduled = false;
  let modalActive = false;
  type LogSource = 'stdout' | 'stderr' | 'system';
  const logBuffers: Record<LogSource, string> = { stdout: '', stderr: '', system: '' };

  function scheduleRender() { if (!renderScheduled) { renderScheduled = true; setTimeout(() => { renderScheduled = false; screen.render(); }, 50); } }
  function escapeBlessedTags(text: string) { return text.replace(/[{}]/g, (char) => (char === '{' ? '\\{' : '\\}')); }
  function appendLogLine(line: string, source: LogSource) { const escaped = escapeBlessedTags(line); if (source === 'stderr') return logs.log(`{red-fg}${escaped}{/red-fg}`); if (source === 'system') return logs.log(`{cyan-fg}${escaped}{/cyan-fg}`); logs.log(escaped); }
  function appendLogText(text: string, source: LogSource = 'stdout') { logBuffers[source] += text; while (true) { const match = logBuffers[source].match(/\r?\n/); if (!match || match.index === undefined) break; const i = match.index; const n = match[0].length; appendLogLine(logBuffers[source].slice(0, i), source); logBuffers[source] = logBuffers[source].slice(i + n);} scheduleRender(); }
  function flushLogBuffer(source: LogSource) { if (logBuffers[source].length > 0) { appendLogLine(logBuffers[source], source); logBuffers[source] = ''; }}
  function flushAllLogBuffers() { flushLogBuffer('stdout'); flushLogBuffer('stderr'); flushLogBuffer('system'); }
  function resetLogBuffers() { logBuffers.stdout = ''; logBuffers.stderr = ''; logBuffers.system = ''; }
  function appendCommandPreview(action: TuiAction) { appendLogText(`$ ${action.command} ${(action.args ?? []).join(' ')}\n`, 'system'); scheduleRender(); }
  function ensureIdleForNavigation() { if (!running) return true; appendLogText('[warn] An action is running. Cancel or wait before navigating.\n', 'system'); return false; }

  function updateActionStatus(action: TuiAction, status: ProcessState, detail?: string) {
    content.setLabel(`Canva Linux — ${action.label}`);
    content.setContent([
      `Section: ${action.section}`,
      `Action: ${action.label}`,
      '',
      `Status: ${status}`,
      detail ? `Detail: ${detail}` : '',
      '',
      `Command: ${action.command} ${(action.args ?? []).join(' ')}`,
      '',
      'Hints:',
      '  Ctrl+C cancel running action',
      '  q cancel/quit',
      '  PageUp/PageDown scroll logs',
      '  Esc returns when idle',
    ].filter(Boolean).join('\n'));
  }

  function setView(view: View) {
    currentView = view;
    if (view === 'main') { currentActions = []; menu.setItems(mainItems.map((item) => item.label)); content.setLabel('Overview'); content.setContent([CANVA_LOGO_LINES.join('\n'), '', `{bold}{cyan-fg}Version:{/cyan-fg}{/bold}`, `  ${opts.version}`, '', `{bold}{magenta-fg}Phase:{/magenta-fg}{/bold}`, `  ${opts.phase}`, '', `{bold}{cyan-fg}Version Release Notes:{/cyan-fg}{/bold}`, `  ${opts.releaseNotes}`].join('\n')); screen.render(); return; }
    if (view === 'help') { currentActions = []; menu.setItems(['Back to Main']); content.setLabel('Help'); content.setContent('Navigation:\n  ↑/↓        Move selection\n  Enter      Select action\n  Esc        Back to main menu when idle\n  q          Quit when idle / cancel prompt when running\n  Ctrl+C     Request cancellation when running\n  ?          Help\n\nLogs:\n  PageUp     Scroll logs up\n  PageDown   Scroll logs down\n  Home       Top of logs\n  End        Bottom of logs\n  Ctrl+L     Clear logs when idle\n\nProcess:\n  Running actions block navigation.\n  Canceling sends SIGINT first.\n  Some actions may take several minutes.'); screen.render(); return; }
    const group = view === 'install' ? 'install' : view === 'maintenance' ? 'maintenance' : 'development';
    currentActions = getActionsByGroup(group, opts.rootDir); menu.setItems(currentActions.map((action) => action.label)); content.setLabel(view[0].toUpperCase() + view.slice(1)); content.setContent('Select an action and press Enter.'); screen.render();
  }

  async function requestCancelCurrentProcess(reason = 'Cancel running action') {
    if (!currentChild || !running || modalActive) return;
    modalActive = true;
    try {
      const confirmed = await confirmDialog(screen, { title: reason, message: `Cancel "${currentAction?.label ?? 'current action'}"?\n\nThis will send SIGINT to the running process.`, dangerous: true, confirmLabel: 'Cancel action', cancelLabel: 'Keep running' });
      if (!confirmed) return;
      processState = 'cancel-requested';
      appendLogText('[warn] Cancellation requested. Sending SIGINT...\n', 'system');
      if (currentAction) updateActionStatus(currentAction, processState);
      currentChild.kill('SIGINT');
      setTimeout(() => { if (running && currentChild) { appendLogText('[warn] Process did not exit after SIGINT. Sending SIGTERM...\n', 'system'); currentChild.kill('SIGTERM'); } }, 5000);
      scheduleRender();
    } finally {
      modalActive = false;
    }
  }

  async function runTuiAction(action: TuiAction) {
    if (action.kind === 'planned' || action.planned) { content.setLabel(action.label); content.setContent(action.description ?? 'This action is planned and not implemented in this phase.'); screen.render(); return; }
    if (!action.command) return;
    if (running) { appendLogText('[warn] Another action is already running.\n', 'system'); return; }
    if (action.dangerous) {
      if (modalActive) return;
      modalActive = true;
      try {
        const confirmed = await confirmDialog(screen, { title: action.confirmationTitle ?? 'Confirm destructive action', message: action.confirmationMessage ?? action.description ?? 'This action is destructive. Continue?', dangerous: true, confirmLabel: 'Yes, continue', cancelLabel: 'Cancel' });
        if (!confirmed) { appendLogText('[info] Action canceled by user.\n', 'system'); return; }
      } finally {
        modalActive = false;
      }
    }

    running = true; processState = 'running'; currentAction = action;
    updateActionStatus(action, processState); logs.setContent(''); resetLogBuffers(); appendCommandPreview(action);
    currentChild = runAction(action.command, action.args ?? [], (text, source) => appendLogText(text, source), (result) => {
      flushAllLogBuffers(); running = false; currentChild = null;
      if (result.signal) { processState = 'canceled'; updateActionStatus(action, processState, result.signal); }
      else if (result.code === 0) { processState = 'success'; updateActionStatus(action, processState); }
      else { processState = 'failed'; updateActionStatus(action, processState, `${result.code ?? 'null'}`); }
      screen.render();
    });
  }

  menu.on('select', (_, index) => {
    if (currentView === 'main') { if (!ensureIdleForNavigation()) return; const selected = mainItems[index]; if (selected) setView(selected.view); return; }
    if (currentView === 'help') { if (!ensureIdleForNavigation()) return; setView('main'); return; }
    if (!ensureIdleForNavigation()) return;
    const action = currentActions[index]; if (action) void runTuiAction(action);
  });

  screen.key(['q'], async () => { if (modalActive) return; if (running) { await requestCancelCurrentProcess('Cancel running action'); return; } screen.destroy(); process.exit(0); });
  screen.key(['C-c'], async () => { if (modalActive) return; if (running) { await requestCancelCurrentProcess('Ctrl+C requested. Confirm cancellation?'); return; } screen.destroy(); process.exit(0); });
  screen.key(['escape'], () => { if (modalActive || !ensureIdleForNavigation()) return; setView('main'); });
  screen.key(['?'], () => { if (modalActive || !ensureIdleForNavigation()) return; setView('help'); });
  screen.key(['pageup'], () => { logs.scroll(-10); screen.render(); });
  screen.key(['pagedown'], () => { logs.scroll(10); screen.render(); });
  screen.key(['home'], () => { logs.setScrollPerc(0); screen.render(); });
  screen.key(['end'], () => { logs.setScrollPerc(100); screen.render(); });
  screen.key(['C-l'], () => { if (running) { appendLogText('[warn] Cannot clear logs while an action is running.\n', 'system'); return; } logs.setContent(''); resetLogBuffers(); screen.render(); });
  screen.on('resize', () => screen.render());

  menu.on('focus', () => { menu.style.border = { fg: tuiTheme.colors.lightBlue }; screen.render(); });
  menu.on('blur', () => { menu.style.border = { fg: tuiTheme.colors.blue }; screen.render(); });

  setView('main'); menu.focus(); return screen;
}
