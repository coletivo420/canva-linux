import fs from "node:fs";

export function assertArtifact(path: string): void {
  if (!fs.existsSync(path)) {
    throw new Error(`Expected artifact was not found: ${path}`);
  }
}
