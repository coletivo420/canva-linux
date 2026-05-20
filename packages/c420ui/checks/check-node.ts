import { spawnSync } from "node:child_process";

const bundles = [
  "bootstrap/c420ui/run-c420ui.cjs",
  "bootstrap/c420ui/run-c420ui-cli.cjs",
  "bootstrap/c420ui/c420ui-builder.cjs",
] as const;

let failed = false;

console.log("[c420ui-bootstrap] explicit node --check gate");

for (const bundle of bundles) {
  console.log(`[c420ui-bootstrap] ${process.execPath} --check ${bundle}`);

  const result = spawnSync(process.execPath, ["--check", bundle], {
    encoding: "utf8",
    shell: false,
  });

  if (result.status === 0 && !result.error) {
    console.log(`[ok] node --check ${bundle}`);
    continue;
  }

  failed = true;
  console.error(`[fail] node --check ${bundle}`);

  if (result.error) console.error(result.error.message);
  if (result.stdout?.trim()) console.error(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
}

if (failed) {
  console.error(
    "[c420ui-bootstrap] syntax validation failed. Regenerate bootstrap from TypeScript sources.",
  );
  process.exit(1);
}
