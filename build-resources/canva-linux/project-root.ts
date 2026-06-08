import fs from "node:fs";
import path from "node:path";

function isProjectRoot(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "build-resources/canva-linux/config/actions.json")) &&
    fs.existsSync(path.join(dir, "build-resources/canva-linux/config/project-ui.json"))
  );
}

function scriptDirFromArgv(): string | null {
  const scriptPath = process.argv[1];
  if (!scriptPath) return null;
  return path.dirname(path.resolve(scriptPath));
}

function searchUpwards(startDir: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    if (isProjectRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function defaultRootSearchDir(): string {
  const fromEnv = process.env.CANVA_SCRIPT_REPO_ROOT;
  if (fromEnv) return path.resolve(fromEnv);
  const fromScript = scriptDirFromArgv();
  if (fromScript) {
    const match = searchUpwards(fromScript);
    if (match) return match;
  }
  return path.resolve(process.cwd());
}

export function findCanvaLinuxProjectRoot(
  startDir = defaultRootSearchDir(),
): string {
  const fromStart = searchUpwards(startDir);
  if (fromStart) return fromStart;
  return defaultRootSearchDir();
}
