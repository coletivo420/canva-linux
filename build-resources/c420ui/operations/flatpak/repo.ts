import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { info, ok, warn } from "../../host/ui.js";
import { c420uiSudoRm, c420uiSudoRun } from "../../host/sudo.js";
import { type FlatpakScope, flatpakScopeArg } from "./scope.js";

const FLATPAK_APP_ID = "io.github.coletivo420.canva-linux";
const LOCAL_FLATPAK_REMOTE = "canva-linux-local";

export function removeFlatpakBuildArtifacts(
  rootDir: string,
  scope: FlatpakScope,
  options: { dryRun?: boolean } = {},
): void {
  const { dryRun } = options;
  const paths = ["build-dir", "repo", ".flatpak-builder"];

  for (const p of paths) {
    const absPath = path.join(rootDir, p);
    if (!fs.existsSync(absPath)) continue;

    try {
      if (dryRun) {
        console.log(`[dry-run] rm -rf ${absPath}`);
      } else {
        fs.rmSync(absPath, { recursive: true, force: true });
      }
    } catch {
      if (scope === "system") {
        warn(`Could not remove ${p} as current user; retrying with sudo`);
        c420uiSudoRm(absPath, { dryRun });
      } else {
        throw new Error(`Could not remove ${p} and sudo is disabled in user scope`);
      }
    }
  }
}

export function buildFlatpakRepo(
  rootDir: string,
  scope: FlatpakScope,
  options: { dryRun?: boolean } = {},
): void {
  const { dryRun } = options;
  const scopeArg = flatpakScopeArg(scope);

  info("Cleaning previous Flatpak build artifacts");
  removeFlatpakBuildArtifacts(rootDir, scope, { dryRun });

  if (dryRun) {
    info(`[dry-run] flatpak-builder --force-clean ${scopeArg} --install-deps-from=flathub --repo=repo build-dir io.github.coletivo420.canva-linux.yml`);
    info("[dry-run] flatpak build-update-repo --generate-static-deltas repo");
    return;
  }

  info(`Building Flatpak repository using ${scope} dependency scope`);
  const result = spawnSync(
    "flatpak-builder",
    [
      "--force-clean",
      scopeArg,
      "--install-deps-from=flathub",
      "--repo=repo",
      "build-dir",
      "io.github.coletivo420.canva-linux.yml",
    ],
    { cwd: rootDir, stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(`flatpak-builder failed with status ${result.status}`);
  }

  info("Generating repository summary");
  const updateResult = spawnSync(
    "flatpak",
    ["build-update-repo", "--generate-static-deltas", "repo"],
    { cwd: rootDir, stdio: "inherit" },
  );
  if (updateResult.status !== 0) {
    throw new Error(`flatpak build-update-repo failed with status ${updateResult.status}`);
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

export function installFlatpakDirect(
  rootDir: string,
  scope: FlatpakScope,
  options: { dryRun?: boolean } = {},
): void {
  const { dryRun } = options;
  const scopeArg = flatpakScopeArg(scope);

  if (scope === "system") {
    buildFlatpakRepo(rootDir, scope, options);
    installSystemFlatpakFromRepo(rootDir, options);
    return;
  }

  info("Cleaning previous Flatpak build artifacts");
  removeFlatpakBuildArtifacts(rootDir, scope, options);

  info(`Building and installing Flatpak directly in ${scope} scope`);
  if (dryRun) {
    info(`[dry-run] flatpak-builder --force-clean ${scopeArg} --install --install-deps-from=flathub build-dir io.github.coletivo420.canva-linux.yml`);
    ok(`Direct local Flatpak install completed in ${scope} scope`);
    return;
  }
  const result = spawnSync(
    "flatpak-builder",
    [
      "--force-clean",
      scopeArg,
      "--install",
      "--install-deps-from=flathub",
      "build-dir",
      "io.github.coletivo420.canva-linux.yml",
    ],
    { cwd: rootDir, stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(`flatpak-builder failed with status ${result.status}`);
  }

  ok(`Direct local Flatpak install completed in ${scope} scope`);
}

function installSystemFlatpakFromRepo(
  rootDir: string,
  options: { dryRun?: boolean } = {},
) {
  const { dryRun } = options;
  const repoPath = path.join(rootDir, "repo");
  const repoUri = `file://${repoPath}`;

  info(`Configuring local system Flatpak remote: ${LOCAL_FLATPAK_REMOTE}`);
  const remotes = spawnSync("flatpak", ["remotes", "--system"], {
    encoding: "utf8",
  });
  const hasRemote = remotes.stdout.split("\n").some((line) => line.startsWith(LOCAL_FLATPAK_REMOTE));

  const remoteStatus = hasRemote
    ? c420uiSudoRun(
        "flatpak",
        ["remote-modify", "--system", "--no-gpg-verify", `--url=${repoUri}`, LOCAL_FLATPAK_REMOTE],
        { dryRun },
      )
    : c420uiSudoRun(
        "flatpak",
        ["remote-add", "--system", "--no-gpg-verify", "--if-not-exists", LOCAL_FLATPAK_REMOTE, repoUri],
        { dryRun },
      );

  if (remoteStatus !== 0) throw new Error("Failed to configure local system Flatpak remote");

  info("Installing Canva Linux from local repo into system Flatpak scope");
  const installStatus = c420uiSudoRun(
    "flatpak",
    ["install", "-y", "--system", "--reinstall", LOCAL_FLATPAK_REMOTE, FLATPAK_APP_ID],
    { dryRun },
  );
  if (installStatus !== 0) throw new Error("Failed to install system Flatpak from local repo");

  ok("Direct local Flatpak install completed in system scope");
}
