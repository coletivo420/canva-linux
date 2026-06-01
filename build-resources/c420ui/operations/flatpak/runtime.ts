import { spawnSync } from "node:child_process";
import { info, ok, warn } from "../../host/ui";
import { c420uiSudoRun, c420uiSudoValidate } from "../host/sudo";
import { type FlatpakScope, flatpakScopeArg } from "./scope";

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
      c420uiSudoRun(
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
    } else {
      info("System Flathub remote is already configured");
    }

    info("Ensuring required Flatpak runtimes are installed in system scope");
    c420uiSudoRun(
      "flatpak",
      ["install", "-y", "--system", "flathub", ...REQUIRED_RUNTIMES],
      { dryRun },
    );

    ok("Flatpak runtimes are ready in system scope");
  } else {
    warn("Using user Flatpak scope because CANVA_FLATPAK_SCOPE=user was set.");

    spawnSync(
      "flatpak",
      [
        "remote-add",
        "--if-not-exists",
        scopeArg,
        "flathub",
        "https://dl.flathub.org/repo/flathub.flatpakrepo",
      ],
      { stdio: "inherit" },
    );

    spawnSync(
      "flatpak",
      ["install", "-y", scopeArg, "flathub", ...REQUIRED_RUNTIMES],
      { stdio: "inherit" },
    );

    ok("Flatpak runtimes are ready in user scope");
  }
}
