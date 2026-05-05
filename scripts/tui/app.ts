import blessed from 'blessed';
import { spawn, type ChildProcess } from 'node:child_process';
import { CANVA_LOGO_LINES } from './logo';
import { getActionsByGroup, type TuiAction } from './action-registry';
import { confirmDialog, inputDialog } from './modal';
import { runAction } from './process-runner';
import { tuiTheme } from './theme';
import { copyTextToClipboard } from './clipboard';

type View = 'main' | 'install' | 'development' | 'maintenance' | 'help';
type ProcessState = 'idle' | 'running' | 'cancel-requested' | 'success' | 'failed' | 'canceled';
type LogSource = 'stdout' | 'stderr' | 'system';

const SWITCH_TO_SHELL_EXIT_CODE = 42;
const MAX_LOG_HISTORY_LINES = 5000;

export function createApp(opts: { version: string; phase: string; rootDir: string; title: string; toolTitle: string; releaseNotes: string }) {
  const screen = blessed.screen({ smartCSR: true, title: opts.title, fullUnicode: true });
  const header = blessed.box({ top: 0, height: 2, width: '100%', tags: true, content: `{bold}${opts.toolTitle}{/bold}\nPhase: ${opts.phase}`, style: tuiTheme.header });
  const menu = blessed.list({ top: 2, left: 0, width: '32%', height: '100%-3', keys: true, mouse: true, border: 'line', label: 'Main Menu', style: tuiTheme.menu });
  const content = blessed.box({ top: 2, left: '32%', width: '68%', height: '36%', border: 'line', label: 'Overview', tags: true, scrollable: true, alwaysScroll: true, style: tuiTheme.content });
  const logs = blessed.log({ top: '38%', left: '32%', width: '68%', height: '59%', border: 'line', label: 'Logs', keys: true, mouse: true, scrollable: true, alwaysScroll: true, scrollbar: { ch: ' ', track: { bg: tuiTheme.colors.surfaceAlt }, style: { bg: tuiTheme.colors.lightBlue } }, scrollback: MAX_LOG_HISTORY_LINES, tags: true, style: tuiTheme.logs });
  const footer = blessed.box({ bottom: 0, height: 1, width: '100%', tags: true, content: '{bold}q{/bold} Quit | {bold}Esc{/bold} Back | {bold}Enter{/bold} Select | {bold}F4{/bold} Shell Tool | {bold}F5{/bold} Copy Logs | {bold}?{/bold} Help', style: tuiTheme.footer });
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
  let modalActive = false;
  let currentChild: ChildProcess | null = null;
  const logBuffers: Record<LogSource, string> = { stdout: '', stderr: '', system: '' };
  const logHistory: string[] = [];

  let overviewStatus: any = null;
  let overviewLoading = false;

  const detectedSummary = (s: any) => {
    if (!s) return [
      `  Native Install: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
      `  Flatpak Install: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
      `  AppImage artifacts: {${tuiTheme.colors.appImageLoading}-fg}loading...{/${tuiTheme.colors.appImageLoading}-fg}`,
    ];
    const i = s.installations;
    const native = i.nativeSystem && i.nativeUser ? 'detected (system + user)' : i.nativeSystem ? 'detected (system)' : i.nativeUser ? 'detected (user)' : 'not detected';
    const flatpak = i.flatpakSystem && i.flatpakUser ? 'detected (system + user)' : i.flatpakSystem ? 'detected (system)' : i.flatpakUser ? 'detected (user)' : 'not detected';
    const nativeColor = native.startsWith('detected') ? tuiTheme.colors.nativeDetected : tuiTheme.colors.flatpakNotDetected;
    const flatpakColor = flatpak.startsWith('not detected') ? tuiTheme.colors.flatpakNotDetected : tuiTheme.colors.nativeDetected;
    const appImageValue = i.appImageArtifacts ? 'detected' : 'loading...';
    const appImageColor = i.appImageArtifacts ? tuiTheme.colors.nativeDetected : tuiTheme.colors.appImageLoading;
    return [
      `  Native Install: {${nativeColor}-fg}${native}{/${nativeColor}-fg}`,
      `  Flatpak Install: {${flatpakColor}-fg}${flatpak}{/${flatpakColor}-fg}`,
      `  AppImage artifacts: {${appImageColor}-fg}${appImageValue}{/${appImageColor}-fg}`,
    ];
  };

  function refreshOverviewStatus(): void {
    if (overviewLoading) return;
    overviewLoading = true;
    const child = spawn('node', ['scripts/overview-status.js'], { cwd: opts.rootDir, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout?.on('data', (chunk) => { out += String(chunk); });
    child.on('close', () => {
      overviewLoading = false;
      try { overviewStatus = JSON.parse(out.trim()); } catch {}
      if (currentView === 'main' || currentView === 'maintenance') setView(currentView);
    });
  }

  function appendLogLine(line: string, source: LogSource) {
    logHistory.push(line);
    if (logHistory.length > MAX_LOG_HISTORY_LINES) logHistory.shift();
    const msg = line.replace(/[{}]/g, (c) => (c === '{' ? '\\{' : '\\}'));
    if (source === 'stderr') logs.log(`{red-fg}${msg}{/red-fg}`);
    else if (source === 'system') logs.log(`{cyan-fg}${msg}{/cyan-fg}`);
    else logs.log(msg);
    if (source !== 'stderr' && /\[sudo\].*password/i.test(line) && currentChild?.stdin && !modalActive) {
      modalActive = true;
      void inputDialog(screen, 'Root password required', 'Please enter your root password:').then((value) => {
        if (value === null) appendLogText('[warn] Root password prompt canceled.\n', 'system');
        else currentChild?.stdin?.write(`${value}\n`);
      }).finally(() => { modalActive = false; screen.render(); });
    }
  }
  function appendLogText(text: string, source: LogSource = 'stdout') {
    logBuffers[source] += text;
    while (true) {
      const m = logBuffers[source].match(/\r?\n/);
      if (!m || m.index === undefined) break;
      const i = m.index;
      const n = m[0].length;
      appendLogLine(logBuffers[source].slice(0, i), source);
      logBuffers[source] = logBuffers[source].slice(i + n);
    }
    screen.render();
  }

  function setView(view: View) {
    currentView = view;
    if (view === 'main') {
      const status = overviewStatus;
      if (!overviewStatus) refreshOverviewStatus();
      currentActions = [];
      menu.setItems(mainItems.map((item) => item.label));
      content.setLabel('Overview');
      content.setContent([
        `{${tuiTheme.colors.logo}-fg}${CANVA_LOGO_LINES.join('\n')}{/${tuiTheme.colors.logo}-fg}`, '', 'Version:', `  {${tuiTheme.colors.version}-fg}${opts.version}{/${tuiTheme.colors.version}-fg}`, '', 'Phase:', `  {${tuiTheme.colors.phase}-fg}${opts.phase}{/${tuiTheme.colors.phase}-fg}`, '', 'Version Release Notes:', `  ${opts.releaseNotes}`,
        '', 'Package / Version Information:', '  App ID: io.github.coletivo420.canva-linux', '  Executable: canva-linux', '  Repository: https://github.com/coletivo420/canva-linux',
        '', 'Detected Installation State:', ...detectedSummary(status),
      ].join('\n'));
      screen.render();
      return;
    }
    if (view === 'help') {
      currentActions = [];
      menu.setItems(['Back to Main']);
      content.setLabel('Help');
      content.setContent('Navigation:\n  ↑/↓        Move selection\n  Enter      Select action\n  Esc        Confirm exit\n  q          Quit\n  F4         Switch to Shell Tool\n\nLogs:\n  F5         Copy logs to clipboard\n  PageUp/PageDown/Home/End\n\nClipboard order:\n  wl-copy -> KDE qdbus6/qdbus -> GPaste -> xclip -> xsel');
      screen.render();
      return;
    }
    const group = view === 'install' ? 'install' : view === 'maintenance' ? 'maintenance' : 'development';
    currentActions = getActionsByGroup(group, opts.rootDir);
    menu.setItems(currentActions.map((a) => a.label));
    content.setLabel(view[0].toUpperCase() + view.slice(1));
    const infoByView: Record<'install' | 'development' | 'maintenance', string[]> = {
      install: [
        'Install actions',
        '- Native Install: installs outside Flatpak sandbox (system/user).',
        '- Flatpak Install: local sandboxed installation (system/user).',
        '- Review action description before running.',
      ],
      development: [
        'Development actions',
        '- Build runtime and linux-unpacked artifacts.',
        '- Generate Flatpak/AppImage packages.',
        '- Run validations and doctor diagnostics.',
      ],
      maintenance: [
        'Maintenance actions',
        '- Clean build artifacts and reset user data.',
        '- Uninstall Native/Flatpak variants.',
        '- Purge removes installs and user data (dangerous).',
      ],
    };
    const selected = currentActions[menu.selected] ?? null;
    const selectedInfo = selected
      ? ['', 'Selected action:', `  ${selected.label}`, `  ${selected.description ?? 'No description available.'}`, `  Risk: ${selected.dangerous ? 'high' : 'normal'}`, `  Long running: ${selected.longRunning ? 'yes' : 'no'}`, `  Command: ${selected.command ? `${selected.command} ${(selected.args ?? []).join(' ')}`.trim() : 'planned / unavailable'}`]
      : [];
    const maintenanceState = view === 'maintenance' ? ['', 'Detected Installation State:', ...detectedSummary(overviewStatus)] : [];
    content.setContent([...infoByView[group as 'install' | 'development' | 'maintenance'], ...selectedInfo, ...maintenanceState].join('\n'));
    screen.render();
  }

  menu.on('select', async (_, index) => {
    if (running || modalActive) return;
    if (currentView === 'main') return setView(mainItems[index]?.view ?? 'main');
    if (currentView === 'help') return setView('main');
    const action = currentActions[index];
    if (!action) return;
    if (action.dangerous) {
      modalActive = true;
      const ok = await confirmDialog(screen, { title: action.confirmationTitle ?? 'Confirm', message: action.confirmationMessage ?? action.description ?? 'Continue?', dangerous: true });
      modalActive = false;
      if (!ok) return;
    }
    if (!action.command) return;
    running = true;
    logs.setContent('');
    logHistory.length = 0;
    appendLogText(`$ ${action.command} ${(action.args ?? []).join(' ')}\n`, 'system');
    currentChild = runAction(action.command, action.args ?? [], (txt, src) => appendLogText(txt, src), ({ code, signal }) => {
      running = false;
      currentChild = null;
      appendLogText(`[info] Action finished (${signal ?? code ?? 'unknown'}).\n`, 'system');
      setView(currentView);
    });
  });

  const confirmExit = async () => {
    if (modalActive) return;
    modalActive = true;
    const ok = await confirmDialog(screen, { title: 'Exit Application', message: 'Do you want to exit the application?', confirmLabel: 'Yes', cancelLabel: 'No' });
    modalActive = false;
    if (ok) { screen.destroy(); process.exit(0); }
  };

  screen.key(['q'], () => { void confirmExit(); });
  screen.key(['escape'], () => {
    if (modalActive) return;
    if (running) { void confirmExit(); return; }
    if (currentView === 'main') { void confirmExit(); return; }
    setView('main');
  });
  screen.key(['C-c'], () => {
    screen.destroy();
    process.exit(130);
  });
  screen.key(['f4'], () => {
    if (modalActive) return;
    if (running) { appendLogText('[warn] Cannot switch tools while an action is running.\n', 'system'); return; }
    screen.destroy(); process.exit(SWITCH_TO_SHELL_EXIT_CODE);
  });
  screen.key(['f5'], () => { const result = copyTextToClipboard(logHistory.join('\n')); appendLogText(`${result.ok ? '[ok]' : '[warn]'} ${result.message}\n`, 'system'); });
  screen.key(['pageup'], () => { logs.scroll(-10); screen.render(); });
  screen.key(['pagedown'], () => { logs.scroll(10); screen.render(); });
  screen.key(['home'], () => { logs.setScrollPerc(0); screen.render(); });
  screen.key(['end'], () => { logs.setScrollPerc(100); screen.render(); });
  screen.key(['?'], () => { if (!running && !modalActive) setView('help'); });

  setView('main');
  refreshOverviewStatus();
  menu.focus();
  return screen;
}
