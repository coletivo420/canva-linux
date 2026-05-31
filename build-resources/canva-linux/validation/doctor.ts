import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { hasCommand } from "./optional-command";
import { failResult, okResult, type ValidationContext, type ValidationResult } from "./result";

function major(version: string): number {
  return Number(version.replace(/^v/, "").split(".")[0] || "0");
}

export function runDoctorValidation(context: ValidationContext): ValidationResult {
  const warnings: string[] = [];
  const failures: string[] = [];

  if (typeof process.versions?.node === "string") {
    console.log(`[ok] node: v${process.versions.node}`);
    if (major(process.versions.node) < 22) {
      failures.push("Node.js >= 22 is required");
      console.error("[error] Node.js >= 22 is required");
    }
  } else {
    failures.push("node missing");
    console.error("[error] node missing");
  }

  for (const req of ["npm", "git"] as const) {
    if (hasCommand(req)) {
      console.log(`[ok] ${req}`);
    } else {
      failures.push(`${req} missing`);
      console.error(`[error] ${req} missing`);
    }
  }

  const nodeModulesDir = path.join(context.rootDir, "node_modules");
  if (!fs.existsSync(nodeModulesDir)) {
    warnings.push("node_modules missing — let c420ui ensure npm dependencies");
    console.warn("[warn] node_modules missing — let c420ui ensure npm dependencies");
  } else {
    const depsPath = path.join(context.rootDir, "build-resources/canva-linux/config/dependencies.json");
    const config = JSON.parse(fs.readFileSync(depsPath, "utf8")) as { npm?: { requiredDevDependencies?: string[] } };
    const req = createRequire(path.join(context.rootDir, "package.json"));
    for (const dep of config.npm?.requiredDevDependencies ?? []) {
      try {
        req.resolve(dep, { paths: [context.rootDir] });
        console.log(`[ok] npm dependency: ${dep}`);
      } catch {
        warnings.push(`npm dependency missing: ${dep} — let c420ui ensure npm dependencies`);
        console.warn(`[warn] npm dependency missing: ${dep} — let c420ui ensure npm dependencies`);
      }
    }
  }

  const optionalTools: Array<[string, string]> = [
    ["flatpak", "Flatpak Install and .flatpak package generation will not work"],
    ["flatpak-builder", "Flatpak package generation will not work"],
    ["desktop-file-validate", "desktop metadata validation will not work"],
    ["appstreamcli", "AppStream validation will not work"],
  ];

  for (const [cmd, message] of optionalTools) {
    if (!hasCommand(cmd)) {
      warnings.push(`${cmd} missing — ${message}`);
      console.warn(`[warn] ${cmd} missing — ${message}`);
    }
  }

  console.log("[info] AppImage packaging: experimental");
  console.log("[info] AppImage command: ./canva-linux-c420ui-builder --bundle-appimage");
  console.log("[info] AppImage runtime may require FUSE support on some distributions");

  if (hasCommand("fusermount3")) {
    console.log("[ok] fusermount3 found");
  } else if (hasCommand("fusermount")) {
    console.log("[ok] fusermount found");
  } else {
    warnings.push("fusermount/fusermount3 not found — AppImage execution may require FUSE support");
    console.warn("[warn] fusermount/fusermount3 not found — AppImage execution may require FUSE support");
    console.log("[info] See docs/APPIMAGE_FUSE.md");
  }

  console.log("[info] deb/rpm packaging: planned");
  console.log("[info] AUR/PKGBUILD packaging: planned");

  if (failures.length > 0) return failResult(failures, warnings);
  return okResult(warnings);
}

if (require.main === module) {
  const result = runDoctorValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}
