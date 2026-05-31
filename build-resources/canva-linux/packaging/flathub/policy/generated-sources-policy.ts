import fs from "node:fs";

export function validateGeneratedSources(path: string): string[] {
  const failures: string[] = [];
  const payload = JSON.parse(fs.readFileSync(path, "utf8")) as {
    sources?: Array<{ url?: unknown }>;
  };

  if (!payload || typeof payload !== "object") {
    return ["generated-sources.json is not a valid module object"];
  }

  if (!Array.isArray(payload.sources) || payload.sources.length === 0) {
    return ["generated-sources.json has no npm sources"];
  }

  const hasNpmRegistrySource = payload.sources.some((entry) =>
    typeof entry?.url === "string" && entry.url.includes("registry.npmjs.org"),
  );

  if (!hasNpmRegistrySource) {
    failures.push("generated-sources.json does not contain npm registry sources");
  }

  return failures;
}
