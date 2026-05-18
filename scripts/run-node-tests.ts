import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, "..");
const testDirs = [
  path.join(rootDir, "test"),
  path.join(rootDir, "packages", "c420ui", "test"),
];
const compiledTestDir = path.join(rootDir, ".build", "test");
const compiledC420uiTestDir = path.join(rootDir, ".build", "packages", "c420ui", "test");
const nodeTestSuffix = ".test.ts";
const playwrightSpecSuffix = ".spec.ts";

type TestSelection = {
  nodeArgs: string[];
  selectedRelativeTests: Set<string> | null;
  playwrightSpecSelections: string[];
};

function normalizePathForNodeTest(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function normalizeTestSelector(argument: string): string | null {
  if (argument.startsWith("-")) return null;

  const normalized = normalizePathForNodeTest(argument);
  const withoutBuildPrefix = normalized.startsWith(".build/test/")
    ? normalized.slice(".build/test/".length)
    : normalized;

  if (
    !withoutBuildPrefix.endsWith(nodeTestSuffix) &&
    !withoutBuildPrefix.endsWith(playwrightSpecSuffix)
  )
    return null;

  return withoutBuildPrefix;
}

function expandDirectorySelectors(args: string[]): string[] {
  return args.flatMap((arg) => {
    if (arg.startsWith("-")) return [arg];
    const absolutePath = path.resolve(rootDir, arg);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) return [arg];
    return collectTypeScriptTestFiles(absolutePath, (entryName) =>
      entryName.endsWith(nodeTestSuffix),
    ).map((file) => normalizePathForNodeTest(path.relative(rootDir, file)));
  });
}

function splitNodeArgsAndTestSelectors(args: string[]): TestSelection {
  const selectedRelativeTests = new Set<string>();
  const playwrightSpecSelections: string[] = [];
  const nodeArgs: string[] = [];

  for (const arg of args) {
    const testSelector = normalizeTestSelector(arg);
    if (testSelector?.endsWith(nodeTestSuffix)) {
      selectedRelativeTests.add(testSelector);
    } else if (testSelector?.endsWith(playwrightSpecSuffix)) {
      playwrightSpecSelections.push(testSelector);
    } else {
      nodeArgs.push(arg);
    }
  }

  return {
    nodeArgs,
    playwrightSpecSelections,
    selectedRelativeTests:
      selectedRelativeTests.size > 0 ? selectedRelativeTests : null,
  };
}

function collectTypeScriptTestFiles(
  directory: string,
  predicate: (entryName: string) => boolean,
): string[] {
  const discovered: string[] = [];

  function walk(currentDirectory: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return;
      throw error;
    }

    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((entry) => {
        const absolutePath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          walk(absolutePath);
          return;
        }

        if (entry.isFile() && predicate(entry.name)) {
          discovered.push(absolutePath);
        }
      });
  }

  walk(directory);
  return discovered.sort((left, right) => left.localeCompare(right));
}

export function main(): void {
  const isNodeTest = (entryName: string): boolean =>
    entryName.endsWith(nodeTestSuffix);
  const isPlaywrightSpec = (entryName: string): boolean =>
    entryName.endsWith(playwrightSpecSuffix);
  const isTypeScriptSupportFile = (entryName: string): boolean => {
    return (
      entryName.endsWith(".ts") &&
      !isNodeTest(entryName) &&
      !isPlaywrightSpec(entryName)
    );
  };

  const testFiles = testDirs.flatMap((directory) =>
    collectTypeScriptTestFiles(directory, isNodeTest),
  );
  const supportFiles = testDirs.flatMap((directory) =>
    collectTypeScriptTestFiles(directory, isTypeScriptSupportFile),
  );

  if (testFiles.length === 0) {
    console.error(
      "[error] No Node test files were found. Expected at least one *.test.ts file under test/ or packages/c420ui/test/.",
    );
    process.exit(1);
  }

  const relativeTestFiles = testFiles.map((file) =>
    normalizePathForNodeTest(path.relative(rootDir, file)),
  );
  const { nodeArgs, playwrightSpecSelections, selectedRelativeTests } =
    splitNodeArgsAndTestSelectors(expandDirectorySelectors(process.argv.slice(2)));

  if (playwrightSpecSelections.length) {
    console.error(
      `[error] Playwright spec file(s) are not Node tests: ${playwrightSpecSelections.join(", ")}. Run them with npm run test:smoke instead.`,
    );
    process.exit(1);
  }

  if (selectedRelativeTests) {
    const missingSelections = [...selectedRelativeTests].filter(
      (file) => !relativeTestFiles.includes(file),
    );
    if (missingSelections.length) {
      console.error(
        `[error] Selected test file(s) were not found: ${missingSelections.join(", ")}`,
      );
      process.exit(1);
    }
  }

  const selectedTestFiles = selectedRelativeTests
    ? relativeTestFiles.filter((file) => selectedRelativeTests.has(file))
    : relativeTestFiles;
  const selectedTestInputFiles = selectedTestFiles.map((file) =>
    path.join(rootDir, file),
  );
  const compileInputSet = new Set(
    selectedRelativeTests
      ? [...selectedTestInputFiles, ...supportFiles]
      : [...testFiles, ...supportFiles],
  );
  const relativeCompileInputs = [...compileInputSet]
    .sort((left, right) => left.localeCompare(right))
    .map((file) => normalizePathForNodeTest(path.relative(rootDir, file)));
  const compiledTestFiles = selectedTestFiles.map((file) =>
    path.join(".build", file.replace(/\.ts$/, ".js")),
  );
  console.error(
    `[info] Compiling ${relativeCompileInputs.length} TypeScript test file(s) into .build.`,
  );

  fs.rmSync(compiledTestDir, { recursive: true, force: true });
  fs.rmSync(compiledC420uiTestDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(rootDir, ".build"), { recursive: true });

  const result = spawnSync(
    "npx",
    [
      "esbuild",
      ...relativeCompileInputs,
      "--platform=node",
      "--target=node20",
      "--format=cjs",
      "--outbase=.",
      "--outdir=.build",
      "--sourcemap=inline",
      "--log-level=warning",
    ],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
      env: { ...process.env, CANVA_TEST_REPO_ROOT: rootDir },
    },
  );

  if (result.error || result.status !== 0) {
    console.error(
      `[error] Failed to compile TypeScript tests${result.error ? `: ${result.error.message}` : ""}`,
    );
    process.exit(result.status || 1);
  }

  const c420uiSourceDirs = [
    path.join(rootDir, "packages", "c420ui", "src"),
    path.join(rootDir, "packages", "c420ui", "checks"),
  ];
  const c420uiSourceFiles = c420uiSourceDirs.flatMap((sourceDir) =>
    collectTypeScriptTestFiles(sourceDir, (entryName) => entryName.endsWith(".ts")),
  );

  if (c420uiSourceFiles.length) {
    const relativeC420uiSources = c420uiSourceFiles.map((file) =>
      normalizePathForNodeTest(path.relative(rootDir, file)),
    );
    const c420uiCompileResult = spawnSync(
      "npx",
      [
        "esbuild",
        ...relativeC420uiSources,
        "--platform=node",
        "--target=node20",
        "--format=cjs",
        "--outbase=packages",
        "--outdir=.build/packages",
        "--sourcemap=inline",
        "--log-level=warning",
      ],
      {
        cwd: rootDir,
        stdio: "inherit",
        shell: false,
        env: { ...process.env, CANVA_TEST_REPO_ROOT: rootDir },
      },
    );

    if (c420uiCompileResult.error || c420uiCompileResult.status !== 0) {
      console.error(
        `[error] Failed to compile c420ui package sources${c420uiCompileResult.error ? `: ${c420uiCompileResult.error.message}` : ""}`,
      );
      process.exit(c420uiCompileResult.status || 1);
    }
  }

  const runtimeSourceDirs = [
    path.join(rootDir, "scripts", "core"),
    path.join(rootDir, "scripts", "checks", "canva-linux"),
    path.join(rootDir, "scripts", "canva-linux"),
    path.join(rootDir, "scripts", "c420ui"),
    path.join(rootDir, "scripts", "c420ui-adapter"),
  ];
  const runtimeSourceFiles = runtimeSourceDirs.flatMap((sourceDir) =>
    collectTypeScriptTestFiles(sourceDir, (entryName) => entryName.endsWith(".ts")),
  );

  if (runtimeSourceFiles.length) {
    const relativeRuntimeSources = runtimeSourceFiles.map((file) =>
      normalizePathForNodeTest(path.relative(rootDir, file)),
    );
    const runtimeCompileResult = spawnSync(
      "npx",
      [
        "esbuild",
        ...relativeRuntimeSources,
        "--platform=node",
        "--target=node20",
        "--format=cjs",
        "--outbase=scripts",
        "--outdir=.build/scripts",
        "--sourcemap=inline",
        "--log-level=warning",
      ],
      {
        cwd: rootDir,
        stdio: "inherit",
        shell: false,
        env: { ...process.env, CANVA_TEST_REPO_ROOT: rootDir },
      },
    );

    if (runtimeCompileResult.error || runtimeCompileResult.status !== 0) {
      console.error(
        `[error] Failed to compile runtime test dependencies${runtimeCompileResult.error ? `: ${runtimeCompileResult.error.message}` : ""}`,
      );
      process.exit(runtimeCompileResult.status || 1);
    }
  }

  console.error(
    `[info] Running ${compiledTestFiles.length} compiled Node test file(s).`,
  );

  const testResult = spawnSync(
    process.execPath,
    ["--enable-source-maps", "--test", ...nodeArgs, ...compiledTestFiles],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
      env: { ...process.env, CANVA_TEST_REPO_ROOT: rootDir },
    },
  );

  if (testResult.error) {
    console.error(
      `[error] Failed to start node --test: ${testResult.error.message}`,
    );
    process.exit(1);
  }

  if (typeof testResult.status === "number") {
    process.exit(testResult.status);
  }

  if (testResult.signal) {
    console.error(
      `[error] node --test was terminated by ${testResult.signal}.`,
    );
  }
  process.exit(1);
}

if (require.main === module) main();
