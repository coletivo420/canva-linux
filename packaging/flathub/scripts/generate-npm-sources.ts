import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, '..', '..', '..');
const lockfilePath = path.join(repoRoot, 'package-lock.json');
const flathubDir = path.join(repoRoot, 'packaging', 'flathub');
const manifestPath = path.join(flathubDir, 'manifest.yml');
const outputPath = path.join(flathubDir, 'generated-sources.json');

const supportedIntegrityAlgorithms = ['sha512', 'sha384', 'sha256', 'sha1'] as const;

type SupportedIntegrityAlgorithm = (typeof supportedIntegrityAlgorithms)[number];

type LockfilePackage = {
  name?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
};

type LockfileDependency = {
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, LockfileDependency | null>;
};

type PackageLock = {
  lockfileVersion?: number;
  packages?: Record<string, LockfilePackage | null>;
  dependencies?: Record<string, LockfileDependency | null>;
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

type SourceCandidate = {
  packagePath: string;
  name?: string;
  resolved: string;
  integrity: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function readText(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function readLockfile(): PackageLock {
  if (!fs.existsSync(lockfilePath)) fail(`missing package lock: ${path.relative(repoRoot, lockfilePath)}`);
  return JSON.parse(readText(lockfilePath)) as PackageLock;
}

function validateSubmissionWorkspace(): void {
  if (!fs.existsSync(flathubDir) || !fs.statSync(flathubDir).isDirectory()) {
    fail('missing packaging/flathub submission workspace');
  }
  if (!fs.existsSync(manifestPath)) {
    fail('missing packaging/flathub/manifest.yml submission manifest');
  }

  const manifest = readText(manifestPath);
  if (!/^modules:\s*$/m.test(manifest) || !manifest.includes('- generated-sources.json')) {
    fail('packaging/flathub/manifest.yml must include generated-sources.json as a module');
  }
  if (path.dirname(outputPath) !== flathubDir) {
    fail('generated npm sources output must stay under packaging/flathub');
  }
}

function isLocalOrForbiddenResolved(resolved: string): boolean {
  return /^(?:file|link|workspace):/i.test(resolved)
    || resolved.startsWith('.')
    || resolved.startsWith('/')
    || resolved.includes('node_modules/')
    || resolved.includes('node_modules\\');
}

function validateRemoteTarball(packagePath: string, resolved: string): URL {
  if (isLocalOrForbiddenResolved(resolved)) {
    fail(`${packagePath}: local, workspace, link, or node_modules resolved paths are not allowed in Flathub npm sources (${resolved})`);
  }

  let url: URL;
  try {
    url = new URL(resolved);
  } catch {
    fail(`${packagePath}: resolved value is not a valid URL (${resolved})`);
  }

  if (url.protocol !== 'https:') {
    fail(`${packagePath}: resolved URL must use https for Flathub npm sources (${resolved})`);
  }
  if (!url.pathname.endsWith('.tgz')) {
    fail(`${packagePath}: resolved URL must point at an npm tarball (${resolved})`);
  }

  return url;
}

function convertIntegrity(integrityValue: string, packagePath: string): { algorithm: SupportedIntegrityAlgorithm; digestHex: string } {
  const parsed = new Map<string, string>();

  for (const part of integrityValue.trim().split(/\s+/)) {
    const match = /^(sha\d+)-([A-Za-z0-9+/=]+)$/.exec(part);
    if (!match) fail(`${packagePath}: invalid npm integrity fragment (${part})`);
    parsed.set(match[1].toLowerCase(), match[2]);
  }

  for (const algorithm of supportedIntegrityAlgorithms) {
    const digestBase64 = parsed.get(algorithm);
    if (!digestBase64) continue;

    const digest = Buffer.from(digestBase64, 'base64');
    const digestHex = digest.toString('hex');
    if (digest.length === 0 || !/^[a-f0-9]+$/.test(digestHex)) {
      fail(`${packagePath}: invalid ${algorithm} integrity digest`);
    }
    return { algorithm, digestHex };
  }

  fail(`${packagePath}: integrity must include one of ${supportedIntegrityAlgorithms.join(', ')}`);
}

function packageNameFromPath(packagePath: string): string {
  const parts = packagePath.split('node_modules/');
  return parts[parts.length - 1] || '';
}

function sanitizePackageName(name: string): string {
  return name.replace(/\//g, '-');
}

function destinationFilename(candidate: SourceCandidate): string {
  const url = validateRemoteTarball(candidate.packagePath, candidate.resolved);
  const baseName = path.basename(url.pathname);
  if (!baseName || baseName === '.' || baseName === '..') {
    fail(`${candidate.packagePath}: could not derive tarball filename`);
  }

  const packageName = sanitizePackageName(candidate.name || packageNameFromPath(candidate.packagePath));
  const destination = packageName && !baseName.startsWith(packageName) ? `${packageName}-${baseName}` : baseName;

  if (destination.includes('/') || destination.includes('\\') || destination.includes('..') || destination.includes('node_modules')) {
    fail(`${candidate.packagePath}: unsafe generated destination filename (${destination})`);
  }

  return destination;
}

function candidateFromPackage(packagePath: string, meta: LockfilePackage): SourceCandidate | null {
  if (packagePath === '') return null;
  if (!packagePath.startsWith('node_modules/')) {
    fail(`${packagePath}: package-lock package entries must be rooted under node_modules`);
  }
  if (meta.link) return null;
  if (!meta.resolved && !meta.integrity) return null;
  if (!meta.resolved || !meta.integrity) fail(`${packagePath}: package-lock package entry must include both resolved and integrity`);

  return {
    packagePath,
    name: meta.name,
    resolved: meta.resolved,
    integrity: meta.integrity,
  };
}

function candidatesFromPackages(lockfile: PackageLock): SourceCandidate[] {
  const packages = lockfile.packages;
  if (!packages) return [];

  return Object.entries(packages)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([packagePath, meta]) => {
      if (!meta) return [];
      const candidate = candidateFromPackage(packagePath, meta);
      return candidate ? [candidate] : [];
    });
}

function collectDependencyCandidates(dependencies: Record<string, LockfileDependency | null> | undefined, parentPath = 'dependencies'): SourceCandidate[] {
  if (!dependencies) return [];

  const candidates: SourceCandidate[] = [];
  for (const [name, meta] of Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right))) {
    if (!meta) continue;
    const packagePath = `${parentPath}/${name}`;
    if (meta.resolved || meta.integrity) {
      if (!meta.resolved || !meta.integrity) fail(`${packagePath}: dependency entry must include both resolved and integrity`);
      candidates.push({ packagePath, name, resolved: meta.resolved, integrity: meta.integrity });
    }
    candidates.push(...collectDependencyCandidates(meta.dependencies, packagePath));
  }
  return candidates;
}

function sourceFromCandidate(candidate: SourceCandidate): NpmSource {
  validateRemoteTarball(candidate.packagePath, candidate.resolved);
  const convertedIntegrity = convertIntegrity(candidate.integrity, candidate.packagePath);

  return {
    type: 'file',
    url: candidate.resolved,
    'dest-filename': destinationFilename(candidate),
    dest: 'npm-cache',
    [convertedIntegrity.algorithm]: convertedIntegrity.digestHex,
  };
}

function collectSources(lockfile: PackageLock): NpmSource[] {
  const candidates = candidatesFromPackages(lockfile);
  const fallbackCandidates = candidates.length > 0 ? [] : collectDependencyCandidates(lockfile.dependencies);
  const byUrl = new Map<string, NpmSource>();

  for (const candidate of [...candidates, ...fallbackCandidates]) {
    const source = sourceFromCandidate(candidate);
    const existing = byUrl.get(source.url);
    if (existing) {
      const existingHashKey = supportedIntegrityAlgorithms.find((algorithm) => existing[algorithm]);
      const sourceHashKey = supportedIntegrityAlgorithms.find((algorithm) => source[algorithm]);
      if (existing['dest-filename'] !== source['dest-filename'] || !existingHashKey || existingHashKey !== sourceHashKey || existing[existingHashKey] !== source[sourceHashKey]) {
        fail(`${candidate.packagePath}: duplicate URL has conflicting filename or integrity (${source.url})`);
      }
      continue;
    }
    byUrl.set(source.url, source);
  }

  const sources = [...byUrl.values()].sort((left, right) => {
    const byUrlCompare = left.url.localeCompare(right.url);
    return byUrlCompare !== 0 ? byUrlCompare : left['dest-filename'].localeCompare(right['dest-filename']);
  });

  if (sources.length === 0) fail('no remote npm tarball sources found in package-lock.json');
  return sources;
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
  validateSubmissionWorkspace();
  const lockfile = readLockfile();
  const sources = collectSources(lockfile);
  const output = createGeneratedSourcesModule(sources);

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Generated ${path.relative(repoRoot, outputPath)} with ${sources.length} sources.`);
}

if (require.main === module) main();
