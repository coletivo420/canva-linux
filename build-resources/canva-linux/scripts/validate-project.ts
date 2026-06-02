import { runProjectValidation } from "../validation/project.js";

function main(): void {
  const result = runProjectValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}

main();
