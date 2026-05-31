import { runFlatpakValidation } from "./canva-linux/validation/flatpak";

function main(): void {
  const args = process.argv.slice(2);
  const releaseArtifacts = args.includes("--release-artifacts");
  const result = runFlatpakValidation({ rootDir: process.cwd(), releaseArtifacts });
  process.exit(result.ok ? 0 : 1);
}

main();
