import { createApp } from './app';
import path from 'node:path';
import projectUi from '../project-ui.json';

function getPackageVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(path.join(process.cwd(), 'package.json')) as { version?: string };
  return pkg.version ?? 'unknown';
}

if (process.argv.includes('--help')) {
  console.log('Canva Linux TUI (experimental)\n\nUsage:\n  npm run tui\n  ./canva-linux.sh --tui');
  process.exit(0);
}

function getProjectPhase(): string {
  return process.env.CANVA_PROJECT_PHASE?.trim() || projectUi.phase || 'unknown';
}

try {
  const screen = createApp({
    version: `${projectUi.displayVersion ?? getPackageVersion()}${projectUi.status ? ` (${projectUi.status})` : ''}`,
    phase: getProjectPhase(),
    rootDir: process.cwd(),
    title: projectUi.tuiTitle,
    toolTitle: projectUi.toolTitle,
    releaseNotes: projectUi.versionReleaseNotes,
  });
  process.on('uncaughtException', (err) => { try { screen.destroy(); } catch {} console.error(err); process.exit(1); });
} catch (error) {
  console.error(error);
  process.exit(1);
}
