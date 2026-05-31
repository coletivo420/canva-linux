import { runStep } from "./run-step";
import { failResult, okResult, type ValidationContext, type ValidationResult } from "./result";

export function runAppImageValidation(context: ValidationContext, args: string[]): ValidationResult {
  const result = runStep("validate appimage", "bash", ["scripts/validate-appimage.sh", ...args], context.rootDir);
  return result.ok ? okResult() : failResult(["AppImage validation failed"]);
}

if (require.main === module) {
  const result = runAppImageValidation({ rootDir: process.cwd() }, process.argv.slice(2));
  process.exit(result.ok ? 0 : 1);
}
