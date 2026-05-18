#!/usr/bin/env node
import { buildCanvaLinuxOverviewStatus } from "./provider";

export function main(): number {
  const status = buildCanvaLinuxOverviewStatus();
  for (const warning of status.warnings || []) {
    process.stderr.write(`[warn] ${warning}\n`);
  }
  console.log(JSON.stringify(status));
  return 0;
}

if (
  require.main === module &&
  /overview-status\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    process.stderr.write(
      `[warn] Failed to build overview status: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    console.log(
      JSON.stringify({
        project: {
          version: "unknown",
          phase: "unknown",
          appId: "io.github.coletivo420.canva-linux",
          executable: "canva-linux",
          repository: "https://github.com/coletivo420/canva-linux",
        },
        installations: {
          nativeSystem: false,
          nativeUser: false,
          flatpakSystem: false,
          flatpakUser: false,
          appImageArtifacts: false,
          nativeSystemVersion: "",
          nativeUserVersion: "",
          flatpakSystemVersion: "",
          flatpakUserVersion: "",
          appImageVersion: "",
          nativeSystemFullVersion: "",
          nativeUserFullVersion: "",
          flatpakSystemFullVersion: "",
          flatpakUserFullVersion: "",
          appImageFullVersion: "",
        },
        warnings: [
          `Failed to build overview status: ${error instanceof Error ? error.message : String(error)}`,
        ],
      }),
    );
    process.exit(0);
  }
}
