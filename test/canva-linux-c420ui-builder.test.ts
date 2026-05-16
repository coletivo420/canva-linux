// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function commandExists(command) {
  return spawnSync("command", ["-v", command], { encoding: "utf8", shell: true }).status === 0;
}

function userExists(user) {
  return spawnSync("id", ["-u", user], { encoding: "utf8" }).status === 0;
}

function groupExists(group) {
  return spawnSync("getent", ["group", group], { encoding: "utf8" }).status === 0;
}

function rootSafeBuilderPrefix() {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return { skip: null, command: "./canva-linux-c420ui-builder", args: [] };
  if (!commandExists("setpriv")) return { skip: "setpriv is unavailable for root-container builder smoke tests" };
  if (!userExists("nobody")) return { skip: "nobody user is unavailable for root-container builder smoke tests" };
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
    HOME: process.env.HOME || "/tmp",
    XDG_STATE_HOME: path.join("/tmp", "canva-linux-test-state"),
  };
  const prefix = rootSafeBuilderPrefix();
  if (prefix.skip) return { skipped: true, status: 0, stdout: "", stderr: prefix.skip };
  return spawnSync(prefix.command, [...prefix.args, ...args], {
    cwd: repoRoot,
    env: { ...env, HOME: typeof process.getuid === "function" && process.getuid() === 0 ? "/tmp" : env.HOME },
    encoding: "utf8",
  });
}


test("canva-linux-c420ui-builder entrypoint exists and selects c420ui-builder bootstrap before build fallback", () => {
  const wrapper = read("canva-linux-c420ui-builder");
  assert.ok(exists("scripts/c420ui-builder.ts"));
  assert.equal(exists("scripts/canva-linux-c420ui-builder.ts"), false);
  assert.ok(exists("bootstrap/c420ui/c420ui-builder.cjs"));
  assert.equal(exists("bootstrap/c420ui/canva-linux-c420ui-builder.cjs"), false);
  assert.equal(exists("canva-linux.sh"), false);
  assert.match(wrapper, /bootstrap\/c420ui\/c420ui-builder\.cjs/);
  assert.match(wrapper, /\.build\/scripts\/c420ui-builder\.js/);
  assert.doesNotMatch(wrapper, /canva-linux-c420ui-builder\.cjs/);
  assert.doesNotMatch(wrapper, /canva-linux-c420ui-builder\.js/);
  assert.ok(
    wrapper.indexOf("bootstrap/c420ui/c420ui-builder.cjs") <
      wrapper.indexOf(".build/scripts/c420ui-builder.js"),
  );
});

test("bootstrap manifest points builder at c420ui-builder", () => {
  const manifest = JSON.parse(read("bootstrap/c420ui/manifest.json"));
  assert.equal(manifest.entrypoints.builder, "bootstrap/c420ui/c420ui-builder.cjs");
  assert.ok(manifest.sourceHashInputs.includes("scripts/c420ui-builder.ts"));
  assert.equal(manifest.sourceHashInputs.includes("scripts/canva-linux-c420ui-builder.ts"), false);
});

test("builder title and help separate c420ui builder from runtime canva-linux", () => {
  const source = read("scripts/c420ui-builder.ts");
  assert.match(source, /BUILDER_INTERNAL_NAME = "c420ui-builder"/);
  assert.match(source, /BUILDER_ALIAS = "canva-linux-c420ui-builder"/);
  assert.match(source, /Canva Linux Builder powered by c420ui/);
  assert.match(source, /opens the c420ui install and development workspace by default/);
  assert.match(source, /canva-linux --help/);
  assert.match(source, /--force                       Alias for --yes/);
});

test("builder help does not advertise runtime-only flags", () => {
  const source = read("scripts/c420ui-builder.ts");
  const helpBody = source.slice(source.indexOf("function builderHelp"), source.indexOf("function sessionLogPath"));
  for (const forbidden of [
    "--debug=1",
    "--debug=2",
    "--credential-store",
    "--gpu-backend",
    "--force-x11",
    "--force-wayland",
  ]) {
    assert.doesNotMatch(helpBody, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("builder delegates direct action flags through c420ui CLI bridge", () => {
  const source = read("scripts/c420ui-builder.ts");
  assert.match(source, /selectEntrypoint\(rootDir, kind\)/);
  assert.match(source, /bootstrap\/c420ui\/run-c420ui-cli\.cjs/);
  assert.match(source, /\.build\/scripts\/run-c420ui-cli\.js/);
  assert.doesNotMatch(source, /DIRECT_ACTION_FLAGS/);
  assert.match(source, /hasBridgeAction/);
});

test("builder normalizeBuilderArgs delegates registry-backed planned actions", () => {
  const { normalizeBuilderArgs } = require(path.join(
    repoRoot,
    ".build/scripts/c420ui-builder.js",
  ));

  for (const action of ["--prepare-aur", "--bundle-deb", "--bundle-rpm"]) {
    assert.deepEqual(normalizeBuilderArgs([action, "--dry-run"]), {
      help: false,
      bridgeArgs: [action, "--dry-run"],
      hasBridgeAction: true,
    });
  }

  assert.deepEqual(normalizeBuilderArgs(["--bundle-deb", "--force"]).bridgeArgs, [
    "--bundle-deb",
    "--yes",
  ]);
});

test("builder rejects runtime-only namespaces and non-flag arguments", () => {
  const { normalizeBuilderArgs } = require(path.join(
    repoRoot,
    ".build/scripts/c420ui-builder.js",
  ));

  for (const arg of [
    "--debug",
    "--debug=1",
    "--debug=3",
    "--credential-store=kwallet6",
    "--gpu-backend=vulkan",
    "--force-x11",
    "--force-wayland",
    "--disable-wayland-color-manager",
  ]) {
    assert.throws(
      () => normalizeBuilderArgs([arg]),
      new RegExp(`${arg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} is a Canva Linux runtime option`),
    );
  }

  assert.throws(() => normalizeBuilderArgs(["install-native"]), /Unsupported builder argument/);
});

test("builder rejects builder globals without a direct action and has no root dry-run bypass", () => {
  const source = read("scripts/c420ui-builder.ts");
  assert.match(source, /No direct action was provided/);
  assert.match(source, /assertNonRoot\(\)/);
  assert.doesNotMatch(source, /allowRootDryRun/);
  assert.doesNotMatch(source, /parsed\.directAction/);
});

test("public alias smoke tests expose help and reject builder globals without actions", (t) => {
  const help = spawnSync("./canva-linux-c420ui-builder", ["--help"], {
    cwd: repoRoot,
    env: { ...process.env, CANVA_SCRIPT_REPO_ROOT: repoRoot },
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Canva Linux Builder powered by c420ui/);
  assert.match(help.stdout, /--force\s+Alias for --yes/);

  for (const arg of ["--dry-run", "--yes", "--force"]) {
    const result = runBuilder([arg]);
    if (result.skipped) {
      t.skip(result.stderr);
      return;
    }
    assert.notEqual(result.status, 0, `${arg} unexpectedly succeeded`);
    assert.match(result.stderr, /No direct action was provided\./);
  }
});

test("public alias smoke tests reject runtime-only namespaces", (t) => {
  for (const arg of ["--debug=1", "--credential-store=kwallet6", "--gpu-backend=vulkan", "--force-wayland"]) {
    const result = runBuilder([arg]);
    if (result.skipped) {
      t.skip(result.stderr);
      return;
    }
    assert.notEqual(result.status, 0, `${arg} unexpectedly succeeded`);
    assert.match(result.stderr, /is a Canva Linux runtime option/);
  }
});

test("public alias planned dry-run smoke tests route through c420ui-builder", (t) => {
  for (const action of ["--prepare-aur", "--bundle-deb", "--bundle-rpm"]) {
    const result = runBuilder([action, "--dry-run"]);
    if (result.skipped) {
      t.skip(result.stderr);
      return;
    }
    assert.equal(result.status, 0, `${action} stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
});


test("compiled Electron runtime remains canva-linux", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.build.linux.executableName, "canva-linux");
  assert.equal(pkg.build.appId, "io.github.coletivo420.canva-linux");
});
