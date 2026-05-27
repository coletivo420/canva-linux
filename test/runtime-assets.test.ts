import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
const copyRuntimeAssetsEntrypoint = path.join(repoRoot, ".build", "scripts", "copy-runtime-assets.js");

function writeJson(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function runCopyRuntimeAssets(tmpRoot: string): void {
  const result = spawnSync(process.execPath, [copyRuntimeAssetsEntrypoint], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CANVA_SCRIPT_REPO_ROOT: tmpRoot,
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("copy-runtime-assets overwrites stale runtime metadata with effective metadata", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "canva-runtime-assets-effective-"));
  try {
    writeJson(
      path.join(tmpRoot, ".build", "electron", "config", "canva-linux", "build-metadata.json"),
      { buildRevision: "gold", fullVersion: "old" },
    );
    writeJson(
      path.join(tmpRoot, ".build", "canva-linux", "build-metadata.effective.json"),
      { buildRevision: "gnew1234", fullVersion: "0.1.4-15.Dev.9+gnew1234" },
    );

    runCopyRuntimeAssets(tmpRoot);

    const runtimeMetadata = JSON.parse(
      fs.readFileSync(
        path.join(tmpRoot, ".build", "electron", "config", "canva-linux", "build-metadata.json"),
        "utf8",
      ),
    ) as { buildRevision?: string; fullVersion?: string };

    assert.equal(runtimeMetadata.buildRevision, "gnew1234");
    assert.equal(runtimeMetadata.fullVersion, "0.1.4-15.Dev.9+gnew1234");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("copy-runtime-assets falls back to committed metadata when effective metadata is missing", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "canva-runtime-assets-committed-"));
  try {
    writeJson(
      path.join(tmpRoot, "config", "canva-linux", "build-metadata.json"),
      { buildRevision: "unknown", fullVersion: "0.1.4-15.Dev.9" },
    );

    runCopyRuntimeAssets(tmpRoot);

    const runtimeMetadata = JSON.parse(
      fs.readFileSync(
        path.join(tmpRoot, ".build", "electron", "config", "canva-linux", "build-metadata.json"),
        "utf8",
      ),
    ) as { buildRevision?: string; fullVersion?: string };

    assert.equal(runtimeMetadata.buildRevision, "unknown");
    assert.equal(runtimeMetadata.fullVersion, "0.1.4-15.Dev.9");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("copy-runtime-assets prefers effective metadata over committed metadata", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "canva-runtime-assets-prefer-effective-"));
  try {
    writeJson(
      path.join(tmpRoot, "config", "canva-linux", "build-metadata.json"),
      { buildRevision: "unknown", fullVersion: "0.1.4-15.Dev.9" },
    );
    writeJson(
      path.join(tmpRoot, ".build", "canva-linux", "build-metadata.effective.json"),
      { buildRevision: "gnew1234", fullVersion: "0.1.4-15.Dev.9+gnew1234" },
    );

    runCopyRuntimeAssets(tmpRoot);

    const runtimeMetadata = JSON.parse(
      fs.readFileSync(
        path.join(tmpRoot, ".build", "electron", "config", "canva-linux", "build-metadata.json"),
        "utf8",
      ),
    ) as { buildRevision?: string; fullVersion?: string };
    assert.equal(runtimeMetadata.buildRevision, "gnew1234");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("copy-runtime-assets never skips metadata overwrite when target already exists", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "canva-runtime-assets-overwrite-"));
  try {
    writeJson(
      path.join(tmpRoot, ".build", "electron", "config", "canva-linux", "build-metadata.json"),
      { buildRevision: "stale", fullVersion: "stale" },
    );
    writeJson(
      path.join(tmpRoot, ".build", "canva-linux", "build-metadata.effective.json"),
      { buildRevision: "gnew1234", fullVersion: "0.1.4-15.Dev.9+gnew1234" },
    );

    runCopyRuntimeAssets(tmpRoot);
    runCopyRuntimeAssets(tmpRoot);

    const runtimeMetadata = JSON.parse(
      fs.readFileSync(
        path.join(tmpRoot, ".build", "electron", "config", "canva-linux", "build-metadata.json"),
        "utf8",
      ),
    ) as { buildRevision?: string; fullVersion?: string };
    assert.equal(runtimeMetadata.buildRevision, "gnew1234");
    assert.equal(runtimeMetadata.fullVersion, "0.1.4-15.Dev.9+gnew1234");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
