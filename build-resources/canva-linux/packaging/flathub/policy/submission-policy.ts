import fs from "node:fs";

export function readManifest(path: string): string {
  return fs.readFileSync(path, "utf8");
}

export function extractArchiveUrl(manifestContent: string): string | null {
  const match = manifestContent.match(/url:\s*(\S+)/);
  return match?.[1] ?? null;
}

export function extractArchiveSha256(manifestContent: string): string | null {
  const match = manifestContent.match(/sha256:\s*([a-fA-F0-9]{64})/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function validateSubmissionManifestTokens(manifestContent: string): string[] {
  const failures: string[] = [];
  const required = [
    "runtime: org.freedesktop.Platform",
    "sdk: org.freedesktop.Sdk",
    "base: org.electronjs.Electron2.BaseApp",
    "command: run.sh",
    "type: archive",
    "sha256:",
    "npm install --offline",
    "generated-sources.json",
  ] as const;

  for (const token of required) {
    if (!manifestContent.includes(token)) {
      failures.push(`Missing required manifest token: ${token}`);
    }
  }

  if (manifestContent.includes("type: dir")) {
    failures.push("Submission manifest must not use type: dir");
  }

  return failures;
}
