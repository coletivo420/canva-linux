import fs from "node:fs";
import path from "node:path";

export function findProjectRoot(startDir: string, markers: string[]): string {
  let current = path.resolve(startDir);
  while (true) {
    const ok = markers.every((marker) => fs.existsSync(path.join(current, marker)));
    if (ok) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Unable to locate project root from configured markers.");
    }
    current = parent;
  }
}
