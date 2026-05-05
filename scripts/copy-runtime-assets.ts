import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, '..');
const copies: ReadonlyArray<readonly [from: string, to: string]> = [
  ['electron/assets', '.build/electron/assets'],
  ['electron/ui', '.build/electron/ui'],
];

export function main(): void {
  for (const [from, to] of copies) {
    const source = path.join(repoRoot, from);
    const target = path.join(repoRoot, to);

    if (!fs.existsSync(source)) {
      console.log(`[runtime-build] skip missing ${from}`);
      continue;
    }

    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });

    console.log(`[runtime-build] copied ${from} -> ${to}`);
  }
}

if (require.main === module) main();
