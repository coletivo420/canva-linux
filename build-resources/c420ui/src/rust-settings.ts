import { runC420UIRustHost } from "./rust-host.js";

export type C420UIRustToolSettings = {
  generalLogsEnabled: boolean;
  terminalTextSelectionMode: boolean;
};

export type C420UIRustSettingsResponse = {
  ok: boolean;
  command: string;
  settings: C420UIRustToolSettings;
  path: string;
  diagnostics: Array<{ level: string; code: string; message: string }>;
};

export function getC420UIRustSettings(options: {
  rootDir: string;
  settingsPath?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustSettingsResponse> {
  return runC420UIRustHost<C420UIRustSettingsResponse>({
    rootDir: options.rootDir,
    command: "settings-get",
    input: { rootDir: options.rootDir, settingsPath: options.settingsPath },
    env: options.env,
  });
}

export function setC420UIRustSettings(options: {
  rootDir: string;
  settingsPath?: string;
  settings: C420UIRustToolSettings;
  env?: NodeJS.ProcessEnv;
}): Promise<C420UIRustSettingsResponse> {
  return runC420UIRustHost<C420UIRustSettingsResponse>({
    rootDir: options.rootDir,
    command: "settings-set",
    input: {
      rootDir: options.rootDir,
      settingsPath: options.settingsPath,
      settings: options.settings,
    },
    env: options.env,
  });
}
