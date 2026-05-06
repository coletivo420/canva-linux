// @ts-nocheck
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const { registerAppLifecycle } = loadRuntimeModule('main/lifecycle');

function createLifecycleOptions({ lockResult = true } = {}) {
  const listeners = new Map();
  const calls = [];
  const app = {
    requestSingleInstanceLock() {
      calls.push('requestSingleInstanceLock');
      return lockResult;
    },
    whenReady() {
      calls.push('whenReady');
      return new Promise(() => {});
    },
    on(event, listener) {
      calls.push(`on:${event}`);
      listeners.set(event, listener);
    },
    quit() {
      calls.push('quit');
    },
  };

  return {
    calls,
    listeners,
    options: {
      app,
      BrowserWindow: {
        getAllWindows() {
          return [];
        },
      },
      canvaSessionRef() {
        return null;
      },
      centralLogger: {
        initLogFile() {
          return '/tmp/current.log';
        },
        logStatus() {},
      },
      configureSession: async () => ({}),
      createShellWindow() {},
      createToolbarView() {},
      debugLog(category, ...args) {
        calls.push(`debug:${category}:${args.join(':')}`);
        return true;
      },
      debugLevel: 0,
      flushSession: async () => {},
      focusMainWindow() {
        calls.push('focusMainWindow');
      },
      getCanvaSession() {
        return {};
      },
      logCredentialStorageBackend() {},
      logReleaseStatus() {},
      nativeTheme: {
        on(event, listener) {
          listeners.set(`nativeTheme:${event}`, listener);
        },
      },
      onThemeUpdated() {},
      partition: 'persist:canva',
      path: {},
      shouldGrantRemotePermission() {
        return false;
      },
      tabController: {
        createHomeTab() {},
      },
    },
  };
}

test('registerAppLifecycle quits immediately when single instance lock is unavailable', () => {
  const { calls, listeners, options } = createLifecycleOptions({ lockResult: false });

  registerAppLifecycle(options);

  assert.deepEqual(calls, [
    'requestSingleInstanceLock',
    'debug:app:single-instance-lock-denied',
    'quit',
  ]);
  assert.equal(listeners.has('second-instance'), false);
  assert.equal(listeners.has('window-all-closed'), false);
});

test('registerAppLifecycle focuses the existing main window on second-instance', () => {
  const { calls, listeners, options } = createLifecycleOptions({ lockResult: true });

  registerAppLifecycle(options);
  listeners.get('second-instance')();

  assert.equal(calls.includes('requestSingleInstanceLock'), true);
  assert.equal(calls.includes('whenReady'), true);
  assert.equal(listeners.has('window-all-closed'), true);
  assert.deepEqual(calls.slice(-2), [
    'debug:app:second-instance',
    'focusMainWindow',
  ]);
});
