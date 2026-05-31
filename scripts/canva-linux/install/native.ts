import { parseDryRun } from "../host/dry-run";
import { projectRoot } from "../host/paths";
import { requireCommands } from "../host/preflight";
import { runCommand } from "../host/command-runner";
import { info, ok } from "../host/ui";

export function runNativeInstall(argv: string[]): void {
  const rootDir = projectRoot();
  const { dryRun } = parseDryRun(argv);
  const scope = process.env.CANVA_NATIVE_SCOPE === "user" ? "user" : "system";

  requireCommands(["node", "npm", "bash"]);
  info(`Native install scope: ${scope}`);

  runCommand("npm", ["run", "build:metadata:effective"], { cwd: rootDir, dryRun });
  runCommand("bash", ["build-resources/c420ui/scripts/install-native.sh"], {
    cwd: rootDir,
    dryRun,
    env: { ...process.env, CANVA_NATIVE_SCOPE: scope },
  });

  ok(`Native ${scope} install completed`);
}
