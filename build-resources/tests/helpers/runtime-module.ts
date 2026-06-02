import esbuild from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

type RuntimeModule = Record<string, unknown>;
type ElectronTestMock = Record<string, unknown>;

declare global {
  var __CANVA_TEST_ELECTRON_MOCK__: ElectronTestMock | undefined;
}

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(import.meta.dirname, "..", "..");
let moduleCounter = 0;

function sanitizeModulePath(modulePath: string): string {
  return modulePath.replace(/[\\/]/g, "-").replace(/[^a-zA-Z0-9_.-]/g, "-");
}

function electronMockPlugin(): esbuild.Plugin {
  return {
    name: "canva-electron-test-mock",
    setup(build) {
      build.onResolve({ filter: /^electron$/ }, () => ({
        namespace: "canva-electron-test-mock",
        path: "electron",
      }));
      build.onLoad(
        { filter: /^electron$/, namespace: "canva-electron-test-mock" },
        () => ({
          contents: `
const electronMock = globalThis.__CANVA_TEST_ELECTRON_MOCK__ ?? {};
export const app = electronMock.app;
export const BrowserWindow = electronMock.BrowserWindow;
export const BrowserWindowConstructorOptions = electronMock.BrowserWindowConstructorOptions;
export const BrowserWindowType = electronMock.BrowserWindowType;
export const dialog = electronMock.dialog;
export const ipcMain = electronMock.ipcMain;
export const ipcRenderer = electronMock.ipcRenderer;
export const nativeTheme = electronMock.nativeTheme;
export const safeStorage = electronMock.safeStorage;
export const session = electronMock.session;
export const shell = electronMock.shell;
export const WebContents = electronMock.WebContents;
export const WebContentsView = electronMock.WebContentsView;
export default electronMock;
`,
          loader: "js",
        }),
      );
    },
  };
}

export async function loadRuntimeModule<TModule extends RuntimeModule = RuntimeModule>(
  modulePath: string,
): Promise<TModule> {
  const sourceTs = path.join(
    repoRoot,
    "build-resources",
    "electron",
    `${modulePath}.ts`,
  );

  if (!fs.existsSync(sourceTs)) {
    throw new Error(`Runtime module not found: ${modulePath}`);
  }

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "canva-runtime-esm-"));
  const outputFile = path.join(
    outputDir,
    `${sanitizeModulePath(modulePath)}-${moduleCounter++}.mjs`,
  );

  await esbuild.build({
    absWorkingDir: repoRoot,
    bundle: true,
    entryPoints: [sourceTs],
    format: "esm",
    outfile: outputFile,
    platform: "node",
    plugins: [electronMockPlugin()],
    target: "node22",
  });

  const moduleInstance = await import(pathToFileURL(outputFile).href);
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
  } catch {
    // Ignore temporary test bundle cleanup errors.
  }
  return moduleInstance as TModule;
}

export async function withElectronMock<T>(
  mock: ElectronTestMock,
  callback: () => Promise<T>,
): Promise<T> {
  const previousMock = globalThis.__CANVA_TEST_ELECTRON_MOCK__;
  globalThis.__CANVA_TEST_ELECTRON_MOCK__ = mock;
  try {
    return await callback();
  } finally {
    globalThis.__CANVA_TEST_ELECTRON_MOCK__ = previousMock;
  }
}
