import { spawnSync } from "node:child_process";
import { info, ok, warn } from "../../host/ui.js";
import { c420uiSudoRun, c420uiSudoValidate } from "../../host/sudo.js";
import { type FlatpakScope, flatpakScopeArg } from "./scope.js";

const REQUIRED_RUNTIMES = [
  "org.freedesktop.Platform//25.08",
  "org.freedesktop.Sdk//25.08",
  "org.electronjs.Electron2.BaseApp//25.08",
];

export function ensureFlathubRuntime(
  scope: FlatpakScope,
  options: { dryRun?: boolean; rootDir?: string } = {},
): void {
  const { dryRun } = options;
  const scopeArg = flatpakScopeArg(scope);

  if (scope === "system") {
    info("Administrator authorization is required for system Flatpak installation.");
    warn("Canva Linux will write to the system Flatpak scope for all users.");
    if (!dryRun) c420uiSudoValidate(options.rootDir);

    const remotes = spawnSync("flatpak", ["remotes", "--system"], {
      encoding: "utf8",
    });
    const hasFlathub = remotes.stdout.split("\n").some((line) => line.startsWith("flathub"));

    if (!hasFlathub) {
      warn("System Flathub remote is not configured.");
      const status = c420uiSudoRun(
        "flatpak",
        [
          "remote-add",
          "--if-not-exists",
          "--system",
          "flathub",
          "https://dl.flathub.org/repo/flathub.flatpakrepo",
        ],
        { dryRun },
      );
      if (status !== 0) throw new Error("Failed to configure system Flathub remote");
    } else {
      info("System Flathub remote is already configured");
    }

    info("Ensuring required Flatpak runtimes are installed in system scope");
    const status = c420uiSudoRun(
      "flatpak",
      ["install", "-y", "--system", "flathub", ...REQUIRED_RUNTIMES],
      { dryRun },
    );
    if (status !== 0) throw new Error("Failed to install required Flatpak runtimes");

    ok("Flatpak runtimes are ready in system scope");
    return;
  }

  warn("Using user Flatpak scope because CANVA_FLATPAK_SCOPE=user was set.");
  if (dryRun) {
    info(`[dry-run] flatpak remote-add --if-not-exists ${scopeArg} flathub https://dl.flathub.org/repo/flathub.flatpakrepo`);
    info(`[dry-run] flatpak install -y ${scopeArg} flathub ${REQUIRED_RUNTIMES.join(" ")}`);
    ok("Flatpak runtimes are ready in user scope");
    return;
  }

  let result = spawnSync(
    "flatpak",
    ["remote-add", "--if-not-exists", scopeArg, "flathub", "https://dl.flathub.org/repo/flathub.flatpakrepo"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`flatpak remote-add failed with status ${result.status}`);

  result = spawnSync("flatpak", ["install", "-y", scopeArg, "flathub", ...REQUIRED_RUNTIMES], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`flatpak install failed with status ${result.status}`);

  ok("Flatpak runtimes are ready in user scope");
}
