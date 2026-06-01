import { spawnSync } from "node:child_process";

export function verifyArchiveSha256(archivePath: string, expectedSha256: string, cwd: string): string | null {
  const result = spawnSync("sha256sum", ["-c"], {
    cwd,
    shell: false,
    encoding: "utf8",
    input: `${expectedSha256}  ${archivePath}\n`,
  });

  if (result.status !== 0) {
    return `Archive SHA256 mismatch: ${result.stderr || result.stdout || `exit ${result.status}`}`.trim();
  }

  return null;
}
