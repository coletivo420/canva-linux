#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const forbiddenFragments = [
  "Canva Linux",
  "canva-linux",
  "io.github.coletivo420.canva-linux",
  "build-resources/electron",
  "build-resources/canva-linux",
  "CLeyedropper",
  "toolbar",
  "Electron runtime",
  "Flatpak policy",
  "AppImage policy",
];

function collectRustFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "target") return [];
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectRustFiles(entryPath);
    }
    if (entry.isFile()) {
      return [entryPath];
    }
    return [];
  });
}

export function main(): number {
  const rootDir = process.cwd();
  const rustDir = path.join(rootDir, "build-resources/c420ui-rs");
  const files = collectRustFiles(rustDir);
  const failures: string[] = [];

  for (const file of files) {
    const relativePath = path.relative(rootDir, file).replace(/\\/g, "/");
    const source = fs.readFileSync(file, "utf8");
    for (const fragment of forbiddenFragments) {
      if (source.includes(fragment)) {
        failures.push(`${relativePath}: Rust boundary must not contain dependent-project fragment: "${fragment}"`);
      }
    }
  }

  if (failures.length) {
    console.error("[check-rust-boundary] FAILED:\n" + failures.join("\n"));
    return 1;
  }

  console.log("[check-rust-boundary] OK");
  return 0;
}

if (/check-rust-boundary\.(mjs|js|ts)$/.test(process.argv[1] || "")) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[check-rust-boundary] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
