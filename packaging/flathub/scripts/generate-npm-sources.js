#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const lockfilePath = path.join(repoRoot, 'package-lock.json');
const outputPath = path.join(repoRoot, 'packaging', 'flathub', 'generated-sources.json');

const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));

const sources = [];
const seenUrls = new Set();

for (const [pkgPath, meta] of Object.entries(lockfile.packages || {})) {
  if (!meta || !meta.resolved || !meta.integrity) {
    continue;
  }

  if (!/^https?:\/\//.test(meta.resolved) || seenUrls.has(meta.resolved)) {
    continue;
  }

  const integrity = /^(sha\d+)-(.+)$/.exec(meta.integrity);
  if (!integrity) {
    continue;
  }

  seenUrls.add(meta.resolved);

  const algorithm = integrity[1].toLowerCase();
  const digestHex = Buffer.from(integrity[2], 'base64').toString('hex');
  const baseName = path.basename(new URL(meta.resolved).pathname);
  const packageName = (meta.name || pkgPath.split('node_modules/').pop() || '').replace(/[\/]/g, '-');
  const destFilename = packageName && !baseName.startsWith(packageName)
    ? `${packageName}-${baseName}`
    : baseName;

  const sourceEntry = {
    type: 'file',
    url: meta.resolved,
    'dest-filename': destFilename,
    dest: 'npm-cache'
  };

  sourceEntry[algorithm] = digestHex;
  sources.push(sourceEntry);
}

sources.sort((a, b) => a.url.localeCompare(b.url));

const output = {
  name: 'generated-npm-sources',
  buildsystem: 'simple',
  'build-commands': [
    'mkdir -p /app/flatpak-node/cache',
    'cp -a npm-cache/. /app/flatpak-node/cache/'
  ],
  sources
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${outputPath} with ${sources.length} sources.`);
