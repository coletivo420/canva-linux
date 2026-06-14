import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule, withElectronMock } from "./helpers/runtime-module.js";

test("loadElectronPreloadApi accepts Electron APIs from default namespace", async () => {
  const contextBridge = { exposeInMainWorld() {} };
  const ipcRenderer = { send() {}, on() {}, removeListener() {} };

  const preloadApi = await withElectronMock(
    { contextBridge, ipcRenderer },
    async () => {
      const module = await loadRuntimeModule<{
        loadElectronPreloadApi: () => Promise<{
          contextBridge: unknown;
          ipcRenderer: unknown;
        }>;
      }>("preload/electron-preload-api");
      return module.loadElectronPreloadApi();
    },
  );

  assert.equal(preloadApi.contextBridge, contextBridge);
  assert.equal(preloadApi.ipcRenderer, ipcRenderer);
});
