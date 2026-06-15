import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveC420UIHostDependencies } from "../src/host-dependency-resolver.js";
import type { c420uiHostDependencyConfig } from "../src/host-dependencies.js";

function makeProject(): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-resolver-"));
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    JSON.stringify({ scripts: {}, devDependencies: { typescript: "1.0.0" } }),
  );
  fs.writeFileSync(path.join(rootDir, "package-lock.json"), "{}");
  fs.mkdirSync(path.join(rootDir, "node_modules/typescript"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "node_modules/typescript/package.json"), "{}");
  return rootDir;
}

function makeRustHostStub(response: unknown, capturePath?: string): string {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-resolver-rust-"));
  const binPath = path.join(rootDir, "c420ui-host");
  fs.writeFileSync(
    binPath,
    `#!/bin/sh
${capturePath ? `cat > ${JSON.stringify(capturePath)}` : "cat >/dev/null"}
printf '%s' ${JSON.stringify(JSON.stringify(response))}
`,
  );
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

const config: c420uiHostDependencyConfig = {
  node: { required: true, minimumMajor: 1 },
  commands: [{ id: "git", command: "git", required: true, requiredFor: ["development"] }],
  npm: {
    packageManager: "npm",
    lockfile: "package-lock.json",
    installStrategy: "auto",
    includeDev: true,
    requiredDevDependencies: ["typescript"],
  },
};

test("calls Rust for node and commands", async () => {
  const rootDir = makeProject();
  const capturePath = path.join(rootDir, "rust-input.json");
  const rustHostBin = makeRustHostStub(
    {
      ok: true,
      command: "check-host-dependencies",
      version: "0.1.0",
      status: "available",
      message: "Host dependencies are available.",
      dependencies: [],
    },
    capturePath,
  );

  const result = await resolveC420UIHostDependencies(config, {
    rootDir,
    env: { C420UI_HOST_BIN: rustHostBin, PATH: "/usr/bin" },
  });

  const rustInput = JSON.parse(fs.readFileSync(capturePath, "utf8"));
  assert.equal(result.status, "available");
  assert.equal(rustInput.node.minimumMajor, 1);
  assert.equal(rustInput.commands[0].command, "git");
  assert.equal(rustInput.env.PATH, "/usr/bin");
});

test("maps Rust available to c420ui result", async () => {
  const rootDir = makeProject();
  const rustHostBin = makeRustHostStub({
    ok: true,
    command: "check-host-dependencies",
    version: "0.1.0",
    status: "available",
    message: "Host dependencies are available.",
    dependencies: [],
  });

  const result = await resolveC420UIHostDependencies(config, {
    rootDir,
    env: { C420UI_HOST_BIN: rustHostBin },
  });

  assert.equal(result.status, "available");
});

test("maps Rust missing to c420ui result", async () => {
  const rootDir = makeProject();
  const rustHostBin = makeRustHostStub({
    ok: false,
    command: "check-host-dependencies",
    version: "0.1.0",
    status: "missing",
    message: "Missing required command dependencies: git.",
    dependencies: [{ id: "git", label: "git", command: "git", requiredFor: ["development"] }],
  });

  const result = await resolveC420UIHostDependencies(config, {
    rootDir,
    env: { C420UI_HOST_BIN: rustHostBin },
  });

  assert.equal(result.status, "missing");
  assert.equal(result.dependencies?.[0]?.id, "git");
});

test("maps Rust failed to c420ui result", async () => {
  const rootDir = makeProject();
  const rustHostBin = makeRustHostStub({
    ok: false,
    command: "check-host-dependencies",
    version: "0.1.0",
    status: "failed",
    message: "Node.js major version 20 or newer is required. Current version: 18.19.0.",
    dependencies: [],
  });

  const result = await resolveC420UIHostDependencies(config, {
    rootDir,
    env: { C420UI_HOST_BIN: rustHostBin },
  });

  assert.equal(result.status, "failed");
  assert.match(result.message ?? "", /Node\.js major version/);
});

test("runs npm check after Rust success", async () => {
  const rootDir = makeProject();
  fs.rmSync(path.join(rootDir, "node_modules"), { recursive: true, force: true });
  const rustHostBin = makeRustHostStub({
    ok: true,
    command: "check-host-dependencies",
    version: "0.1.0",
    status: "available",
    message: "Host dependencies are available.",
    dependencies: [],
  });

  const result = await resolveC420UIHostDependencies(config, {
    rootDir,
    env: { C420UI_HOST_BIN: rustHostBin },
  });

  assert.equal(result.status, "missing");
  assert.equal(result.dependencies?.[0]?.id, "typescript");
});

test("does not call TypeScript command lookup in real resolver", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "build-resources/c420ui/src/host-dependency-resolver.ts"),
    "utf8",
  );

  assert.equal(source.includes("./command-dependencies.js"), false);
  assert.equal(source.includes("./node-dependencies.js"), false);
});

test("fails if Rust host is missing", async () => {
  const rootDir = makeProject();

  const result = await resolveC420UIHostDependencies(config, {
    rootDir,
    env: { C420UI_HOST_BIN: "/tmp/missing-c420ui-host-for-resolver" },
  });

  assert.equal(result.status, "failed");
  assert.match(result.message ?? "", /c420ui Rust host check failed/);
});
