import { info, ok, warn, error } from "../../host/ui.js";
import { runC420UIRustSudoValidate } from "../../src/rust-maintenance.js";
import { runC420UIRustProcess } from "../../src/rust-process-runner.js";
import { type FlatpakScope, flatpakScopeArg } from "./scope.js";
import type { c420uiLogEvent } from "../../src/events.js";

const REQUIRED_RUNTIMES = [
  "org.freedesktop.Platform//25.08",
  "org.freedesktop.Sdk//25.08",
  "org.electronjs.Electron2.BaseApp//25.08",
];

function emitLog(event: c420uiLogEvent): void {
  if (event.level === "error") error(event.line);
  else if (event.level === "warning") warn(event.line);
  else info(event.line);
}

export async function ensureFlathubRuntime(
  scope: FlatpakScope,
  options: { dryRun?: boolean; rootDir?: string } = {},
): Promise<void> {
  const { dryRun, rootDir = process.cwd() } = options;
  const scopeArg = flatpakScopeArg(scope);

  if (scope === "system") {
    info("Administrator authorization is required for system Flatpak installation.");
    warn("Canva Linux will write to the system Flatpak scope for all users.");
    if (!dryRun) {
      const valid = await runC420UIRustSudoValidate({ rootDir, env: process.env });
      if (!valid) throw new Error("Sudo validation failed");
    }

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

    const hasFlathub = remotesOutput.split("\n").some((line) => line.startsWith("flathub"));

    if (!hasFlathub) {
      warn("System Flathub remote is not configured.");
      if (dryRun) {
        info("[dry-run] sudo flatpak remote-add --if-not-exists --system flathub https://dl.flathub.org/repo/flathub.flatpakrepo");
      } else {
        const result = await runC420UIRustProcess({
          rootDir,
          command: "sudo",
          args: [
            "flatpak",
            "remote-add",
            "--if-not-exists",
            "--system",
            "flathub",
            "https://dl.flathub.org/repo/flathub.flatpakrepo",
          ],
          cwd: rootDir,
          env: process.env,
          label: "flatpak-remote-add-flathub",
          emitLog,
          emitProgress: () => {},
        });
        if (result.code !== 0) throw new Error("Failed to configure system Flathub remote");
      }
    } else {
      info("System Flathub remote is already configured");
    }

    info("Ensuring required Flatpak runtimes are installed in system scope");
    if (dryRun) {
      info(`[dry-run] sudo flatpak install -y --system flathub ${REQUIRED_RUNTIMES.join(" ")}`);
    } else {
      const installResult = await runC420UIRustProcess({
        rootDir,
        command: "sudo",
        args: ["flatpak", "install", "-y", "--system", "flathub", ...REQUIRED_RUNTIMES],
        cwd: rootDir,
        env: process.env,
        label: "flatpak-install-runtimes",
        emitLog,
        emitProgress: () => {},
      });
      if (installResult.code !== 0) throw new Error("Failed to install required Flatpak runtimes");
    }

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

  const r1 = await runC420UIRustProcess({
    rootDir,
    command: "flatpak",
    args: ["remote-add", "--if-not-exists", scopeArg, "flathub", "https://dl.flathub.org/repo/flathub.flatpakrepo"],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-remote-add-flathub-user",
    emitLog,
    emitProgress: () => {},
  });
  if (r1.code !== 0) throw new Error(`flatpak remote-add failed with status ${r1.code}`);

  const r2 = await runC420UIRustProcess({
    rootDir,
    command: "flatpak",
    args: ["install", "-y", scopeArg, "flathub", ...REQUIRED_RUNTIMES],
    cwd: rootDir,
    env: process.env,
    label: "flatpak-install-runtimes-user",
    emitLog,
    emitProgress: () => {},
  });
  if (r2.code !== 0) throw new Error(`flatpak install failed with status ${r2.code}`);

  ok("Flatpak runtimes are ready in user scope");
}
