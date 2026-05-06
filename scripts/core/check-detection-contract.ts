import { findProjectRoot } from "./action-registry";
import { buildOverviewStatus } from "./overview-status";

const booleanFields = [
  "nativeSystem",
  "nativeUser",
  "flatpakSystem",
  "flatpakUser",
  "appImageArtifacts",
];
const versionFields = [
  "nativeSystemVersion",
  "nativeUserVersion",
  "flatpakSystemVersion",
  "flatpakUserVersion",
  "appImageVersion",
];

export function main(): number {
  const rootDir = findProjectRoot();
  const raw = JSON.stringify(buildOverviewStatus(rootDir));

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `overview-status stdout is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed.package || typeof parsed.package !== "object")
    throw new Error("overview-status missing package object");
  for (const field of ["version", "phase", "appId", "executable"]) {
    if (typeof parsed.package[field] !== "string")
      throw new Error(`overview-status package.${field} must be string`);
  }
  if (!parsed.installations || typeof parsed.installations !== "object")
    throw new Error("overview-status missing installations object");
  for (const field of booleanFields) {
    if (typeof parsed.installations[field] !== "boolean")
      throw new Error(`overview-status installations.${field} must be boolean`);
  }
  for (const field of versionFields) {
    if (typeof parsed.installations[field] !== "string")
      throw new Error(`overview-status installations.${field} must be string`);
  }

  console.log("[ok] Detection contract check passed");
  return 0;
}

if (
  require.main === module &&
  /check-detection-contract\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[error] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
