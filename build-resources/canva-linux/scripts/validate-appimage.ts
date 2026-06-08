import { runAppImageValidation } from "../validation/appimage.js";

function main(): void {
  const result = runAppImageValidation({ rootDir: process.cwd() }, process.argv.slice(2));
  process.exit(result.ok ? 0 : 1);
}

main();
