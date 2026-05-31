import { createHash } from "node:crypto";
import fs from "node:fs";

export function sha256File(path: string): string {
  return createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}
