import { runDoctorValidation } from "../validation/doctor.js";

function main(): void {
  const result = runDoctorValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}

main();
