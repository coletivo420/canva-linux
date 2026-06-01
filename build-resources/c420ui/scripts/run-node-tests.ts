import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
const testDir = path.join(rootDir, "build-resources", "tests");
const c420uiTestDir = path.join(rootDir, "build-resources", "c420ui", "test");
const compiledTestDir = path.join(rootDir, ".build", "build-resources", "tests");
const nodeTestSuffix = ".test.ts";
const playwrightSpecSuffix = ".spec.ts";
const rootTestDirectorySelector = "__root_test_directory__";
const c420uiTestDirectorySelector = "__c420ui_test_directory__";

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
  const normalizedDirectory = normalized.replace(/\/$/, "");
  if (normalizedDirectory === "build-resources/tests") return rootTestDirectorySelector;
  if (normalizedDirectory === "build-resources/c420ui/test") {
    return c420uiTestDirectorySelector;
  }

  const withoutBuildPrefix = normalized.startsWith(".build/build-resources/tests/")
    ? normalized.slice(".build/build-resources/tests/".length)
    : normalized;
  const withoutTestPrefix = withoutBuildPrefix.startsWith("build-resources/tests/")
    ? withoutBuildPrefix.slice("build-resources/tests/".length)
    : withoutBuildPrefix.startsWith("build-resources/c420ui/test/")
      ? withoutBuildPrefix.slice("build-resources/c420ui/test/".length)
      : withoutBuildPrefix;

  if (
    !withoutTestPrefix.endsWith(nodeTestSuffix) &&
    !withoutTestPrefix.endsWith(playwrightSpecSuffix)
  )
    return null;

  const absolutePath = path.join(
    normalized.startsWith("build-resources/c420ui/test/") ? c420uiTestDir : testDir,
    withoutTestPrefix,
  );
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
    return null;
  }

  return withoutTestPrefix;
}

function splitNodeArgsAndTestSelectors(args: string[]): TestSelection {
  const selectedRelativeTests = new Set<string>();
  const playwrightSpecSelections: string[] = [];
  const nodeArgs: string[] = [];

  for (const arg of args) {
    const testSelector = normalizeTestSelector(arg);
    if (
      testSelector === rootTestDirectorySelector ||
      testSelector === c420uiTestDirectorySelector ||
      testSelector?.endsWith(nodeTestSuffix)
    ) {
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

  const testFiles = [
    ...collectTypeScriptTestFiles(testDir, isNodeTest),
    ...collectTypeScriptTestFiles(c420uiTestDir, isNodeTest),
  ];
  const supportFiles = [
    ...collectTypeScriptTestFiles(testDir, isTypeScriptSupportFile),
    ...collectTypeScriptTestFiles(c420uiTestDir, isTypeScriptSupportFile),
  ];
  const sourceSupportFiles = [
    ...collectTypeScriptTestFiles(
      path.join(rootDir, "build-resources", "canva-linux"),
      (entryName) => entryName.endsWith(".ts"),
    ),
    ...collectTypeScriptTestFiles(
      path.join(rootDir, "build-resources", "c420ui"),
      (entryName) =>
        entryName.endsWith(".ts") &&
        !isNodeTest(entryName) &&
        !isPlaywrightSpec(entryName),
    ),
  ];

  if (testFiles.length === 0) {
    console.error(
      "[error] No Node test files were found. Expected at least one *.test.ts file under build-resources/tests/ or build-resources/c420ui/test/.",
    );
    process.exit(1);
  }

  const relativeTestFiles = testFiles.map((file) => {
    if (file.startsWith(c420uiTestDir)) {
      return normalizePathForNodeTest(path.relative(c420uiTestDir, file));
    }
    return normalizePathForNodeTest(path.relative(testDir, file));
  });
  const { nodeArgs, playwrightSpecSelections, selectedRelativeTests } =
    splitNodeArgsAndTestSelectors(process.argv.slice(2));

  if (playwrightSpecSelections.length) {
    console.error(
      `[error] Playwright spec file(s) are not Node tests: ${playwrightSpecSelections.join(", ")}. Run them with npm run test:smoke instead.`,
    );
    process.exit(1);
  }

  if (selectedRelativeTests) {
    const missingSelections = [...selectedRelativeTests].filter(
      (file) =>
        file !== rootTestDirectorySelector &&
        file !== c420uiTestDirectorySelector &&
        !relativeTestFiles.includes(file),
    );
    if (missingSelections.length) {
      console.error(
        `[error] Selected test file(s) were not found: ${missingSelections.join(", ")}`,
      );
      process.exit(1);
    }
  }

  const selectedTestInputFiles = testFiles.filter((file) => {
    const rel = file.startsWith(c420uiTestDir)
      ? normalizePathForNodeTest(path.relative(c420uiTestDir, file))
      : normalizePathForNodeTest(path.relative(testDir, file));
    if (!selectedRelativeTests) return true;
    if (file.startsWith(c420uiTestDir)) {
      return (
        selectedRelativeTests.has(c420uiTestDirectorySelector) ||
        selectedRelativeTests.has(rel)
      );
    }
    return (
      selectedRelativeTests.has(rootTestDirectorySelector) ||
      selectedRelativeTests.has(rel)
    );
  });

  const compileInputSet = new Set(
    selectedRelativeTests
      ? [...selectedTestInputFiles, ...supportFiles, ...sourceSupportFiles]
      : [...testFiles, ...supportFiles, ...sourceSupportFiles],
  );
  const relativeCompileInputs = [...compileInputSet]
    .sort((left, right) => left.localeCompare(right))
    .map((file) => normalizePathForNodeTest(path.relative(rootDir, file)));

  const compiledTestFiles = selectedTestInputFiles.map((file) => {
    const rel = file.startsWith(c420uiTestDir)
      ? path.join("build-resources/c420ui/test", path.relative(c420uiTestDir, file))
      : path.join("build-resources/tests", path.relative(testDir, file));
    return path.join(".build", rel.replace(/\.ts$/, ".js"));
  });

  console.error(
    `[info] Compiling ${relativeCompileInputs.length} TypeScript test file(s) into .build/build-resources/tests.`,
  );

  fs.rmSync(compiledTestDir, { recursive: true, force: true });
  fs.mkdirSync(compiledTestDir, { recursive: true });
  fs.mkdirSync(path.join(rootDir, ".build", "build-resources", "c420ui", "test"), {
    recursive: true,
  });

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
    path.join(rootDir, "build-resources", "c420ui", "src"),
    path.join(rootDir, "build-resources", "c420ui", "bootstrap"),
    path.join(rootDir, "build-resources", "c420ui", "checks"),
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
        "--outbase=build-resources",
        "--outdir=.build/build-resources",
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

if (/run-node-tests\.(mjs|js|ts)$/.test(process.argv[1] || "")) main();
