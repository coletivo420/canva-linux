#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const checkedFiles = [
  'scripts/flatpak-build-common.sh',
  'scripts/native-install-common.sh',
  'scripts/install-native.sh',
  'scripts/desktop-integration-common.sh',
  'scripts/uninstall-flatpak.sh',
  'scripts/fix-build-permissions.sh',
  'scripts/clean-artifacts.sh',
  'scripts/purge-installations.sh',
  'scripts/uninstall-detected.sh',
];

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const file of checkedFiles) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;
    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/(^|[^A-Za-z0-9_])sudo(\s|$)/.test(line)) {
        failures.push(`${file}:${index + 1}: raw sudo is forbidden; use scripts/sudo-common.sh`);
      }
    });
  }

  if (failures.length) throw new Error(failures.join('\n'));
  console.log('[ok] Sudo contract check passed');
  return 0;
}

if (require.main === module && /check-sudo-contract\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
