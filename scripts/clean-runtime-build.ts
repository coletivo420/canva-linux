import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, '..');
const buildDir = path.join(repoRoot, '.build');

export function main(): void {
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log('[runtime-build] removed .build');
}

if (require.main === module) main();
