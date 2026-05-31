import fs from "node:fs";
import path from "node:path";

export type RequiredFile = {
  path: string;
  label: string;
};

export function validateRequiredFiles(rootDir: string, files: RequiredFile[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    if (!fs.existsSync(path.join(rootDir, file.path))) {
      failures.push(`Missing required ${file.label}: ${file.path}`);
    }
  }
  return failures;
}
