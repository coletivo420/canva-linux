import fs from "node:fs";

export function validateFlatpakBrandingTokens(checks: Array<[string, string]>): string[] {
  const failures: string[] = [];
  for (const [filePath, token] of checks) {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content.includes(token)) {
      failures.push(`${filePath}: missing required token: ${token}`);
    }
  }
  return failures;
}
