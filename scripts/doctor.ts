import { runDoctorValidation } from "./canva-linux/validation/doctor";

function main(): void {
  const result = runDoctorValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}

main();
