import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadEffectiveBuildMetadata } from "../scripts/c420ui-adapter/build-metadata-loader";

type TestProjectOptions = {
  packagedRevision?: string;
};

const loaderPath = path.join("scripts", "c420ui-adapter", "build-metadata-loader.ts");

function withEnvRevision<T>(revision: string | undefined, run: () => T): T {
  const previous = process.env.CANVA_LINUX_BUILD_REVISION;
  if (revision === undefined) {
    delete process.env.CANVA_LINUX_BUILD_REVISION;
  } else {
    process.env.CANVA_LINUX_BUILD_REVISION = revision;
  }

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.CANVA_LINUX_BUILD_REVISION;
    } else {
      process.env.CANVA_LINUX_BUILD_REVISION = previous;
    }
  }
}

function withPathPrefix<T>(prefix: string, run: () => T): T {
  const previous = process.env.PATH;
  process.env.PATH = `${prefix}${path.delimiter}${previous ?? ""}`;

  try {
    return run();
  } finally {
    if (previous === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = previous;
    }
  }
}

function withTestProject(options: TestProjectOptions, run: (rootDir: string) => void): void {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-build-metadata-"));

  try {
    fs.mkdirSync(path.join(rootDir, ".build", "electron", "main"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "config", "canva-linux"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "package.json"),
      `${JSON.stringify({ name: "canva-linux-test", version: "1.2.3" }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "config", "canva-linux", "project-ui.json"),
      `${JSON.stringify({ displayVersion: "1.2.3 Display", phase: "1.2.3 Phase" }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "config", "canva-linux", "build-metadata.json"),
      `${JSON.stringify({
        baseVersion: "9.9.9",
        baseDisplayVersion: "9.9.9 Display",
        basePhase: "9.9.9 Phase",
        buildRevision: options.packagedRevision ?? "packagedrev",
      }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, ".build", "electron", "main", "build-metadata.js"),
      `
exports.createBuildMetadata = function createBuildMetadata(input) {
  const revision = String(input.buildRevision || "unknown").trim() || "unknown";
  const buildRevision = "module-" + revision.replace(/^g/i, "").slice(0, 7);
  return {
    baseVersion: input.baseVersion,
    baseDisplayVersion: input.baseDisplayVersion,
    basePhase: input.basePhase,
    buildRevision,
    version: input.baseVersion + "+" + buildRevision,
    displayVersion: input.baseDisplayVersion + "+" + buildRevision,
    phase: input.basePhase + "+" + buildRevision,
    fullVersion: input.basePhase + "+" + buildRevision,
    sourceMarker: "electron-main-build-metadata"
  };
};
exports.normalizeLoadedBuildMetadata = function normalizeLoadedBuildMetadata(metadata) {
  if (!metadata.baseVersion || !metadata.baseDisplayVersion || !metadata.basePhase) return null;
  return exports.createBuildMetadata({
    baseVersion: metadata.baseVersion,
    baseDisplayVersion: metadata.baseDisplayVersion,
    basePhase: metadata.basePhase,
    buildRevision: metadata.buildRevision || "unknown"
  });
};
exports.loadCanvaLinuxBuildMetadata = function loadCanvaLinuxBuildMetadata() {
  return exports.createBuildMetadata({
    baseVersion: "loaded",
    baseDisplayVersion: "loaded",
    basePhase: "loaded",
    buildRevision: "loaded"
  });
};
exports.formatCanvaLinuxVersion = function formatCanvaLinuxVersion(metadata) {
  return "Canva Linux " + metadata.version;
};
`,
    );

    run(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

test("build metadata loader uses electron/main/build-metadata via createRequire", () => {
  const source = fs.readFileSync(loaderPath, "utf8");

  assert.match(source, /createRequire/);
  assert.match(source, /electron\/main\/build-metadata/);
  assert.doesNotMatch(source, /function normalizeBuildRevision/);
  assert.doesNotMatch(source, /function appendBuildRevision/);
  assert.doesNotMatch(source, /function createBuildMetadata/);
  assert.doesNotMatch(source, /function normalizeLoadedBuildMetadata/);
});

test("loadEffectiveBuildMetadata uses electron main build metadata single source", () => {
  withTestProject({}, (rootDir) => {
    withEnvRevision("abcdef123456", () => {
      const metadata = loadEffectiveBuildMetadata(rootDir) as ReturnType<typeof loadEffectiveBuildMetadata> & {
        sourceMarker?: string;
      };

      assert.equal(metadata.sourceMarker, "electron-main-build-metadata");
      assert.equal(metadata.buildRevision, "module-abcdef1");
      assert.equal(metadata.fullVersion, "1.2.3 Phase+module-abcdef1");
    });
  });
});

test("CANVA_LINUX_BUILD_REVISION overrides packaged metadata", () => {
  withTestProject({ packagedRevision: "packaged999" }, (rootDir) => {
    withEnvRevision("env999999", () => {
      const metadata = loadEffectiveBuildMetadata(rootDir);

      assert.equal(metadata.buildRevision, "module-env9999");
      assert.equal(metadata.baseVersion, "1.2.3");
    });
  });
});

test("git revision is used in source checkout when env revision is missing", () => {
  withTestProject({ packagedRevision: "packaged999" }, (rootDir) => {
    const binDir = path.join(rootDir, "bin");
    const gitRevision = "abc1234";
    fs.mkdirSync(path.join(rootDir, ".git"));
    fs.mkdirSync(binDir);
    fs.writeFileSync(
      path.join(binDir, "git"),
      `#!/usr/bin/env sh\nif [ "$1" = "rev-parse" ]; then printf '${gitRevision}\\n'; exit 0; fi\nexit 1\n`,
      { mode: 0o755 },
    );

    withPathPrefix(binDir, () => {
      withEnvRevision(undefined, () => {
        const metadata = loadEffectiveBuildMetadata(rootDir);

        assert.equal(metadata.buildRevision, `module-${gitRevision}`);
        assert.equal(metadata.baseVersion, "1.2.3");
      });
    });
  });
});

test("packaged build-metadata.json fallback still works", () => {
  withTestProject({ packagedRevision: "packaged999" }, (rootDir) => {
    withEnvRevision(undefined, () => {
      const metadata = loadEffectiveBuildMetadata(rootDir);

      assert.equal(metadata.buildRevision, "module-package");
      assert.equal(metadata.baseVersion, "9.9.9");
      assert.equal(metadata.fullVersion, "9.9.9 Phase+module-package");
    });
  });
});
