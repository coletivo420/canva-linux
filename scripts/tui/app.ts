import blessed from 'blessed';
import { CANVA_LOGO_LINES } from './logo';
import { developmentActions } from './actions';
import { runAction } from './process-runner';

export function createApp(opts: { version: string; phase: string; rootDir: string; }) {
  const screen = blessed.screen({ smartCSR: true, title: 'Canva Linux TUI', fullUnicode: true });
  const header = blessed.box({ top: 0, height: 2, width: '100%', tags: true, content: `{bold}Canva Linux{/bold}  ${opts.version}\nPhase: ${opts.phase}` });
  const menu = blessed.list({ top: 2, left: 0, width: '35%', height: '85%', keys: true, mouse: true, border: 'line', label: 'Main Menu', items: ['Install', 'Development', 'Maintenance & Uninstall', 'Help'] });
  const content = blessed.box({ top: 2, left: '35%', width: '65%', height: '55%', border: 'line', label: 'Overview', tags: true, content: CANVA_LOGO_LINES.join('\n') });
  const logs = blessed.log({ top: '57%', left: '35%', width: '65%', height: '30%', border: 'line', label: 'Logs', keys: true, mouse: true, scrollback: 1000, tags: true });
  const footer = blessed.box({ bottom: 0, height: 1, width: '100%', content: 'q Quit | Enter Select | Esc Back | Tab Focus | ? Help' });
  screen.append(header); screen.append(menu); screen.append(content); screen.append(logs); screen.append(footer);

  const showDev = () => {
    menu.setItems(developmentActions.map((a) => a.label));
    menu.select(0);
    content.setLabel('Development');
    content.setContent('Press Enter to run Doctor.');
    screen.render();
  };

  menu.on('select', (_, index) => {
    if (index === 1) {
      showDev();
      return;
    }
    if (menu.items.length === 1 || menu.items[0]?.getText().includes('Doctor')) {
      const action = developmentActions[0];
      content.setLabel('Canva Linux — Doctor');
      content.setContent('Status: Running');
      logs.log(`$ ${action.command} ${action.args.join(' ')}`);
      runAction(action.command, action.args, (line) => { logs.log(line.trimEnd()); screen.render(); }, (code) => {
        content.setContent(code === 0 ? 'Status: Success' : `Status: Failed (${code ?? 'null'})`);
        screen.render();
      });
    }
  });

  screen.key(['q', 'C-c'], () => { screen.destroy(); process.exit(0); });
  screen.key(['escape'], () => {
    menu.setItems(['Install', 'Development', 'Maintenance & Uninstall', 'Help']);
    menu.select(0);
    content.setLabel('Overview');
    content.setContent(CANVA_LOGO_LINES.join('\n'));
    screen.render();
  });
  screen.key(['?'], () => {
    content.setLabel('Help');
    content.setContent('Use arrows and Enter. Esc goes back. q exits.');
    screen.render();
  });
  menu.focus();
  screen.render();
  return screen;
}
