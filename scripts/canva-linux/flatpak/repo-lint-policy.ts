import fs from "node:fs";

const allowedErrors = new Set([
  "appstream-external-screenshot-url",
  "appstream-screenshots-not-mirrored-in-ostree",
]);

export function repoLintHasOnlyLocalScreenshotMirrorFindings(outputPath: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch {
    return false;
  }

  if (!parsed || typeof parsed !== "object") return false;
  const payload = parsed as { errors?: unknown; warnings?: unknown };
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];

  return (
    errors.length > 0
    && errors.every((item) => typeof item === "string" && allowedErrors.has(item))
    && warnings.length === 0
  );
}
