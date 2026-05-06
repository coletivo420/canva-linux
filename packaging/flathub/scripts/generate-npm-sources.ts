import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, '..', '..', '..');
const lockfilePath = path.join(repoRoot, 'package-lock.json');
const outputPath = path.join(repoRoot, 'packaging', 'flathub', 'generated-sources.json');

type LockfilePackage = {
  name?: string;
  resolved?: string;
  integrity?: string;
};

type PackageLock = {
  packages?: Record<string, LockfilePackage | null>;
};

type NpmSource = {
  type: 'file';
  url: string;
  'dest-filename': string;
  dest: 'npm-cache';
} & Record<string, string>;

type GeneratedSourcesModule = {
  name: 'generated-npm-sources';
  buildsystem: 'simple';
  'build-commands': string[];
  sources: NpmSource[];
};

function readLockfile(): PackageLock {
  return JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as PackageLock;
}

function convertIntegrity(integrityValue: string): { algorithm: string; digestHex: string } | null {
  const integrity = /^(sha\d+)-(.+)$/.exec(integrityValue);
  if (!integrity) return null;

  return {
    algorithm: integrity[1].toLowerCase(),
    digestHex: Buffer.from(integrity[2], 'base64').toString('hex'),
  };
}

function destinationFilename(pkgPath: string, meta: LockfilePackage): string {
  const resolvedPath = new URL(meta.resolved ?? '').pathname;
  const baseName = path.basename(resolvedPath);
  const packageName = (meta.name || pkgPath.split('node_modules/').pop() || '').replace(/[\/]/g, '-');
  return packageName && !baseName.startsWith(packageName) ? `${packageName}-${baseName}` : baseName;
}

function collectSources(lockfile: PackageLock): NpmSource[] {
  const sources: NpmSource[] = [];
  const seenUrls = new Set<string>();

  for (const [pkgPath, meta] of Object.entries(lockfile.packages || {})) {
    if (!meta?.resolved || !meta.integrity) continue;
    if (!/^https?:\/\//.test(meta.resolved) || seenUrls.has(meta.resolved)) continue;

    const convertedIntegrity = convertIntegrity(meta.integrity);
    if (!convertedIntegrity) continue;

    seenUrls.add(meta.resolved);

    sources.push({
      type: 'file',
      url: meta.resolved,
      'dest-filename': destinationFilename(pkgPath, meta),
      dest: 'npm-cache',
      [convertedIntegrity.algorithm]: convertedIntegrity.digestHex,
    });
  }

  return sources.sort((left, right) => left.url.localeCompare(right.url));
}

function createGeneratedSourcesModule(sources: NpmSource[]): GeneratedSourcesModule {
  return {
    name: 'generated-npm-sources',
    buildsystem: 'simple',
    'build-commands': [
      'mkdir -p /app/flatpak-node/cache',
      'cp -a npm-cache/. /app/flatpak-node/cache/',
    ],
    sources,
  };
}

export function main(): void {
  const lockfile = readLockfile();
  const sources = collectSources(lockfile);
  const output = createGeneratedSourcesModule(sources);

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Generated ${outputPath} with ${sources.length} sources.`);
}

if (require.main === module) main();
