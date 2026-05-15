import { runC420UICli, type C420UIEvent } from "../../packages/c420ui/src";
import { createCanvaLinuxBridge } from "./bridge";
import { createCanvaLinuxRootProvider } from "./root-provider";

function emitDirectCliEvent(event: C420UIEvent): void {
  if (event.type !== "log") return;
  const line = `${event.line}\n`;
  if (event.source === "stderr") {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}

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
    rootProvider: createCanvaLinuxRootProvider(),
    emit: emitDirectCliEvent,
    writeStdout: (line) => process.stdout.write(`${line}\n`),
    writeStderr: (line) => process.stderr.write(`${line}\n`),
  });

  return result.exitCode;
}
