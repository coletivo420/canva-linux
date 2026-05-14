#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { findCanvaLinuxProjectRoot as findProjectRoot } from "../canva-linux/project-root";

const requiredFiles = [
  "docs/internal/AI_GUARDRAILS.md",
  "docs/VALIDATION.md",
  "docs/TYPESCRIPT.md",
  "docs/CANVA_LINUX_EYEDROPPER.md",
  "README.md",
];

const readmeRefs = [
  "docs/README.md",
  "docs/INSTALLATION.md",
  "docs/CLI.md",
  "docs/FEATURES.md",
  "docs/DEBUGGING.md",
  "docs/TROUBLESHOOTING.md",
  "docs/VALIDATION.md",
  "docs/RELEASE.md",
  "docs/DEVELOPMENT.md",
  "docs/TECHNICAL.md",
  "docs/TYPESCRIPT.md",
  "docs/CANVA_LINUX_EYEDROPPER.md",
  "docs/APPIMAGE_FUSE.md",
];


const requiredSplitDocFragments: Record<string, string[]> = {
  "docs/c420ui/ARCHITECTURE.md": [
    "Controls",
    "Must not control",
    "Implementing files",
    "Consumed configs and adapters",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/ACTION_ENGINE.md": [
    "dry-run",
    "planned",
    "root",
    "requestRootAccess",
    "bridge.runAction",
    "adapter",
    "fallback",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/COMMAND_RUNNER.md": [
    "Command Runner",
    "Operational log",
    "redaction",
    "adapter",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/ROOT_PROVIDER.md": [
    "c420uiRootProvider",
    "validateRootAccess",
    "validateRootAccessWithInput",
    "C420UI_ROOT_AUTH",
    "sudo-helper.sh",
    "passwords",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/HOST_DEPENDENCIES.md": [
    "Node.js",
    "command lookup",
    "npm declared-versus-installed",
    "C420UI_SKIP_DEPENDENCY_INSTALL",
    "C420UI_DEPENDENCY_REPAIR",
    "config/canva-linux/dependencies.json",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/DEVELOPMENT_PROVIDER.md": [
    "Development Provider",
    "development.json",
    "actions.json",
    "planned",
    "scope",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/ARTIFACTS.md": [
    "c420uiArtifactRecipeWorkflow",
    "outputPattern",
    "${version}",
    "x64",
    "${arch}",
    "scope",
    "planned",
    "requiresRoot",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/c420ui/TERMINAL_UI.md": [
    "Terminal UI",
    "requestRootAccess",
    "project-ui.json",
    "Focus",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/canva-linux/ARCHITECTURE.md": [
    "dependent project",
    "c420ui",
    "Electron runtime",
    "CANVA_DEBUG",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/canva-linux/CLI.md": [
    "dependent project",
    "c420ui",
    "canva-linux.sh",
    "direct CLI",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/canva-linux/CONFIG.md": [
    "actions.json",
    "dependencies.json",
    "artifacts.json",
    "development.json",
    "project-ui.json",
    "dependent project",
    "c420ui",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/canva-linux/PACKAGING.md": [
    "dependent project",
    "c420ui",
    "scripts/build-appimage.sh",
    "scripts/build-flatpak-bundle.sh",
    "scripts/package-guidance-common.sh",
    "artifact names",
    "x64",
    "DEB",
    "RPM",
    "AUR",
  ],
  "docs/canva-linux/APPIMAGE.md": [
    "dependent project",
    "c420ui",
    "scripts/build-appimage.sh",
    "outputPattern",
    "artifact names",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/canva-linux/FLATPAK.md": [
    "dependent project",
    "c420ui",
    "scripts/build-flatpak-bundle.sh",
    "AppStream",
    "artifact names",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/canva-linux/RELEASE.md": [
    "dependent project",
    "0.1.4-14",
    "N.N.N-X",
    "AppStream",
    "package-lock.json",
    "validate-project",
    "dist/",
    "Required checks",
  ],
  "docs/canva-linux/CREDENTIAL_STORAGE.md": [
    "dependent project",
    "c420ui",
    "basic_text",
    "persist:canva",
    "ephemeral",
    "Implementing files",
    "Boundary checks",
    "Forbidden regressions",
  ],
  "docs/internal/AI_GUARDRAILS.md": [
    "0.1.4-14",
    "N.N.N-X",
    "English",
    "i18n",
    "Canva Linux does not install dependencies directly",
    "Canva Linux does not validate generic artifact recipes",
    "adapter must not duplicate Action Engine policy",
  ],
  "docs/internal/C420UI_DEPENDENT_PROJECT_BOUNDARIES.md": [
    "0.1.4-14",
    "N.N.N-X",
    "preflight-common.sh",
    "repository-check-only",
    "planned, dry-run, root, or confirmation policy duplicated",
    "Canva Linux",
    "c420ui",
  ],
  "docs/internal/VALIDATION_POLICY.md": [
    "0.1.4-14",
    "N.N.N-X",
    "English",
    "i18n",
    "preflight-common.sh",
    "repository-check-only",
    "Canva Linux does not install dependencies directly",
    "Canva Linux does not validate generic artifact recipes",
  ],
  "docs/internal/PROJECT_TREE.md": [
    "docs/c420ui/",
    "docs/canva-linux/",
    "docs/internal/",
    "packages/c420ui/",
    "scripts/c420ui-adapter/",
    "config/canva-linux/",
    "preflight-common.sh",
    "0.1.4-14",
  ],
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const requiredReviewFragments = [
  "## Credential storage review checklist",
  "allows `basic_text` to use `persist:canva`",
  "removes ephemeral fallback for insecure credential storage",
  "removes the user warning for ephemeral sessions",
  "claims persistent login works without Secret Service",
  "logs cookies, tokens, passwords or credential material",
];

const requiredGuardrails = [
  "All maintained source code, code comments, UI strings, README, docs, changelog and AI maintenance instructions must be written in English.",
  "Do not add Portuguese comments, Portuguese docs, Portuguese UI strings, or mixed-language source text to the repository.",
  "User-facing translations may be introduced later through an explicit i18n architecture.",
  "Do not hardcode future translations directly in runtime code.",
  "Future i18n must use structured translation resources, typed keys and fallback language rules.",
  "Until an i18n system exists, English is the only maintained repository language.",
  "The interactive shell menu has been removed.",
  "The project exposes only c420ui and direct CLI actions.",
  "c420ui is the user-facing name of the terminal interface.",
  "The official tool name is `c420ui`, lowercase.",
  "Do not use `C420UI` as public product branding.",
  "PascalCase TypeScript aliases may exist only as maintained API aliases; user-facing text must say `c420ui`.",
  "The c420ui logo must remain the approved three-line lowercase logo unless the maintainer explicitly requests a redesign.",
  "Do not reintroduce Terminal Assistant as product name.",
  "Do not use TUI as product name.",
  "Legacy explicit c420ui routing flags are removed. The launcher opens c420ui when called without args; any argument is resolved as direct CLI.",
  "Legacy interface-routing environment variables are removed and must not be read for interface routing.",
  "Manual text selection mode must disable mouse capture globally, not only on the logs widget.",
  "F5 log copy must work regardless of text selection mode.",
  "Session log write failures must not fail silently.",
  "writeSession must not call appendLogText directly to avoid recursion.",
  "Sudo/root authentication failures must be shown in a centered c420ui popup.",
  "Never log passwords, sudo stdin, cookies, tokens, or credential material.",
  "Persistent login must require a secure Linux Secret Service backend.",
  "If Electron reports `basic_text`, Canva Linux must use ephemeral session mode.",
  "`basic_text` must never use the `persist:canva` partition.",
  "Ephemeral session mode must warn the user that login, cookies and credentials will not be saved.",
  "Do not claim credentials are securely stored when the selected backend is `basic_text`.",
  "Do not log passwords, cookies, tokens, session values or credential material.",
  "Help must document log copy, manual selection and terminal limitations.",
  "terminalTextSelectionMode must disable mouse capture globally, not only on the logs widget.",
  "F5 clipboard copy must keep working even when text selection mode is enabled.",
  "Release identity must use the npm-compatible package version everywhere; do not publish four-number dotted versions.",
  "Release asset architecture names must preserve upstream/tooling architecture names.",
  "Do not normalize `x86_64` or `X86_64` to `x64`.",
  "AppImage, Flatpak, tarball and checksum entries must use the actual generated architecture string.",
  "Release docs and workflows must not hardcode `x64` unless the tool actually emits `x64`.",
  "System-wide actions must use packages/c420ui/host/linux/sudo-helper.sh.",
  "Raw sudo calls are forbidden outside packages/c420ui/host/linux/sudo-helper.sh.",
  "User-scope actions must never call sudo.",
  "Overview status must use the c420ui detection engine and Canva Linux detection provider.",
  "c420ui and CLI must share the same TypeScript action contract.",
  "REVIEW.md must preserve the Review Checklist.",
  "c420ui Header and Project Header must remain separate fixed components.",
  "Side-by-side header layout is preferred on wide terminals.",
  "Stacked header layout is allowed only as a narrow-terminal fallback.",
  "Workspace must start below the tallest header row.",
  "c420ui Header must use only c420ui brand config.",
  "c420ui core must not hardcode project-specific metadata.",
  "Project metadata must come from config/adapters.",
  "Project Header must use only project config.",
  "Headers must not be part of FocusZone or Tab navigation.",
  "Do not manually move only the Overview panel; always use shared workspaceTop.",
  "TypeScript is mandatory for all maintained Node.js source code.",
  "JavaScript is generated output only.",
  "Shell remains shell for host operations.",
  "New scripts must be TypeScript unless they are shell scripts for host operations.",
  "New tests must be TypeScript.",
  "New configs should be TypeScript when tool-supported.",
  "Do not create new JavaScript source files.",
  "Do not add `scripts/*.js` as maintained source.",
  "Do not add `test/*.js`.",
  "Do not add JavaScript config files when TypeScript config is supported.",
  "JavaScript may exist only as project-generated output under `.build`, package-managed dependencies under `node_modules`, generated coverage output under `coverage`, or distributable output under `dist`.",
  "Project-generated JavaScript belongs in `.build` only; do not place maintained or project-generated script artifacts elsewhere.",
  "Shell scripts are allowed only for Linux host operations, launcher glue, Flatpak/native install, sudo, purge, XDG, and validation that must run before Node.",
  "JSON/YAML/XML/Desktop files remain native data formats and must be validated by TypeScript checks where appropriate.",
  "Flathub source generation must be TypeScript-backed.",
  "If a tool requires JavaScript, generate it from TypeScript or document the exception explicitly.",
];


function assertRequiredSplitDocs(rootDir: string, failures: string[]): void {
  for (const [relativePath, fragments] of Object.entries(requiredSplitDocFragments)) {
    const fullPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      failures.push(`missing split documentation file: ${relativePath}`);
      continue;
    }

    const contents = fs.readFileSync(fullPath, "utf8");
    const normalizedContents = normalizeWhitespace(contents);
    if (contents.length < 600) {
      failures.push(`${relativePath}: split documentation is too short`);
    }

    for (const fragment of fragments) {
      if (!normalizedContents.includes(normalizeWhitespace(fragment))) {
        failures.push(`${relativePath}: missing split documentation fragment: ${fragment}`);
      }
    }
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, file)))
      failures.push(`missing required file: ${file}`);
  }

  const readme = fs.existsSync(path.join(rootDir, "README.md"))
    ? fs.readFileSync(path.join(rootDir, "README.md"), "utf8")
    : "";
  for (const ref of readmeRefs) {
    if (!readme.includes(ref))
      failures.push(`README missing documentation reference: ${ref}`);
  }
  if (readme.includes("Shell Tool"))
    failures.push("README must not mention Shell Tool");

  const guardrails = fs.existsSync(path.join(rootDir, "docs/internal/AI_GUARDRAILS.md"))
    ? fs.readFileSync(path.join(rootDir, "docs/internal/AI_GUARDRAILS.md"), "utf8")
    : "";
  const normalizedGuardrails = normalizeWhitespace(guardrails);
  for (const fragment of requiredGuardrails) {
    if (!normalizedGuardrails.includes(normalizeWhitespace(fragment)))
      failures.push(`internal/AI_GUARDRAILS missing rule: ${fragment}`);
  }

  assertRequiredSplitDocs(rootDir, failures);

  const review = fs.existsSync(path.join(rootDir, "REVIEW.md"))
    ? fs.readFileSync(path.join(rootDir, "REVIEW.md"), "utf8")
    : "";
  if (!review.startsWith("# Review Checklist"))
    failures.push("REVIEW.md must preserve the Review Checklist at the top");
  const normalizedReview = normalizeWhitespace(review);
  for (const fragment of requiredReviewFragments) {
    if (!normalizedReview.includes(normalizeWhitespace(fragment)))
      failures.push(`REVIEW.md missing credential checklist item: ${fragment}`);
  }

  if (failures.length) throw new Error(failures.join("\n"));
  console.log("[ai-guardrails] OK");
  return 0;
}

if (
  require.main === module &&
  /check-ai-guardrails\.js$/.test(process.argv[1] || "")
) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(
      `[ai-guardrails] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
