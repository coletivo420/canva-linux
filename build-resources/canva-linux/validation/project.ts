import { hasCommand } from "./optional-command";
import { runStep } from "./run-step";
import { failResult, okResult, type ValidationContext, type ValidationResult } from "./result";

export type ValidationStep = { label: string; command: string; args: string[] };

export function projectValidationSteps(): ValidationStep[] {
  return [
    { label: "npm run build:metadata", command: "npm", args: ["run", "build:metadata"] },
    { label: "npm run lint", command: "npm", args: ["run", "lint"] },
    { label: "npm run typecheck", command: "npm", args: ["run", "typecheck"] },
    { label: "npm run typecheck:strict", command: "npm", args: ["run", "typecheck:strict"] },
    { label: "npm test", command: "npm", args: ["test"] },
    { label: "npm run check:c420ui-node-check", command: "npm", args: ["run", "check:c420ui-node-check"] },
    { label: "npm run check:c420ui-bootstrap-artifacts", command: "npm", args: ["run", "check:c420ui-bootstrap-artifacts"] },
    { label: "git diff --exit-code", command: "git", args: ["diff", "--exit-code"] },
    { label: "npm run docs:check-ai", command: "npm", args: ["run", "docs:check-ai"] },
    { label: "check flatpak scope policy", command: "bash", args: ["scripts/check-flatpak-scope-policy.sh"] },
    { label: "check shell ui api", command: "bash", args: ["scripts/check-shell-ui-api.sh"] },
    { label: "npm run check:c420ui-core", command: "npm", args: ["run", "check:c420ui-core"] },
    { label: "npm run check:canva-linux", command: "npm", args: ["run", "check:canva-linux"] },
    { label: "npm run check:shared-tooling", command: "npm", args: ["run", "check:shared-tooling"] },
    { label: "npm run build:runtime", command: "npm", args: ["run", "build:runtime"] },
    { label: "npm run build:check", command: "npm", args: ["run", "build:check"] },
  ];
}

export function runProjectValidation(context: ValidationContext): ValidationResult {
  const warnings: string[] = [];
  const failures: string[] = [];

  for (const step of projectValidationSteps()) {
    const result = runStep(step.label, step.command, step.args, context.rootDir);
    if (!result.ok) {
      failures.push(`${step.label} failed`);
      return failResult(failures, warnings);
    }
  }

  if (hasCommand("desktop-file-validate")) {
    const result = runStep(
      "desktop-file-validate",
      "desktop-file-validate",
      ["build-resources/canva-linux/assets/desktop/io.github.coletivo420.canva-linux.desktop"],
      context.rootDir,
    );
    if (!result.ok) failures.push("desktop-file-validate failed");
  } else {
    warnings.push("desktop-file-validate not found, skipping");
    console.log("[info] desktop-file-validate not found, skipping");
  }

  if (hasCommand("appstreamcli")) {
    const result = runStep(
      "appstreamcli validate --explain --no-net",
      "appstreamcli",
      [
        "validate",
        "--explain",
        "--no-net",
        "--override",
        "releases-not-in-order=info",
        "build-resources/canva-linux/assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
      ],
      context.rootDir,
    );
    if (!result.ok) failures.push("appstreamcli validate failed");
  } else {
    warnings.push("appstreamcli not found, skipping");
    console.log("[info] appstreamcli not found, skipping");
  }

  for (const [label, script] of [
    ["validate flatpak", ".build/scripts/validate-flatpak.js"],
    ["validate flathub submission", ".build/scripts/validate-flathub-submission.js"],
  ] as const) {
    const result = runStep(label, "node", [script], context.rootDir);
    if (!result.ok) failures.push(`${label} failed`);
  }

  const diffCheck = runStep("git diff --check", "git", ["diff", "--check"], context.rootDir);
  if (!diffCheck.ok) failures.push("git diff --check failed");

  if (failures.length > 0) return failResult(failures, warnings);
  console.log("[ok]  Project validation completed");
  return okResult(warnings);
}

if (require.main === module) {
  const result = runProjectValidation({ rootDir: process.cwd() });
  process.exit(result.ok ? 0 : 1);
}
