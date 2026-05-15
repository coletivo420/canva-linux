import fs from "node:fs";
import path from "node:path";

function defaultRootSearchDir(): string {
  return path.resolve(__dirname, "../..");
}

export function findCanvaLinuxProjectRoot(
  startDir = defaultRootSearchDir(),
): string {
  let current = path.resolve(startDir);
  while (true) {
    if (
      fs.existsSync(path.join(current, "package.json")) &&
      fs.existsSync(path.join(current, "config/canva-linux/actions.json")) &&
      fs.existsSync(path.join(current, "config/canva-linux/project-ui.json"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return defaultRootSearchDir();
    current = parent;
  }
}
