import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../../host/paths";
import { c420uiSudoInstall } from "../host/sudo";

export function getBuildMetadataSource(rootDir: string = projectRoot()): string {
  const effective = path.join(
    rootDir,
    ".build/canva-linux/build-metadata.effective.json",
  );
  const committed = path.join(
    rootDir,
    "build-resources/canva-linux/config/build-metadata.json",
  );

  if (fs.existsSync(effective)) return effective;
  return committed;
}

export function installBuildMetadataMarker(
  target: string,
  scope: "system" | "user",
  options: { dryRun?: boolean; rootDir?: string } = {},
): void {
  const rootDir = options.rootDir ?? projectRoot();
  const dryRun = options.dryRun ?? false;
  const source = getBuildMetadataSource(rootDir);

  if (!fs.existsSync(source)) return;

  if (scope === "system") {
    c420uiSudoInstall(["-Dm644", source, target], { dryRun });
  } else {
    if (dryRun) {
      console.log(`[dry-run] install -Dm644 ${source} ${target}`);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      fs.chmodSync(target, 0o644);
    }
  }
}

export function writeBuildMetadataSidecar(
  artifactPath: string,
  options: { rootDir?: string } = {},
): void {
  const rootDir = options.rootDir ?? projectRoot();
  const source = getBuildMetadataSource(rootDir);

  if (!fs.existsSync(source)) return;
  fs.copyFileSync(source, `${artifactPath}.build-metadata.json`);
}
