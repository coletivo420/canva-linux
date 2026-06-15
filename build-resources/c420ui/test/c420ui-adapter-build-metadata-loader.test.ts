import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadEffectiveBuildMetadata } from "../../canva-linux/c420ui-adapter/build-metadata-loader.js";

type TestProjectOptions = {
  includePackagedMetadata?: boolean;
  packagedRevision?: string;
};

const loaderPath = path.join(
  "build-resources",
  "canva-linux",
  "c420ui-adapter",
  "build-metadata-loader.ts",
);

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
    fs.mkdirSync(path.join(rootDir, "build-resources", "canva-linux", "config"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "package.json"),
      `${JSON.stringify({ name: "canva-linux-test", version: "1.2.3" }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "build-resources", "canva-linux", "config", "project-ui.json"),
      `${JSON.stringify({ displayVersion: "1.2.3 Display", phase: "1.2.3 Phase" }, null, 2)}\n`,
    );
    if (options.includePackagedMetadata !== false) {
      fs.writeFileSync(
        path.join(rootDir, "build-resources", "canva-linux", "config", "build-metadata.json"),
        `${JSON.stringify({
          baseVersion: "9.9.9",
          baseDisplayVersion: "9.9.9 Display",
          basePhase: "9.9.9 Phase",
          buildRevision: options.packagedRevision ?? "packagedrev",
        }, null, 2)}\n`,
      );
    }
    run(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

test("build metadata loader imports build-resources/electron/main/build-metadata as ESM", () => {
  const source = fs.readFileSync(loaderPath, "utf8");

  assert.equal(source.includes("create" + "Require"), false);
  assert.match(source, /electron\/main\/build-metadata/);
  assert.doesNotMatch(source, /function normalizeBuildRevision/);
  assert.doesNotMatch(source, /function appendBuildRevision/);
  assert.doesNotMatch(source, /function createBuildMetadata/);
  assert.doesNotMatch(source, /function normalizeLoadedBuildMetadata/);
});

test("loadEffectiveBuildMetadata uses electron main build metadata single source", () => {
  withTestProject({}, (rootDir) => {
    withEnvRevision("abcdef123456", () => {
      const metadata = loadEffectiveBuildMetadata(rootDir);

      assert.equal(metadata.buildRevision, "gabcdef1");
      assert.equal(metadata.fullVersion, "1.2.3 Phase+gabcdef1");
    });
  });
});

test("CANVA_LINUX_BUILD_REVISION overrides packaged metadata", () => {
  withTestProject({ packagedRevision: "packaged999" }, (rootDir) => {
    withEnvRevision("env999999", () => {
      const metadata = loadEffectiveBuildMetadata(rootDir);

      assert.equal(metadata.buildRevision, "genv9999");
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

        assert.equal(metadata.buildRevision, `g${gitRevision}`);
        assert.equal(metadata.baseVersion, "1.2.3");
      });
    });
  });
});

test("packaged build-metadata.json is used when source metadata is unavailable", () => {
  withTestProject({ packagedRevision: "packaged999" }, (rootDir) => {
    withEnvRevision(undefined, () => {
      const metadata = loadEffectiveBuildMetadata(rootDir);

      assert.equal(metadata.buildRevision, "gpackage");
      assert.equal(metadata.baseVersion, "9.9.9");
      assert.equal(metadata.fullVersion, "9.9.9 Phase+gpackage");
    });
  });
});

test("missing build metadata fails clearly instead of falling back to 0.0.0", () => {
  withTestProject({ includePackagedMetadata: false }, (rootDir) => {
    withEnvRevision(undefined, () => {
      assert.throws(
        () => loadEffectiveBuildMetadata(rootDir),
        /Missing Canva Linux build metadata\. Run npm run build:metadata\./,
      );
    });
  });
});

test("fallback build metadata requires explicit opt-in", () => {
  withTestProject({ includePackagedMetadata: false }, (rootDir) => {
    withEnvRevision(undefined, () => {
      const metadata = loadEffectiveBuildMetadata(rootDir, { allowFallback: true });

      assert.equal(metadata.baseVersion, "0.0.0");
      assert.equal(metadata.buildRevision, "unknown");
    });
  });
});
