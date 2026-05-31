import fs from "node:fs";

export function hasBuildMetadata(path: string): boolean {
  return fs.existsSync(path);
}
