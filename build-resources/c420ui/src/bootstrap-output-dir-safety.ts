import os from "node:os";
import path from "node:path";

export function assertSafeBootstrapOutputDir(
  rootDir: string,
  bootstrapDir: string,
): void {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedOut = path.resolve(bootstrapDir);
  const tmpRoot = path.resolve(os.tmpdir());

  const forbidden = new Set([
    resolvedRoot,
    path.dirname(resolvedRoot),
    path.parse(resolvedOut).root,
    process.cwd(),
  ]);

  if (forbidden.has(resolvedOut)) {
    throw new Error(
      `Refusing to clean unsafe c420ui bootstrap output directory: ${resolvedOut}`,
    );
  }

  const relative = path.relative(resolvedRoot, resolvedOut);
  const insideRepo =
    relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  const insideTemp =
    resolvedOut === tmpRoot || resolvedOut.startsWith(`${tmpRoot}${path.sep}`);

  if (!insideRepo && !insideTemp) {
    throw new Error(
      `Refusing to clean c420ui bootstrap output outside repository/temp: ${resolvedOut}`,
    );
  }

  const relativeOut = normalize(path.relative(resolvedRoot, resolvedOut));
  const isPackageGeneratedOut = relativeOut === "build-resources/c420ui/bootstrap/generated";
  const hasDedicatedC420UIName =
    path.basename(resolvedOut) === "c420ui" ||
    path.basename(resolvedOut).startsWith("c420ui-");

  if (!isPackageGeneratedOut && !hasDedicatedC420UIName) {
    throw new Error(
      `c420ui bootstrap output must be a dedicated c420ui directory: ${resolvedOut}`,
    );
  }
}

function normalize(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}
