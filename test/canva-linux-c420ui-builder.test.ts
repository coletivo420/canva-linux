// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function groupExists(name) {
  const result = spawnSync("getent", ["group", name], { encoding: "utf8" });
  return result.status === 0;
}

function rootSafeBuilderPrefix() {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) {
    return { skip: null, command: "./canva-linux-c420ui-builder", args: [] };
  }
  const setpriv = spawnSync("command", ["-v", "setpriv"], { shell: true, encoding: "utf8" });
  if (setpriv.status !== 0) return { skip: "setpriv is unavailable for root-container builder smoke tests" };
  const group = ["nogroup", "nobody"].find(groupExists);
  if (!group) return { skip: "neither nogroup nor nobody group is available for root-container builder smoke tests" };
  const probe = spawnSync("setpriv", ["--reuid", "nobody", "--regid", group, "--clear-groups", "env", `PATH=${process.env.PATH || ""}`, "bash", "-c", "command -v node >/dev/null 2>&1"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (probe.status !== 0) return { skip: "Node.js is unavailable in the non-root smoke-test context" };
  return { skip: null, command: "setpriv", args: ["--reuid", "nobody", "--regid", group, "--clear-groups", "./canva-linux-c420ui-builder"] };
}

function runBuilder(args) {
  const env = {
    ...process.env,
    CANVA_SCRIPT_REPO_ROOT: repoRoot,
    HOME: process.env.HOME || os.tmpdir(),
    XDG_STATE_HOME: path.join(os.tmpdir(), "canva-linux-test-state"),
  };
  const prefix = rootSafeBuilderPrefix();
  if (prefix.skip) return { skipped: true, status: 0, stdout: "", stderr: prefix.skip };
  return spawnSync(prefix.command, [...prefix.args, ...args], {
    cwd: repoRoot,
    env: { ...env, HOME: typeof process.getuid === "function" && process.getuid() === 0 ? os.tmpdir() : env.HOME },
    encoding: "utf8",
  });
}

test("canva-linux-c420ui-builder entrypoint preserves current builder/runtime split", () => {
  const wrapper = read("canva-linux-c420ui-builder");
  assert.ok(exists("scripts/c420ui-builder.ts"));
  assert.ok(exists("bootstrap/c420ui/c420ui-builder.cjs"));
  assert.equal(exists("canva-linux.sh"), false);
  assert.match(wrapper, /bootstrap\/c420ui\/c420ui-builder\.cjs/);
  assert.match(wrapper, /\.build\/scripts\/c420ui-builder\.js/);
});

test("bootstrap manifest points builder at c420ui-builder", () => {
  const manifest = JSON.parse(read("bootstrap/c420ui/manifest.json"));
  assert.equal(manifest.entrypoints.builder, "bootstrap/c420ui/c420ui-builder.cjs");
  assert.ok(manifest.sourceHashInputs.includes("scripts/c420ui-builder.ts"));
});

test("builder title and help separate c420ui builder from runtime canva-linux", () => {
  const source = read("scripts/c420ui-builder.ts");
  assert.match(source, /BUILDER_INTERNAL_NAME = "c420ui-builder"/);
  assert.match(source, /BUILDER_ALIAS = "canva-linux-c420ui-builder"/);
  assert.match(source, /Canva Linux Builder powered by c420ui/);
  assert.match(source, /canva-linux --help/);
});

test("builder normalizeBuilderArgs delegates a registry-backed planned action", () => {
  const { normalizeBuilderArgs } = require(path.join(repoRoot, ".build/scripts/c420ui-builder.js"));

  assert.deepEqual(normalizeBuilderArgs(["--prepare-aur", "--dry-run"]), {
    help: false,
    bridgeArgs: ["--prepare-aur", "--dry-run"],
    hasBridgeAction: true,
  });

  assert.deepEqual(normalizeBuilderArgs(["--prepare-aur", "--force"]).bridgeArgs, [
    "--prepare-aur",
    "--yes",
  ]);
});

test("builder normalizeBuilderArgs rejects a runtime-only flag", () => {
  const { normalizeBuilderArgs } = require(path.join(repoRoot, ".build/scripts/c420ui-builder.js"));
  assert.throws(
    () => normalizeBuilderArgs(["--debug=1"]),
    /--debug=1 is a Canva Linux runtime option/,
  );
});

test("public alias --help smoke test works", () => {
  const help = spawnSync("./canva-linux-c420ui-builder", ["--help"], {
    cwd: repoRoot,
    env: { ...process.env, CANVA_SCRIPT_REPO_ROOT: repoRoot },
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Canva Linux Builder powered by c420ui/);
  assert.match(help.stdout, /--force\s+Alias for --yes/);
});

test("public alias planned action dry-run smoke test routes through c420ui-builder", (t) => {
  const result = runBuilder(["--prepare-aur", "--dry-run"]);
  if (result.skipped) {
    t.skip(result.stderr);
    return;
  }
  assert.equal(result.status, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
});

test("public alias rejects a runtime-only flag", (t) => {
  const result = runBuilder(["--debug=1"]);
  if (result.skipped) {
    t.skip(result.stderr);
    return;
  }
  assert.notEqual(result.status, 0, "--debug=1 unexpectedly succeeded");
  assert.match(result.stderr, /--debug=1 is a Canva Linux runtime option/);
});

test("compiled Electron runtime remains canva-linux", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.build.linux.executableName, "canva-linux");
  assert.equal(pkg.build.appId, "io.github.coletivo420.canva-linux");
});
