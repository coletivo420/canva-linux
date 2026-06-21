import fs from "node:fs";
import path from "node:path";
import { info, ok, warn, error } from "../../host/ui.js";
import { runC420UIRustRemovePaths } from "../../src/rust-maintenance.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { type FlatpakScope, flatpakScopeArg } from "./scope.js";
import type { c420uiLogEvent } from "../../src/events.js";

const FLATPAK_APP_ID = "io.github.coletivo420.canva-linux";
const LOCAL_FLATPAK_REMOTE = "canva-linux-local";

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function removeFlatpakBuildArtifacts(
  rootDir: string,
  scope: FlatpakScope,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const { dryRun } = options;
  const paths = ["build-dir", "repo", ".flatpak-builder"];

  for (const p of paths) {
    const absPath = path.join(rootDir, p);
    if (!fs.existsSync(absPath)) continue;

    try {
      if (dryRun) {
        info(`[dry-run] rm -rf ${absPath}`);
      } else {
        fs.rmSync(absPath, { recursive: true, force: true });
      }
    } catch {
      if (scope === "system") {
        warn(`Could not remove ${p} as current user; retrying with sudo`);
        await runC420UIRustRemovePaths({
          rootDir,
          targets: [p],
          dryRun,
          allowSudo: true,
          env: process.env,
        });
      } else {
        throw new Error(`Could not remove ${p} and sudo is disabled in user scope`);
      }
    }
  }
}

export async function buildFlatpakRepo(
  rootDir: string,
  scope: FlatpakScope,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const { dryRun } = options;
  const scopeArg = flatpakScopeArg(scope);

  info("Cleaning previous Flatpak build artifacts");
  await removeFlatpakBuildArtifacts(rootDir, scope, { dryRun });

  if (dryRun) {
    info(`[dry-run] flatpak-builder --force-clean ${scopeArg} --install-deps-from=flathub --repo=repo build-dir io.github.coletivo420.canva-linux.yml`);
    info("[dry-run] flatpak build-update-repo --generate-static-deltas repo");
    return;
  }

  info(`Building Flatpak repository using ${scope} dependency scope`);
  const result = await runC420UIRustProcess({
    rootDir,
    command: "flatpak-builder",
    args: [
      "--force-clean",
      scopeArg,
      "--install-deps-from=flathub",
      "--repo=repo",
      "build-dir",
      "io.github.coletivo420.canva-linux.yml",
    ],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-builder",
    emitLog,
    emitProgress: () => {},
  });

  if (result.code !== 0) {
    throw new Error(`flatpak-builder failed with status ${result.code}`);
  }

  info("Generating repository summary");
  const updateResult = await runC420UIRustProcess({
    rootDir,
    command: "flatpak",
    args: ["build-update-repo", "--generate-static-deltas", "repo"],
    cwd: rootDir,
    env: process.env,
    label: "flatpak build-update-repo",
    emitLog,
    emitProgress: () => {},
  });
  if (updateResult.code !== 0) {
    throw new Error(`flatpak build-update-repo failed with status ${updateResult.code}`);
  }
}

export function repoHasAppRef(rootDir: string): boolean {
  const refsDir = path.join(rootDir, "repo/refs");
  if (!fs.existsSync(refsDir)) return false;

  const findRef = (dir: string): boolean => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (findRef(fullPath)) return true;
        } else if (entry.isFile() && fullPath.includes("io.github.coletivo420.canva-linux")) {
          return true;
        }
      }
    } catch {
      // Ignore
    }
    return false;
  };

  return findRef(refsDir);
}

export async function installFlatpakDirect(
  rootDir: string,
  scope: FlatpakScope,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const { dryRun } = options;
  const scopeArg = flatpakScopeArg(scope);

  if (scope === "system") {
    await buildFlatpakRepo(rootDir, scope, options);
    await installSystemFlatpakFromRepo(rootDir, options);
    return;
  }

  info("Cleaning previous Flatpak build artifacts");
  await removeFlatpakBuildArtifacts(rootDir, scope, options);

  info(`Building and installing Flatpak directly in ${scope} scope`);
  if (dryRun) {
    info(`[dry-run] flatpak-builder --force-clean ${scopeArg} --install --install-deps-from=flathub build-dir io.github.coletivo420.canva-linux.yml`);
    ok(`Direct local Flatpak install completed in ${scope} scope`);
    return;
  }
  const result = await runC420UIRustProcess({
    rootDir,
    command: "flatpak-builder",
    args: [
      "--force-clean",
      scopeArg,
      "--install",
      "--install-deps-from=flathub",
      "build-dir",
      "io.github.coletivo420.canva-linux.yml",
    ],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-builder-install",
    emitLog,
    emitProgress: () => {},
  });

  if (result.code !== 0) {
    throw new Error(`flatpak-builder failed with status ${result.code}`);
  }

  ok(`Direct local Flatpak install completed in ${scope} scope`);
}

async function installSystemFlatpakFromRepo(
  rootDir: string,
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const { dryRun } = options;
  const repoPath = path.join(rootDir, "repo");
  const repoUri = `file://${repoPath}`;

  info(`Configuring local system Flatpak remote: ${LOCAL_FLATPAK_REMOTE}`);

  let remotesOutput = "";
  await runC420UIRustProcess({
    rootDir,
    command: "flatpak",
    args: ["remotes", "--system"],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-remotes",
    emitLog: (event) => {
      if (event.source === "stdout") remotesOutput += event.line + "\n";
    },
    emitProgress: () => {},
  });

  const hasRemote = remotesOutput.split("\n").some((line) => line.startsWith(LOCAL_FLATPAK_REMOTE));

  if (hasRemote) {
    if (dryRun) {
      info(`[dry-run] sudo flatpak remote-modify --system --no-gpg-verify --url=${repoUri} ${LOCAL_FLATPAK_REMOTE}`);
    } else {
      const result = await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["flatpak", "remote-modify", "--system", "--no-gpg-verify", `--url=${repoUri}`, LOCAL_FLATPAK_REMOTE],
        cwd: rootDir,
        env: process.env,
        label: "flatpak-remote-modify",
        emitLog,
        emitProgress: () => {},
      });
      if (result.code !== 0) throw new Error("Failed to configure local system Flatpak remote");
    }
  } else {
    if (dryRun) {
      info(`[dry-run] sudo flatpak remote-add --system --no-gpg-verify --if-not-exists ${LOCAL_FLATPAK_REMOTE} ${repoUri}`);
    } else {
      const result = await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["flatpak", "remote-add", "--system", "--no-gpg-verify", "--if-not-exists", LOCAL_FLATPAK_REMOTE, repoUri],
        cwd: rootDir,
        env: process.env,
        label: "flatpak-remote-add",
        emitLog,
        emitProgress: () => {},
      });
      if (result.code !== 0) throw new Error("Failed to configure local system Flatpak remote");
    }
  }

  info("Installing Canva Linux from local repo into system Flatpak scope");
  if (dryRun) {
    info(`[dry-run] sudo flatpak install -y --system --reinstall ${LOCAL_FLATPAK_REMOTE} ${FLATPAK_APP_ID}`);
  } else {
    const installResult = await runC420UIRustProcess({
      rootDir,
      command: "sudo",
      args: ["flatpak", "install", "-y", "--system", "--reinstall", LOCAL_FLATPAK_REMOTE, FLATPAK_APP_ID],
      cwd: rootDir,
      env: process.env,
      label: "flatpak-install-system",
      emitLog,
      emitProgress: () => {},
    });
    if (installResult.code !== 0) throw new Error("Failed to install system Flatpak from local repo");
  }

  ok("Direct local Flatpak install completed in system scope");
}
