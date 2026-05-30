import { spawnSync } from "node:child_process";

function main(): void {
  const result = spawnSync("bash", ["scripts/validate-appimage.sh", ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

main();
