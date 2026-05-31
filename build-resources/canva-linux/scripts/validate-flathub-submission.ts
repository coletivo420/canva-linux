import { runFlathubSubmissionValidation } from "../validation/flathub-submission";

function main(): void {
  const result = runFlathubSubmissionValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}

main();
