#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const buildDir = path.join(repoRoot, '.build');

fs.rmSync(buildDir, { recursive: true, force: true });

console.log('[runtime-build] removed .build');
