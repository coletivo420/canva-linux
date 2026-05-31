import fs from "node:fs";

export function loadDesktopTemplate(path: string): string {
  return fs.readFileSync(path, "utf8");
}
