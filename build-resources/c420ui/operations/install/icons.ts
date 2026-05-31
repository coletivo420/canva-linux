import fs from "node:fs";

export function hasIconsDirectory(path: string): boolean {
  return fs.existsSync(path);
}
