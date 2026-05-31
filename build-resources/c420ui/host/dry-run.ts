export type DryRunOptions = { dryRun: boolean };

export function parseDryRun(argv: string[]): DryRunOptions {
  return { dryRun: argv.includes("--dry-run") };
}
