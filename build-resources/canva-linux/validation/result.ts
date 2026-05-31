export type ValidationResult = {
  ok: boolean;
  warnings: string[];
  failures: string[];
};

export type ValidationContext = {
  rootDir: string;
  dryRun?: boolean;
  releaseArtifacts?: boolean;
};

export function okResult(warnings: string[] = []): ValidationResult {
  return { ok: true, warnings, failures: [] };
}

export function failResult(failures: string[], warnings: string[] = []): ValidationResult {
  return { ok: false, warnings, failures };
}
