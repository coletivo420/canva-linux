import fs from "node:fs";
import path from "node:path";

const repoRoot =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
const effectiveMetadataPath = ".build/canva-linux/build-metadata.effective.json";
const committedMetadataPath = "config/canva-linux/build-metadata.json";
const metadataSourcePath = fs.existsSync(path.join(repoRoot, effectiveMetadataPath))
  ? effectiveMetadataPath
  : committedMetadataPath;
const copies: ReadonlyArray<readonly [from: string, to: string]> = [
  ["build-resources/electron/assets", ".build/electron/assets"],
  ["build-resources/electron/ui", ".build/electron/ui"],
  [metadataSourcePath, ".build/electron/config/canva-linux/build-metadata.json"],
];

export function main(): void {
  for (const [from, to] of copies) {
    const source = path.join(repoRoot, from);
    const target = path.join(repoRoot, to);

    if (!fs.existsSync(source)) {
      console.log(`[runtime-build] skip missing ${from}`);
      continue;
    }

    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });

    console.log(`[runtime-build] copied ${from} -> ${to}`);
  }
}

if (require.main === module) main();
