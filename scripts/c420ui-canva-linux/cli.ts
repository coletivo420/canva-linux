import { runC420UICli } from "../../packages/c420ui/src";
import { createCanvaLinuxBridge } from "./bridge";

export async function runCanvaLinuxC420UICli(
  argv: string[],
): Promise<number> {
  const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  const bridge = createCanvaLinuxBridge(rootDir);

  const result = await runC420UICli({
    bridge,
    rootDir,
    argv,
    env: process.env,
    writeStdout: (line) => process.stdout.write(`${line}\n`),
    writeStderr: (line) => process.stderr.write(`${line}\n`),
  });

  return result.exitCode;
}
