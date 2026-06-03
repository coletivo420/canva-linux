import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// build-resources/c420ui/src/theme.json
var theme_default = {
  palette: {
    canvaLightBlue: "#07B9CE",
    canvaBlue: "#3969E7",
    canvaPurple: "#7D2AE7",
    success: "#00C853",
    warning: "#FFD166",
    error: "#FF4D4F",
    text: "#EAF7FF",
    muted: "#8FA3B8",
    background: "#10131A",
    surface: "#171B24",
    surfaceAlt: "#202635"
  },
  ansiFallback: {
    primary: "cyan",
    secondary: "blue",
    accent: "magenta",
    success: "green",
    warning: "yellow",
    error: "red"
  }
};

// build-resources/c420ui/src/terminal/theme.ts
var supportsTrueColor = process.env.COLORTERM === "truecolor" || process.env.COLORTERM === "24bit";
var colors = {
  lightBlue: supportsTrueColor ? theme_default.palette.canvaLightBlue : theme_default.ansiFallback.primary,
  blue: supportsTrueColor ? theme_default.palette.canvaBlue : theme_default.ansiFallback.secondary,
  purple: supportsTrueColor ? theme_default.palette.canvaPurple : theme_default.ansiFallback.accent,
  success: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  warning: supportsTrueColor ? theme_default.palette.warning : theme_default.ansiFallback.warning,
  error: supportsTrueColor ? theme_default.palette.error : theme_default.ansiFallback.error,
  text: supportsTrueColor ? theme_default.palette.text : "white",
  muted: supportsTrueColor ? theme_default.palette.muted : "gray",
  background: supportsTrueColor ? theme_default.palette.background : "black",
  surface: supportsTrueColor ? theme_default.palette.surface : "black",
  surfaceAlt: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  menuSelectedBg: supportsTrueColor ? theme_default.palette.canvaPurple : "magenta",
  menuSelectedFg: "white",
  menuInactiveSelectedBg: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  menuInactiveSelectedFg: supportsTrueColor ? theme_default.palette.canvaLightBlue : "cyan",
  footerBg: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  footerFg: "white",
  statusDetected: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  statusNotDetected: supportsTrueColor ? theme_default.palette.canvaPurple : theme_default.ansiFallback.accent,
  helpTitle: supportsTrueColor ? theme_default.palette.canvaBlue : theme_default.ansiFallback.secondary,
  helpSectionTitle: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  infoItemTitle: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  infoText: supportsTrueColor ? theme_default.palette.text : "white",
  descriptionText: supportsTrueColor ? theme_default.palette.text : "white",
  logo: supportsTrueColor ? theme_default.palette.canvaLightBlue : theme_default.ansiFallback.secondary,
  version: supportsTrueColor ? theme_default.palette.canvaLightBlue : theme_default.ansiFallback.secondary,
  phase: supportsTrueColor ? theme_default.palette.warning : theme_default.ansiFallback.warning,
  appImageLoading: supportsTrueColor ? theme_default.palette.warning : theme_default.ansiFallback.warning,
  activeBorder: supportsTrueColor ? theme_default.palette.canvaLightBlue : "cyan",
  inactiveBorder: supportsTrueColor ? theme_default.palette.canvaBlue : "blue",
  activeLabel: supportsTrueColor ? theme_default.palette.canvaLightBlue : "cyan",
  inactiveLabel: supportsTrueColor ? theme_default.palette.muted : "gray",
  activeBlockBg: supportsTrueColor ? theme_default.palette.surface : "black",
  activeCellBg: supportsTrueColor ? theme_default.palette.canvaBlue : "blue",
  activeCellFg: "white",
  activeCheckboxFg: supportsTrueColor ? theme_default.palette.success : theme_default.ansiFallback.success,
  activeCheckboxBg: supportsTrueColor ? theme_default.palette.surfaceAlt : "black",
  inactiveCheckboxFg: supportsTrueColor ? theme_default.palette.muted : "gray"
};
var c420uiTheme = {
  supportsTrueColor,
  colors,
  header: {
    fg: colors.lightBlue,
    bg: colors.background,
    bold: true
  },
  menu: {
    fg: colors.text,
    bg: colors.background,
    border: {
      fg: colors.blue
    },
    selected: {
      fg: colors.menuSelectedFg,
      bg: colors.menuSelectedBg,
      bold: true
    },
    item: {
      fg: colors.text
    }
  },
  content: {
    fg: colors.text,
    bg: colors.background,
    border: {
      fg: colors.purple
    },
    label: {
      fg: colors.lightBlue
    }
  },
  logs: {
    fg: colors.text,
    bg: colors.background,
    border: {
      fg: colors.blue
    },
    label: {
      fg: colors.lightBlue
    }
  },
  footer: {
    fg: colors.footerFg,
    bg: colors.footerBg,
    bold: true
  },
  modal: {
    normalBorder: colors.lightBlue,
    dangerousBorder: colors.error,
    text: colors.text,
    background: colors.background
  }
};

// build-resources/c420ui/src/terminal/blessed-widgets.ts
import blessed from "blessed";
var tui = {
  screen: blessed.screen,
  box: blessed.box,
  list: blessed.list,
  log: blessed.log,
  textbox: blessed.textbox
};

// build-resources/c420ui/src/terminal/modal.ts
function createModalShell(screen, title, dangerous = false) {
  const overlay = tui.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    style: {
      bg: c420uiTheme.colors.background,
      transparent: true
    }
  });
  const modal = tui.box({
    parent: overlay,
    top: "center",
    left: "center",
    width: "70%",
    height: 11,
    border: "line",
    tags: true,
    label: dangerous ? `{${c420uiTheme.colors.error}-fg}${title}{/${c420uiTheme.colors.error}-fg}` : `{${c420uiTheme.colors.lightBlue}-fg}${title}{/${c420uiTheme.colors.lightBlue}-fg}`,
    style: {
      fg: c420uiTheme.modal.text,
      bg: c420uiTheme.modal.background,
      border: {
        fg: dangerous ? c420uiTheme.modal.dangerousBorder : c420uiTheme.modal.normalBorder
      }
    }
  });
  return { overlay, modal };
}
function confirmDialog(screen, options) {
  return new Promise((resolve) => {
    const previousFocus = screen.focused;
    const { overlay, modal } = createModalShell(
      screen,
      options.title,
      options.dangerous
    );
    const message = tui.box({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 5,
      tags: true,
      content: options.message
    });
    const footer = tui.box({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: [
        `{${c420uiTheme.colors.lightBlue}-fg}[y/Enter]{/${c420uiTheme.colors.lightBlue}-fg} ${options.confirmLabel ?? "Confirm"}`,
        `    `,
        `{${c420uiTheme.colors.lightBlue}-fg}[Esc/n]{/${c420uiTheme.colors.lightBlue}-fg} ${options.cancelLabel ?? "Cancel"}`
      ].join("")
    });
    const close = (confirmed) => {
      message.destroy();
      footer.destroy();
      modal.destroy();
      overlay.destroy();
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      screen.render();
      resolve(confirmed);
    };
    overlay.key(["enter", "y"], () => {
      close(true);
    });
    overlay.key(["escape", "n"], () => {
      close(false);
    });
    overlay.on("click", () => {
      overlay.focus();
    });
    modal.on("click", () => {
      overlay.focus();
    });
    overlay.focus();
    screen.render();
  });
}
async function messageDialog(screen, title, message) {
  await confirmDialog(screen, {
    title,
    message,
    confirmLabel: "OK",
    cancelLabel: "Close"
  });
}
function inputDialog(screen, title, prompt, timeoutMs = 3e4) {
  return new Promise((resolve) => {
    const previousFocus = screen.focused;
    const { overlay, modal } = createModalShell(screen, title, false);
    const label = tui.box({
      parent: modal,
      top: 1,
      left: 2,
      right: 2,
      height: 2,
      content: prompt
    });
    const input = tui.textbox({
      parent: modal,
      top: 4,
      left: 2,
      right: 2,
      height: 3,
      border: "line",
      inputOnFocus: true,
      censor: true
    });
    const footer = tui.box({
      parent: modal,
      bottom: 1,
      left: 2,
      right: 2,
      height: 1,
      tags: true,
      content: [
        `{${c420uiTheme.colors.lightBlue}-fg}[Enter]{/${c420uiTheme.colors.lightBlue}-fg} Submit`,
        `  `,
        `{${c420uiTheme.colors.lightBlue}-fg}[Esc]{/${c420uiTheme.colors.lightBlue}-fg} Cancel`
      ].join("")
    });
    let timer = null;
    let closed = false;
    const close = (result) => {
      if (closed) {
        return;
      }
      closed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      label.destroy();
      input.destroy();
      footer.destroy();
      modal.destroy();
      overlay.destroy();
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      screen.render();
      resolve(result);
    };
    timer = setTimeout(() => {
      close({
        status: "timeout"
      });
    }, timeoutMs);
    overlay.key(["escape"], () => {
      close({
        status: "canceled"
      });
    });
    input.key(["enter"], () => {
      input.submit();
    });
    input.on("cancel", () => {
      setImmediate(() => {
        close({
          status: "canceled"
        });
      });
    });
    input.on("submit", (value) => {
      close({
        status: "submitted",
        value: String(value ?? "")
      });
    });
    overlay.focus();
    input.focus();
    input.readInput();
    screen.render();
  });
}

// build-resources/c420ui/src/terminal/detected-installations-summary.ts
var GENERATED_ARTIFACT_KINDS = /* @__PURE__ */ new Set([
  "appimage",
  "flatpak",
  "tarball",
  "sha256sums",
  "deb",
  "rpm",
  "aur"
]);
function detectedVersion(fullVersion, version) {
  if (typeof fullVersion === "string" && fullVersion.trim()) {
    return fullVersion;
  }
  return version;
}
function artifactVersion(fragment) {
  return fragment.fullVersion || fragment.version;
}
function formatDetectedStatus(colors2, detected, version) {
  if (!detected) {
    return `{${colors2.statusNotDetected}-fg}not detected{/${colors2.statusNotDetected}-fg}`;
  }
  const v = typeof version === "string" && version.trim() ? `v${version.trim().replace(/^v/, "")}` : "version unknown";
  return `{${colors2.statusDetected}-fg}detected{/${colors2.statusDetected}-fg}      ${v}`;
}
function formatArtifactLine(fragment, colors2) {
  return `  ${fragment.label}: ${formatDetectedStatus(colors2, fragment.detected, artifactVersion(fragment))}`;
}
function isGeneratedArtifactFragment(fragment) {
  if (fragment.kind === "linux-unpacked" || fragment.id === "linux-unpacked") return false;
  if (fragment.kind === "native" || fragment.id === "native-system" || fragment.id === "native-user") return false;
  return GENERATED_ARTIFACT_KINDS.has(fragment.kind) || GENERATED_ARTIFACT_KINDS.has(fragment.id);
}
function versionSummaryItem(label, version) {
  return `${label} ${version ? `v${version.trim().replace(/^v/, "")}` : "unknown"}`;
}
function formatDetectionPanelSummaries(s, colors2) {
  if (!s) {
    const loading = `{${colors2.appImageLoading}-fg}loading...{/${colors2.appImageLoading}-fg}`;
    return {
      detectedInstallations: [
        `  Native System: ${loading}`,
        `  Native User: ${loading}`,
        `  Flatpak System: ${loading}`,
        `  Flatpak User: ${loading}`
      ],
      generatedArtifacts: [`  AppImage: ${loading}`],
      linuxArtifacts: [`Electron/Node/npm loading...`]
    };
  }
  const i = s.installations;
  const linuxUnpacked = s.artifactFragments?.find(
    (fragment) => fragment.kind === "linux-unpacked" || fragment.id === "linux-unpacked"
  );
  const generatedArtifacts = s.artifactFragments ? s.artifactFragments.filter(isGeneratedArtifactFragment).map((fragment) => formatArtifactLine(fragment, colors2)) : [
    `  AppImage: ${formatDetectedStatus(
      colors2,
      Boolean(i.appImageArtifacts),
      detectedVersion(i.appImageFullVersion, i.appImageVersion)
    )}`
  ];
  return {
    detectedInstallations: [
      `  Native System: ${formatDetectedStatus(colors2, Boolean(i.nativeSystem), detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion))}`,
      `  Native User: ${formatDetectedStatus(colors2, Boolean(i.nativeUser), detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion))}`,
      `  Flatpak System: ${formatDetectedStatus(colors2, Boolean(i.flatpakSystem), detectedVersion(i.flatpakSystemFullVersion, i.flatpakSystemVersion))}`,
      `  Flatpak User: ${formatDetectedStatus(colors2, Boolean(i.flatpakUser), detectedVersion(i.flatpakUserFullVersion, i.flatpakUserVersion))}`
    ],
    generatedArtifacts,
    linuxArtifacts: [
      [
        versionSummaryItem("Electron", s.runtime?.electronVersion),
        versionSummaryItem("Node", s.runtime?.nodeVersion),
        versionSummaryItem("npm", s.runtime?.npmVersion),
        versionSummaryItem(
          "Linux unpacked",
          linuxUnpacked ? artifactVersion(linuxUnpacked) : void 0
        )
      ].join(", ")
    ]
  };
}

// build-resources/c420ui/src/terminal/clipboard.ts
import { spawnSync } from "node:child_process";
function has(command) {
  return spawnSync("bash", ["-c", `command -v ${command}`]).status === 0;
}
function runWithInput(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    encoding: "utf8"
  });
  return result.status === 0;
}
function copyTextToClipboard(text) {
  if (!text.trim()) {
    return {
      ok: false,
      message: "No logs to copy."
    };
  }
  if (process.env.WAYLAND_DISPLAY && has("wl-copy") && runWithInput("wl-copy", [], text)) {
    return {
      ok: true,
      message: "Logs copied to clipboard via wl-copy."
    };
  }
  if ((process.env.XDG_CURRENT_DESKTOP || "").toLowerCase().includes("kde")) {
    if (has("qdbus6") && runWithInput(
      "bash",
      [
        "-c",
        'input=$(cat); qdbus6 org.kde.klipper /klipper setClipboardContents "$input"'
      ],
      text
    )) {
      return {
        ok: true,
        message: "Logs copied to clipboard via KDE Klipper (qdbus6)."
      };
    }
    if (has("qdbus") && runWithInput(
      "bash",
      [
        "-c",
        'input=$(cat); qdbus org.kde.klipper /klipper setClipboardContents "$input"'
      ],
      text
    )) {
      return {
        ok: true,
        message: "Logs copied to clipboard via KDE Klipper (qdbus)."
      };
    }
  }
  if ((process.env.XDG_CURRENT_DESKTOP || "").toLowerCase().includes("gnome")) {
    if (has("gpaste-client") && runWithInput("gpaste-client", ["add"], text)) {
      return {
        ok: true,
        message: "Logs copied to clipboard via GPaste."
      };
    }
    if (has("gpaste") && runWithInput("gpaste", ["add"], text)) {
      return {
        ok: true,
        message: "Logs copied to clipboard via GPaste."
      };
    }
  }
  if (has("xclip") && runWithInput("xclip", ["-selection", "clipboard"], text)) {
    return {
      ok: true,
      message: "Logs copied to clipboard via xclip."
    };
  }
  if (has("xsel") && runWithInput("xsel", ["--clipboard", "--input"], text)) {
    return {
      ok: true,
      message: "Logs copied to clipboard via xsel."
    };
  }
  return {
    ok: false,
    message: "No clipboard tool found. Install wl-clipboard, KDE qdbus support, GPaste, xclip or xsel."
  };
}

// build-resources/c420ui/src/terminal/settings.ts
import fs from "node:fs";
import path from "node:path";
var DEFAULT_TOOL_SETTINGS = {
  tool: {
    generalLogsEnabled: true,
    terminalTextSelectionMode: false
  },
  runtime: {}
};
function configHome() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  if (xdgConfigHome) {
    return xdgConfigHome;
  }
  return path.join(process.env.HOME || ".", ".config");
}
function toolSettingsPath(stateDirectoryName) {
  return path.join(configHome(), stateDirectoryName, "tool-settings.json");
}
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function normalizeSettings(raw) {
  const rawRoot = isObject(raw) ? raw : {};
  const rawTool = isObject(rawRoot.tool) ? rawRoot.tool : {};
  const runtime = isObject(rawRoot.runtime) ? rawRoot.runtime : {};
  return {
    tool: {
      generalLogsEnabled: typeof rawTool.generalLogsEnabled === "boolean" ? rawTool.generalLogsEnabled : DEFAULT_TOOL_SETTINGS.tool.generalLogsEnabled,
      terminalTextSelectionMode: typeof rawTool.terminalTextSelectionMode === "boolean" ? rawTool.terminalTextSelectionMode : DEFAULT_TOOL_SETTINGS.tool.terminalTextSelectionMode
    },
    runtime
  };
}
function loadToolSettings(stateDirectoryName) {
  const settingsPath = toolSettingsPath(stateDirectoryName);
  if (!fs.existsSync(settingsPath)) {
    try {
      saveToolSettings(DEFAULT_TOOL_SETTINGS, stateDirectoryName);
    } catch {
    }
    return structuredClone(DEFAULT_TOOL_SETTINGS);
  }
  try {
    const rawContent = fs.readFileSync(settingsPath, "utf8");
    return normalizeSettings(JSON.parse(rawContent));
  } catch {
    return structuredClone(DEFAULT_TOOL_SETTINGS);
  }
}
function saveToolSettings(settings, stateDirectoryName) {
  const settingsPath = toolSettingsPath(stateDirectoryName);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    `${JSON.stringify(normalizeSettings(settings), null, 2)}
`,
    "utf8"
  );
}

// build-resources/c420ui/src/terminal/app.ts
import fs2 from "node:fs";
import path2 from "node:path";

// build-resources/c420ui/src/scopes.ts
var c420uiKnownActionScopes = ["user", "system", "auto"];
function normalizeC420UIActionScope(scope) {
  const normalized = scope?.trim();
  return normalized || void 0;
}
function isC420UIUserScope(scope) {
  return normalizeC420UIActionScope(scope) === "user";
}

// build-resources/c420ui/src/actions.ts
var c420uiActionKinds = ["command", "planned", "internal"];
function getC420UIActionCliFlags(action) {
  const legacyCli = action.cli ?? [];
  return [...action.cliFlags ?? [], ...legacyCli];
}
function isC420UIPlannedAction(action) {
  return action.kind === "planned" || action.planned === true;
}
function requiresC420UIActionConfirmation(action) {
  return action.dangerous === true || action.requiresConfirmation === true;
}
function assertC420UIActionContract(action) {
  if (!action.id.trim()) throw new Error("c420ui action id is required");
  if (!action.label.trim()) throw new Error(`${action.id}: label is required`);
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requireString(value, message) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}
function requireOptionalStringArray(value, message) {
  if (value === void 0) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(message);
  }
}
function requireOptionalBoolean(action, key) {
  if (action[key] !== void 0 && typeof action[key] !== "boolean") {
    throw new Error(`Action ${key} must be boolean: ${String(action.id)}`);
  }
}
function requireOptionalString(action, key) {
  if (action[key] !== void 0 && typeof action[key] !== "string") {
    throw new Error(`Action ${key} must be string: ${String(action.id)}`);
  }
}
function validateActionEnv(action) {
  if (action.env === void 0) return;
  if (!isRecord(action.env)) {
    throw new Error(`Action env must be an object: ${String(action.id)}`);
  }
  for (const [key, value] of Object.entries(action.env)) {
    if (!key.trim()) {
      throw new Error(`Action env contains an empty key: ${String(action.id)}`);
    }
    if (typeof value !== "string") {
      throw new Error(
        `Action env value must be string: ${String(action.id)} -> ${key}`
      );
    }
  }
}
function validateAllowedValue(value, allowed, message) {
  if (allowed && !allowed.includes(value)) throw new Error(message);
}
function validateC420UIActions(actions, options = {}) {
  if (!Array.isArray(actions)) throw new Error("actions registry must contain an array");
  const ids = /* @__PURE__ */ new Set();
  const cliAliases = /* @__PURE__ */ new Set();
  for (const item of actions) {
    if (!isRecord(item)) throw new Error("Action entries must be objects");
    requireString(item.id, "Action missing id");
    if (!/^[a-z0-9-]+$/.test(item.id)) {
      throw new Error(`Invalid action id format: ${item.id}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate action id: ${item.id}`);
    ids.add(item.id);
    requireString(item.label, `Action missing label: ${item.id}`);
    requireString(item.group, `Action missing group: ${item.id}`);
    requireString(item.section, `Action missing section: ${item.id}`);
    requireString(item.kind, `Action missing kind: ${item.id}`);
    validateAllowedValue(
      item.group,
      options.allowedGroups,
      `Invalid action group: ${item.id} -> ${item.group}`
    );
    validateAllowedValue(
      item.section,
      options.allowedSections,
      `Invalid action section: ${item.id} -> ${item.section}`
    );
    validateAllowedValue(
      item.kind,
      options.allowedKinds ?? c420uiActionKinds,
      `Unsupported action kind: ${item.id} -> ${item.kind}`
    );
    requireOptionalStringArray(item.args, `Action args must be an array: ${item.id}`);
    requireOptionalStringArray(
      item.cli,
      `Action cli aliases must be an array: ${item.id}`
    );
    requireOptionalStringArray(
      item.cliFlags,
      `Action cliFlags aliases must be an array: ${item.id}`
    );
    if (item.scope !== void 0) {
      requireString(item.scope, `Action scope must be string: ${item.id}`);
      validateAllowedValue(
        item.scope,
        options.allowedScopes ?? c420uiKnownActionScopes,
        `Invalid action scope: ${item.id} -> ${item.scope}`
      );
    }
    for (const key of [
      "hidden",
      "longRunning",
      "dangerous",
      "planned",
      "requiresConfirmation",
      "requiresRoot"
    ]) {
      requireOptionalBoolean(item, key);
    }
    for (const key of [
      "command",
      "description",
      "confirmationTitle",
      "confirmationMessage",
      "confirmationPhrase",
      "warning",
      "artifactWorkflowId"
    ]) {
      requireOptionalString(item, key);
    }
    validateActionEnv(item);
    if (item.kind === "planned") {
      if (item.command || item.args) {
        throw new Error(`Planned action must not define command/args: ${item.id}`);
      }
    }
    if (item.kind === "command") {
      if (!item.command) throw new Error(`Command action missing command: ${item.id}`);
      if (!Array.isArray(item.args)) {
        throw new Error(`Command action args must be an array: ${item.id}`);
      }
    }
    for (const alias of [...item.cli ?? [], ...item.cliFlags ?? []]) {
      if (!alias.startsWith("--")) {
        throw new Error(`CLI alias must start with --: ${item.id} -> ${alias}`);
      }
      if (cliAliases.has(alias)) throw new Error(`Duplicate cli alias: ${alias}`);
      cliAliases.add(alias);
    }
    if (item.dangerous && item.requiresConfirmation !== true) {
      throw new Error(
        `Dangerous action must set requiresConfirmation=true: ${item.id}`
      );
    }
    if (item.dangerous && !(item.description || item.confirmationMessage)) {
      throw new Error(
        `Dangerous action missing description/confirmationMessage: ${item.id}`
      );
    }
  }
}
function validateC420UIActionRegistry(actions, options) {
  validateC420UIActions(actions, options);
}

// build-resources/c420ui/src/events.ts
function createC420UIEvent(event) {
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...event
  };
}

// build-resources/c420ui/src/exit-codes.ts
var c420uiExitCodes = {
  success: 0,
  generalError: 1,
  invalidUsage: 64,
  rootPolicyError: 64,
  plannedAction: 78,
  canceled: 130
};

// build-resources/c420ui/src/action-engine.ts
function createC420UIActionEngine(options) {
  const { bridge, rootDir: rootDir2, emit, rootProvider } = options;
  function listActions() {
    return bridge.actions();
  }
  function resolveActionById(actionId) {
    const action = listActions().find((candidate) => candidate.id === actionId);
    return action ? { found: true, action } : { found: false, reason: "not-found", query: actionId };
  }
  function resolveActionByCliFlag(flag) {
    const action = listActions().find(
      (candidate) => getC420UIActionCliFlags(candidate).includes(flag)
    );
    return action ? { found: true, action } : { found: false, reason: "not-found", query: flag };
  }
  async function runActionById(actionId, runOptions = {}) {
    const resolution = resolveActionById(actionId);
    if (!resolution.found) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`
      };
    }
    return runAction(resolution.action, runOptions);
  }
  async function runAction(action, runOptions = {}) {
    assertC420UIActionContract(action);
    const dryRun = runOptions.dryRun === true;
    const yes = runOptions.yes === true;
    if (dryRun) {
      emit?.(
        createC420UIEvent({
          type: "action:start",
          actionId: action.id,
          message: action.label,
          data: { dryRun }
        })
      );
      const result2 = {
        code: c420uiExitCodes.success,
        status: "success",
        message: "dry-run"
      };
      emit?.(
        createC420UIEvent({
          type: "action:finish",
          actionId: action.id,
          message: action.label,
          data: { exitCode: result2.code, status: result2.status }
        })
      );
      return result2;
    }
    if (isC420UIPlannedAction(action)) {
      emit?.(
        createC420UIEvent({
          type: "action:planned",
          actionId: action.id,
          message: action.description ?? action.label
        })
      );
      return {
        code: c420uiExitCodes.plannedAction,
        status: "planned",
        message: action.description
      };
    }
    if (requiresC420UIActionConfirmation(action) && !yes) {
      return {
        code: c420uiExitCodes.generalError,
        status: "failed",
        message: `[error] Action requires confirmation: ${action.label}
[info] Re-run with --yes after confirming intent.`
      };
    }
    const baseEnv = options.env ?? process.env;
    let actionEnv = rootProvider ? rootProvider.buildActionEnvironment(action, baseEnv) : baseEnv;
    if (rootProvider) {
      const scopeResult = rootProvider.validateActionScope(action, actionEnv);
      if (scopeResult.ok === false) {
        return {
          code: scopeResult.code,
          status: "failed",
          message: scopeResult.message
        };
      }
      const rootPolicy = rootProvider.resolveRootPolicy(
        action,
        rootDir2,
        actionEnv
      );
      if (rootPolicy.requiresRoot === false && rootPolicy.warning) {
        emit?.(
          createC420UIEvent({
            type: "log",
            source: "system",
            line: rootPolicy.warning
          })
        );
      }
      if (rootPolicy.requiresRoot) {
        if (options.requestRootAccess) {
          const requested = await options.requestRootAccess({
            action,
            rootDir: rootDir2,
            actionEnv,
            reason: rootPolicy.reason
          });
          if (requested.ok === false) {
            return {
              code: requested.code,
              status: requested.code === c420uiExitCodes.canceled ? "canceled" : "failed",
              message: requested.message
            };
          }
          actionEnv = requested.env ?? (rootProvider.buildRootActionEnvironment ? rootProvider.buildRootActionEnvironment(action, actionEnv) : actionEnv);
        } else {
          const access = rootProvider.validateRootAccess(rootDir2, actionEnv);
          if (access.ok === false) {
            return {
              code: access.code,
              status: "failed",
              message: access.message
            };
          }
          actionEnv = rootProvider.buildRootActionEnvironment ? rootProvider.buildRootActionEnvironment(action, actionEnv) : actionEnv;
        }
      }
    }
    emit?.(
      createC420UIEvent({
        type: "action:start",
        actionId: action.id,
        message: action.label,
        data: { dryRun }
      })
    );
    const context = {
      rootDir: rootDir2,
      dryRun,
      yes,
      env: actionEnv,
      signal: runOptions.signal,
      emitLog(event) {
        emit?.(createC420UIEvent({ type: "log", ...event }));
      },
      emitProgress(event) {
        emit?.(createC420UIEvent({ type: "progress", ...event }));
      }
    };
    const result = await bridge.runAction(action.id, context);
    emit?.(
      createC420UIEvent({
        type: "action:finish",
        actionId: action.id,
        message: action.label,
        data: { exitCode: result.code, status: result.status }
      })
    );
    return result;
  }
  return {
    listActions,
    resolveActionById,
    resolveActionByCliFlag,
    runActionById,
    runAction
  };
}

// build-resources/c420ui/src/terminal/interactive-action-runner.ts
function toProgressState(state) {
  if (state === "idle" || state === "running" || state === "success" || state === "warning" || state === "failed" || state === "canceled") {
    return state;
  }
  return "running";
}
function interactiveActionRequiresConfirmation(action) {
  return requiresC420UIActionConfirmation(action);
}
function createInteractiveActionRunner(options) {
  const state = {
    running: false,
    progressState: "idle"
  };
  let activeAbortController = null;
  function applyEvent(event) {
    if (event.type === "log") {
      options.appendLogText(`${event.line}
`, event.source);
      return;
    }
    if (event.type === "progress") {
      const nextState = toProgressState(event.state);
      state.progressState = nextState;
      options.setProgress(
        nextState,
        event.percent,
        event.label ?? nextState
      );
      return;
    }
    if (event.type === "action:start") {
      state.running = true;
      state.progressState = "running";
      options.setRunning(true);
      options.setProgress("running", 5, event.message || "Starting");
      return;
    }
    if (event.type === "action:planned") {
      state.progressState = "warning";
      options.appendLogText(
        `[planned] ${event.message}
`,
        "system"
      );
      options.setProgress("warning", 100, "Planned action");
      return;
    }
    if (event.type === "action:finish") {
      const status = event.data?.status;
      const exitCode = event.data?.exitCode;
      const success = status === "success" || exitCode === c420uiExitCodes.success;
      const canceled = status === "canceled";
      state.running = false;
      state.progressState = canceled ? "canceled" : success ? "success" : "failed";
      options.setRunning(false);
      options.setProgress(
        state.progressState,
        success ? 100 : 0,
        canceled ? "Canceled" : success ? "Completed" : `exit code ${String(exitCode ?? "unknown")}`
      );
    }
  }
  const makeEngine = options.createActionEngine ?? createC420UIActionEngine;
  const engine = makeEngine({
    bridge: options.bridge,
    rootDir: options.rootDir,
    env: options.env,
    rootProvider: options.rootProvider,
    requestRootAccess: options.requestRootAccess,
    emit: applyEvent
  });
  async function runAction(action, runOptions = {}) {
    const dryRun = runOptions.dryRun === true;
    const confirmed = runOptions.confirmed === true;
    if (!dryRun && interactiveActionRequiresConfirmation(action) && !confirmed) {
      const result = {
        code: c420uiExitCodes.generalError,
        status: "canceled",
        message: "Action canceled before execution."
      };
      state.running = false;
      state.progressState = "canceled";
      options.setRunning(false);
      options.setProgress("canceled", 0, "Canceled");
      options.appendLogText("[info] Action canceled before execution.\n", "system");
      state.lastResult = result;
      return result;
    }
    const abortController = new AbortController();
    activeAbortController = abortController;
    try {
      const result = await engine.runAction(action, {
        dryRun,
        yes: confirmed,
        signal: abortController.signal
      });
      state.lastResult = result;
      if (result.status === "failed" && result.message) {
        options.appendLogText(`${result.message}
`, "system");
        state.progressState = "failed";
        options.setRunning(false);
        options.setProgress("failed", 0, result.message);
      }
      return result;
    } finally {
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  }
  function cancel() {
    if (!activeAbortController || activeAbortController.signal.aborted) {
      return false;
    }
    activeAbortController.abort();
    options.appendLogText("[info] Cancellation requested.\n", "system");
    state.progressState = "canceled";
    options.setProgress("canceled", 0, "Canceled");
    return true;
  }
  return {
    cancel,
    runAction,
    state
  };
}

// build-resources/c420ui/src/host-dependencies.ts
var c420uiKnownHostDependencyPurposes = [
  "terminal",
  "cli",
  "development",
  "build",
  "package",
  "validation",
  "release"
];
var c420uiKnownNpmInstallStrategies = ["auto", "ci", "install"];
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertOptionalBoolean(value, key, failures, path19) {
  if (key in value && typeof value[key] !== "boolean") {
    failures.push(`${path19}.${key} must be a boolean`);
  }
}
function assertOptionalString(value, key, failures, path19) {
  if (key in value && typeof value[key] !== "string") {
    failures.push(`${path19}.${key} must be a string`);
  }
}
function assertOptionalStringArray(value, key, failures, path19) {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some((item) => typeof item !== "string")) {
    failures.push(`${path19}.${key} must be a string array`);
  }
}
function assertOptionalPurposeArray(value, key, failures, path19) {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some(
    (item) => typeof item !== "string" || !c420uiKnownHostDependencyPurposes.includes(item)
  )) {
    failures.push(`${path19}.${key} must contain only known host dependency purposes`);
  }
}
function validateConfigShape(value) {
  const failures = [];
  if (!isRecord2(value)) return ["host dependency config must be an object"];
  if ("node" in value) {
    if (!isRecord2(value.node)) {
      failures.push("node must be an object");
    } else {
      if ("minimumMajor" in value.node && typeof value.node.minimumMajor !== "number") {
        failures.push("node.minimumMajor must be a number");
      }
      assertOptionalBoolean(value.node, "required", failures, "node");
    }
  }
  if ("commands" in value) {
    if (!Array.isArray(value.commands)) {
      failures.push("commands must be an array");
    } else {
      value.commands.forEach((command, index) => {
        const commandPath = `commands[${index}]`;
        if (!isRecord2(command)) {
          failures.push(`${commandPath} must be an object`);
          return;
        }
        if (typeof command.id !== "string") failures.push(`${commandPath}.id must be a string`);
        if (typeof command.command !== "string") failures.push(`${commandPath}.command must be a string`);
        assertOptionalBoolean(command, "required", failures, commandPath);
        assertOptionalPurposeArray(command, "requiredFor", failures, commandPath);
        assertOptionalString(command, "installHint", failures, commandPath);
      });
    }
  }
  if ("npm" in value) {
    if (!isRecord2(value.npm)) {
      failures.push("npm must be an object");
    } else {
      if (value.npm.packageManager !== "npm") failures.push('npm.packageManager must be "npm"');
      assertOptionalString(value.npm, "lockfile", failures, "npm");
      if ("installStrategy" in value.npm && !c420uiKnownNpmInstallStrategies.includes(value.npm.installStrategy)) {
        failures.push('npm.installStrategy must be "auto", "ci", or "install"');
      }
      assertOptionalBoolean(value.npm, "includeDev", failures, "npm");
      assertOptionalStringArray(value.npm, "requiredDependencies", failures, "npm");
      assertOptionalStringArray(value.npm, "requiredDevDependencies", failures, "npm");
    }
  }
  return failures;
}
function assertC420UIHostDependencyConfig(value) {
  const failures = validateConfigShape(value);
  if (failures.length > 0) {
    throw new Error(`Invalid c420ui host dependency config: ${failures.join("; ")}.`);
  }
}
function validateC420UIHostDependencyConfig(value) {
  assertC420UIHostDependencyConfig(value);
  return value;
}
function isC420UIHostDependencyFailure(result) {
  return result.status === "missing" || result.status === "failed";
}

// build-resources/c420ui/src/startup-task.ts
function formatPlannedCommand(result) {
  const command = result.plannedCommand;
  if (!command) return null;
  return [command.command, ...command.args].join(" ");
}
async function runC420UIStartupTasks(tasks, log) {
  for (const task of tasks) {
    log(`[info] ${task.label}...
`);
    try {
      const result = await task.run();
      const plannedCommand = formatPlannedCommand(result);
      if (plannedCommand) {
        log(`[info] Planned dependency command: ${plannedCommand}
`);
      }
      if (isC420UIHostDependencyFailure(result)) {
        log("[error] Failed to prepare dependent project dependencies.\n");
        if (result.message) log(`[error] ${result.message}
`);
        continue;
      }
      log(`[info] ${result.message || "Dependent project dependencies are ready."}
`);
    } catch (error) {
      log("[error] Failed to prepare dependent project dependencies.\n");
      log(`[error] ${error instanceof Error ? error.message : String(error)}
`);
    }
  }
}

// build-resources/c420ui/src/terminal/app.ts
var MAX_LOG_HISTORY_LINES = 5e3;
var TOOL_LOG_PREFIX = "Tool |";
var ACTION_LOG_PREFIX = "Action |";
var FOCUS_ZONES = ["menu", "diagnostics", "content", "logs"];
var HEADER_GAP = 0;
var HEADER_BOX_HORIZONTAL_PADDING = 4;
var c420uiHeaderMinWidth = 28;
var PROJECT_HEADER_MIN_WIDTH = 40;
function isPlannedAction(action) {
  return action.kind === "planned" || Boolean(action.planned);
}
function longestLineLength(lines) {
  return Math.max(0, ...lines.map((line) => line.length));
}
function computeHeaderLayout(screenWidth, brandConfig, projectConfig) {
  const c420uiHeaderHeight = brandConfig.logoLines.length + 3;
  const projectHeaderHeight = 5;
  const c420uiHeaderContentWidth = longestLineLength([
    `${brandConfig.name} v${brandConfig.version}`,
    ...brandConfig.logoLines
  ]);
  const projectHeaderContentWidth = longestLineLength([
    projectConfig.projectName,
    projectConfig.projectSubtitle,
    `Version: ${projectConfig.displayVersion}${projectConfig.status ? ` ${projectConfig.status}` : ""} | Phase: ${projectConfig.phase ?? "unknown"}`
  ]);
  const c420uiMinWidth = Math.max(
    c420uiHeaderContentWidth + HEADER_BOX_HORIZONTAL_PADDING,
    c420uiHeaderMinWidth
  );
  const projectMinWidth = Math.max(
    projectHeaderContentWidth + HEADER_BOX_HORIZONTAL_PADDING,
    PROJECT_HEADER_MIN_WIDTH
  );
  const normalizedScreenWidth = Math.max(1, screenWidth);
  const canUseSideBySide = normalizedScreenWidth >= c420uiMinWidth + projectMinWidth;
  if (!canUseSideBySide) {
    return {
      c420uiHeader: {
        top: 0,
        left: 0,
        width: normalizedScreenWidth,
        height: c420uiHeaderHeight
      },
      projectHeader: {
        top: c420uiHeaderHeight,
        left: 0,
        width: normalizedScreenWidth,
        height: projectHeaderHeight
      },
      workspaceTop: c420uiHeaderHeight + projectHeaderHeight + HEADER_GAP,
      layoutMode: "stacked"
    };
  }
  const c420uiHeaderWidth = Math.min(c420uiMinWidth, normalizedScreenWidth);
  const projectHeaderWidth = normalizedScreenWidth - c420uiHeaderWidth;
  return {
    c420uiHeader: {
      top: 0,
      left: 0,
      width: c420uiHeaderWidth,
      height: c420uiHeaderHeight
    },
    projectHeader: {
      top: 0,
      left: c420uiHeaderWidth,
      width: projectHeaderWidth,
      height: projectHeaderHeight
    },
    workspaceTop: Math.max(c420uiHeaderHeight, projectHeaderHeight) + HEADER_GAP,
    layoutMode: "side-by-side"
  };
}
function createApp(options) {
  const opts = options.config;
  const { bridge, rootProvider } = options;
  let toolSettings = loadToolSettings(opts.project.stateDirectoryName);
  const settingsPath = toolSettingsPath(opts.project.stateDirectoryName);
  let terminalTextSelectionModeActive = toolSettings.tool.terminalTextSelectionMode;
  let tuiMouseEnabled = !terminalTextSelectionModeActive;
  function footerContent() {
    return [
      terminalTextSelectionModeActive ? "{bold}Text selection mode enabled{/bold}" : "",
      "{bold}Tab{/bold} Focus",
      "{bold}Enter{/bold} Select",
      "{bold}Space{/bold} Toggle",
      "{bold}F5{/bold} Copy Logs",
      "{bold}?{/bold} Help",
      "{bold}q{/bold} Quit"
    ].filter(Boolean).join(" | ");
  }
  const screen = tui.screen({
    smartCSR: true,
    title: opts.title,
    fullUnicode: true
  });
  let headerLayout = computeHeaderLayout(
    Number(screen.width) || process.stdout.columns || 80,
    opts.brand,
    opts.project
  );
  const c420uiHeader = tui.box({
    top: headerLayout.c420uiHeader.top,
    left: headerLayout.c420uiHeader.left,
    width: headerLayout.c420uiHeader.width,
    height: headerLayout.c420uiHeader.height,
    border: "line",
    tags: true,
    content: [
      `{bold}${opts.brand.name} v${opts.brand.version}{/bold}`,
      ...opts.brand.logoLines
    ].join("\n"),
    style: c420uiTheme.header
  });
  const projectHeader = tui.box({
    top: headerLayout.projectHeader.top,
    left: headerLayout.projectHeader.left,
    width: headerLayout.projectHeader.width,
    height: headerLayout.projectHeader.height,
    border: "line",
    tags: true,
    content: [
      `{bold}${opts.project.projectName}{/bold}`,
      opts.project.projectSubtitle,
      `Version: ${opts.project.displayVersion}${opts.project.status ? ` ${opts.project.status}` : ""} | Phase: ${opts.project.phase ?? "unknown"}`
    ].join("\n"),
    style: c420uiTheme.header
  });
  const menu = tui.list({
    top: headerLayout.workspaceTop,
    left: 0,
    width: "32%",
    height: 1,
    keys: true,
    mouse: tuiMouseEnabled,
    border: "line",
    tags: true,
    label: "Main Menu",
    style: c420uiTheme.menu
  });
  const diagnostics = tui.box({
    top: headerLayout.workspaceTop,
    left: 0,
    width: "32%",
    height: 1,
    border: "line",
    label: "Detected Installations",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: c420uiTheme.content
  });
  const generatedArtifacts = tui.box({
    top: headerLayout.workspaceTop,
    left: 0,
    width: "32%",
    height: 1,
    border: "line",
    label: "Generated Artifacts",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: c420uiTheme.content
  });
  const linuxArtifacts = tui.box({
    top: headerLayout.workspaceTop,
    left: 0,
    width: "32%",
    height: 1,
    border: "line",
    label: "Linux Artifacts",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: c420uiTheme.content
  });
  const content = tui.box({
    top: headerLayout.workspaceTop,
    left: "32%",
    width: "68%",
    height: 1,
    border: "line",
    label: "Overview",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    mouse: tuiMouseEnabled,
    style: c420uiTheme.content
  });
  const logs = tui.log({
    top: headerLayout.workspaceTop,
    left: "32%",
    width: "68%",
    height: 1,
    border: "line",
    label: "Logs",
    keys: true,
    mouse: tuiMouseEnabled,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: c420uiTheme.colors.surfaceAlt
      },
      style: {
        bg: c420uiTheme.colors.lightBlue
      }
    },
    scrollback: MAX_LOG_HISTORY_LINES,
    tags: true,
    style: c420uiTheme.logs
  });
  const footer = tui.box({
    bottom: 0,
    height: 1,
    width: "100%",
    tags: true,
    content: footerContent(),
    style: c420uiTheme.footer
  });
  const progress = tui.box({
    bottom: 1,
    height: 1,
    left: "32%",
    width: "68%",
    tags: true,
    content: "",
    style: {
      fg: "white",
      bg: "black"
    }
  });
  screen.append(c420uiHeader);
  screen.append(projectHeader);
  screen.append(menu);
  screen.append(diagnostics);
  screen.append(generatedArtifacts);
  screen.append(linuxArtifacts);
  screen.append(content);
  screen.append(logs);
  screen.append(progress);
  screen.append(footer);
  function applyHeaderBoxLayout(widget, boxLayout) {
    widget.top = boxLayout.top;
    widget.left = boxLayout.left;
    widget.width = boxLayout.width;
    widget.height = boxLayout.height;
  }
  function applyLayout() {
    const screenWidth = Math.max(
      1,
      Number(screen.width) || process.stdout.columns || 80
    );
    const screenHeight = Math.max(
      1,
      Number(screen.height) || process.stdout.rows || 24
    );
    headerLayout = computeHeaderLayout(screenWidth, opts.brand, opts.project);
    applyHeaderBoxLayout(c420uiHeader, headerLayout.c420uiHeader);
    applyHeaderBoxLayout(projectHeader, headerLayout.projectHeader);
    const workspaceTop = headerLayout.workspaceTop;
    const reservedFooterRows = 2;
    const workspaceHeight = Math.max(
      1,
      screenHeight - workspaceTop - reservedFooterRows
    );
    const leftColumnWidth = Math.min(
      Math.max(18, Math.floor(screenWidth * 0.32)),
      Math.max(1, screenWidth - 1)
    );
    const rightColumnLeft = leftColumnWidth;
    const rightColumnWidth = Math.max(1, screenWidth - rightColumnLeft);
    const menuHeight = Math.max(3, Math.floor(workspaceHeight * 0.68));
    const diagnosticsTop = workspaceTop + menuHeight;
    const detectionPanelsHeight = Math.max(
      9,
      screenHeight - diagnosticsTop - reservedFooterRows
    );
    const detectedInstallationsHeight = Math.max(3, Math.floor(detectionPanelsHeight * 0.34));
    const generatedArtifactsHeight = Math.max(3, Math.floor(detectionPanelsHeight * 0.43));
    const linuxArtifactsHeight = Math.max(
      3,
      detectionPanelsHeight - detectedInstallationsHeight - generatedArtifactsHeight
    );
    const generatedArtifactsTop = diagnosticsTop + detectedInstallationsHeight;
    const linuxArtifactsTop = generatedArtifactsTop + generatedArtifactsHeight;
    const contentHeight = Math.max(3, Math.floor(workspaceHeight * 0.36));
    const logsTop = workspaceTop + contentHeight;
    const logsHeight = Math.max(3, screenHeight - logsTop - reservedFooterRows);
    menu.top = workspaceTop;
    menu.left = 0;
    menu.width = leftColumnWidth;
    menu.height = menuHeight;
    diagnostics.top = diagnosticsTop;
    diagnostics.left = 0;
    diagnostics.width = leftColumnWidth;
    diagnostics.height = detectedInstallationsHeight;
    generatedArtifacts.top = generatedArtifactsTop;
    generatedArtifacts.left = 0;
    generatedArtifacts.width = leftColumnWidth;
    generatedArtifacts.height = generatedArtifactsHeight;
    linuxArtifacts.top = linuxArtifactsTop;
    linuxArtifacts.left = 0;
    linuxArtifacts.width = leftColumnWidth;
    linuxArtifacts.height = linuxArtifactsHeight;
    content.top = workspaceTop;
    content.left = rightColumnLeft;
    content.width = rightColumnWidth;
    content.height = contentHeight;
    logs.top = logsTop;
    logs.left = rightColumnLeft;
    logs.width = rightColumnWidth;
    logs.height = logsHeight;
    progress.left = rightColumnLeft;
    progress.width = rightColumnWidth;
    footer.width = screenWidth;
  }
  applyLayout();
  screen.on("resize", () => {
    applyLayout();
    screen.render();
  });
  function applyProgramMouseMode() {
    const program = screen.program;
    if (terminalTextSelectionModeActive) {
      program?.disableMouse?.();
      return;
    }
    program?.enableMouse?.();
  }
  function setWidgetMouseEnabled(widget, enabled) {
    widget.options = { ...widget.options ?? {}, mouse: enabled };
    widget.mouse = enabled;
  }
  function applyGlobalMouseMode() {
    terminalTextSelectionModeActive = toolSettings.tool.terminalTextSelectionMode;
    tuiMouseEnabled = !terminalTextSelectionModeActive;
    applyProgramMouseMode();
    for (const widget of [menu, diagnostics, generatedArtifacts, linuxArtifacts, content, logs]) {
      setWidgetMouseEnabled(widget, tuiMouseEnabled);
    }
    footer.setContent(footerContent());
  }
  applyGlobalMouseMode();
  const mainItems = [
    { label: "Install", view: "install" },
    { label: "Development", view: "development" },
    { label: "Maintenance & Uninstall", view: "maintenance" },
    { label: "Application Settings", view: "settings" },
    { label: "Help", view: "help" }
  ];
  const settingsItems = [
    {
      kind: "section",
      label: `${opts.project.projectName} Install and Development Tool`
    },
    {
      kind: "toggle",
      key: "generalLogsEnabled",
      label: `Enable general logs for ${opts.project.projectName} Install and Development Tool`
    },
    {
      kind: "toggle",
      key: "terminalTextSelectionMode",
      label: "Manual text selection mode"
    },
    {
      kind: "section",
      label: `${opts.project.projectName} final build`
    },
    {
      kind: "note",
      label: "Final build settings will be added in a later phase"
    }
  ];
  let currentView = "main";
  let focusZone = "menu";
  let menuLabelText = "Main Menu";
  const diagnosticsLabelText = "Detected Installations";
  const generatedArtifactsLabelText = "Generated Artifacts";
  const linuxArtifactsLabelText = "Linux Artifacts";
  let contentLabelText = "Overview";
  let logsLabelText = "Logs";
  let currentActions = [];
  let running = false;
  let modalActive = false;
  async function requestInteractiveRootAccess(request) {
    if (!rootProvider?.validateRootAccessWithInput) {
      return {
        ok: false,
        code: c420uiExitCodes.rootPolicyError,
        message: "[error] Interactive root authentication is unavailable."
      };
    }
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let result;
      modalActive = true;
      try {
        result = await inputDialog(
          screen,
          "Administrator authorization",
          [
            `${request.action.label}`,
            "",
            "Enter your sudo password to continue.",
            `Reason: ${request.reason}`
          ].join("\n"),
          3e4
        );
      } catch {
        return {
          ok: false,
          code: c420uiExitCodes.generalError,
          message: "[error] Administrator authorization prompt failed."
        };
      } finally {
        modalActive = false;
      }
      if (result.status === "canceled") {
        return {
          ok: false,
          code: c420uiExitCodes.canceled,
          message: "[info] Administrator authorization canceled."
        };
      }
      if (result.status === "timeout") {
        return {
          ok: false,
          code: c420uiExitCodes.canceled,
          message: "[error] Administrator authorization timed out."
        };
      }
      let validation;
      let submittedInput = result.value;
      try {
        validation = rootProvider.validateRootAccessWithInput(
          opts.rootDir,
          request.actionEnv,
          submittedInput
        );
      } catch {
        return {
          ok: false,
          code: c420uiExitCodes.rootPolicyError,
          message: "[error] Administrator authorization validation failed."
        };
      } finally {
        submittedInput = "";
      }
      if (validation.ok) {
        const env = rootProvider.buildRootActionEnvironment ? rootProvider.buildRootActionEnvironment(
          request.action,
          request.actionEnv
        ) : request.actionEnv;
        return { ok: true, env };
      }
      appendLogText(
        `[warn] Administrator authorization failed (${attempt}/${maxAttempts}).
`,
        "system"
      );
      if (attempt === maxAttempts) {
        return validation;
      }
    }
    return {
      ok: false,
      code: c420uiExitCodes.rootPolicyError,
      message: "[error] Administrator authorization failed."
    };
  }
  const actionRunner = createInteractiveActionRunner({
    bridge,
    rootDir: opts.rootDir,
    env: process.env,
    rootProvider,
    requestRootAccess: rootProvider ? requestInteractiveRootAccess : void 0,
    createActionEngine: createC420UIActionEngine,
    appendLogText(text, source) {
      appendLogText(
        text,
        source === "stdout" || source === "stderr" ? source : "system"
      );
    },
    setProgress(state, percent, label) {
      if (state === "running") {
        setProgressRunning(percent ?? 5, label);
      } else if (state === "success") {
        setProgressSuccess(label);
      } else if (state === "warning") {
        setProgressWarning(label);
      } else if (state === "canceled") {
        setProgressCanceled();
      } else if (state === "failed") {
        setProgressError(label);
      } else {
        clearProgress();
      }
    },
    setRunning(nextRunning) {
      running = nextRunning;
    }
  });
  let progressState = "idle";
  let lastCtrlCAt = 0;
  let updatingSettingsMenuItems = false;
  const logBuffers = {
    stdout: "",
    stderr: "",
    system: ""
  };
  const logHistory = [];
  const sessionLogPath = opts.sessionLogPath || path2.join(
    process.env.XDG_STATE_HOME || path2.join(process.env.HOME || ".", ".local/state"),
    opts.project.stateDirectoryName,
    "tool-session.log"
  );
  const launcherSessionId = opts.sessionId?.trim() || "";
  function readExistingSessionLog(logPath) {
    try {
      return fs2.existsSync(logPath) ? fs2.readFileSync(logPath, "utf8") : "";
    } catch {
      return "";
    }
  }
  let sessionStreamOpenError = null;
  let sessionLogUnavailableWarningShown = false;
  function warnSessionLogUnavailableOnce() {
    if (sessionLogUnavailableWarningShown) {
      return;
    }
    sessionLogUnavailableWarningShown = true;
    const reason = sessionStreamOpenError ? ` (${sessionStreamOpenError})` : "";
    const warning = `[warn] Session log stream is unavailable: ${sessionLogPath}${reason}`;
    displayLogLine(warning, "system");
    try {
      console.warn(warning);
    } catch {
    }
  }
  function recordSessionStreamError(error) {
    sessionStreamOpenError = error instanceof Error ? error.message : String(error);
    warnSessionLogUnavailableOnce();
  }
  function openSessionStream(logPath) {
    try {
      fs2.mkdirSync(path2.dirname(logPath), { recursive: true });
      const stream = fs2.createWriteStream(logPath, { flags: "a" });
      stream.on("error", (error) => {
        recordSessionStreamError(error);
      });
      return stream;
    } catch (error) {
      recordSessionStreamError(error);
      return null;
    }
  }
  const launcherSessionLog = readExistingSessionLog(sessionLogPath);
  const sessionStream = openSessionStream(sessionLogPath);
  const writeSession = (line) => {
    if (!sessionStream || sessionStreamOpenError) {
      warnSessionLogUnavailableOnce();
      return;
    }
    try {
      sessionStream.write(`${line}
`);
    } catch (error) {
      recordSessionStreamError(error);
    }
  };
  writeSession("[mode] c420ui");
  process.on("exit", () => {
    writeSession("[session] ended");
  });
  let overviewStatus = null;
  let overviewDetectionPromise = null;
  let overviewDetectionError = null;
  function renderDiagnosticsBox() {
    if (overviewDetectionError) {
      diagnostics.setContent(
        `  {${c420uiTheme.colors.error}-fg}Detection error{/${c420uiTheme.colors.error}-fg}
  ${overviewDetectionError}`
      );
      generatedArtifacts.setContent(`  {${c420uiTheme.colors.error}-fg}Detection error{/${c420uiTheme.colors.error}-fg}`);
      linuxArtifacts.setContent(`  {${c420uiTheme.colors.error}-fg}Detection error{/${c420uiTheme.colors.error}-fg}`);
      return;
    }
    const panels = formatDetectionPanelSummaries(overviewStatus, c420uiTheme.colors);
    diagnostics.setContent(panels.detectedInstallations.join("\n"));
    generatedArtifacts.setContent(panels.generatedArtifacts.join("\n"));
    linuxArtifacts.setContent(panels.linuxArtifacts.join("\n"));
  }
  function refreshDetectedInstallations(reason = "unknown") {
    if (overviewDetectionPromise) {
      return overviewDetectionPromise;
    }
    appendLogText(`[info] Detection started (${reason}).
`, "system");
    overviewDetectionPromise = detectInstallationStatusNow().then((latestStatus) => {
      if (latestStatus) {
        overviewStatus = latestStatus;
        overviewDetectionError = null;
      } else {
        overviewDetectionError = "Unable to parse status output";
        appendLogText("[error] Detection status parsing failed.\n", "system");
      }
      appendLogText(`[info] Detection finished (${reason}).
`, "system");
      renderDiagnosticsBox();
      renderCurrentContentPreservingProgress();
      return overviewStatus;
    }).finally(() => {
      overviewDetectionPromise = null;
    });
    return overviewDetectionPromise;
  }
  function getInstallDetectionKey(action) {
    return action.installDetectionKey ?? null;
  }
  async function detectInstallationStatusNow() {
    if (!bridge.overviewStatus) {
      return null;
    }
    try {
      return await bridge.overviewStatus();
    } catch (error) {
      appendLogText(
        `[error] Detection status failed: ${error instanceof Error ? error.message : String(error)}
`,
        "system"
      );
      return null;
    }
  }
  function isCriticalToolLog(line) {
    return /^\[(error|warn)\]/i.test(line) || /authentication failed/i.test(line);
  }
  function shouldDisplayLogLine(line, source) {
    if (source !== "system") {
      return true;
    }
    return toolSettings.tool.generalLogsEnabled || isCriticalToolLog(line);
  }
  function displayLogLine(line, source) {
    const prefix = source === "system" ? TOOL_LOG_PREFIX : ACTION_LOG_PREFIX;
    const msg = `${prefix} ${line}`.replace(
      /[{}]/g,
      (c) => c === "{" ? "\\{" : "\\}"
    );
    logHistory.push(`${prefix} ${line}`);
    if (logHistory.length > MAX_LOG_HISTORY_LINES) {
      logHistory.shift();
    }
    if (source === "stderr") {
      logs.log(`{red-fg}${msg}{/red-fg}`);
    } else if (source === "system") {
      logs.log(`{cyan-fg}${msg}{/cyan-fg}`);
    } else {
      logs.log(msg);
    }
  }
  function appendLogLine(line, source) {
    writeSession(`[${source}] ${line}`);
    if (shouldDisplayLogLine(line, source)) {
      displayLogLine(line, source);
    }
  }
  function appendLogText(text, source = "stdout") {
    logBuffers[source] += text;
    while (true) {
      const m = logBuffers[source].match(/\r?\n/);
      if (!m || m.index === void 0) {
        break;
      }
      const i = m.index;
      const n = m[0].length;
      appendLogLine(logBuffers[source].slice(0, i), source);
      logBuffers[source] = logBuffers[source].slice(i + n);
    }
    screen.render();
  }
  function importLauncherSessionLog() {
    if (!toolSettings.tool.generalLogsEnabled || !launcherSessionId || !launcherSessionLog.includes(`[session] started id=${launcherSessionId}`)) {
      return;
    }
    for (const line of launcherSessionLog.split(/\r?\n/)) {
      if (line.trim()) {
        displayLogLine(line, "system");
      }
    }
  }
  function activeLabel(label) {
    return `{${c420uiTheme.colors.activeLabel}-fg}${label}{/${c420uiTheme.colors.activeLabel}-fg}`;
  }
  function inactiveLabel(label) {
    return `{${c420uiTheme.colors.inactiveLabel}-fg}${label}{/${c420uiTheme.colors.inactiveLabel}-fg}`;
  }
  function setWidgetBorder(widget, active) {
    widget.style.border = {
      ...widget.style.border ?? {},
      fg: active ? c420uiTheme.colors.activeBorder : c420uiTheme.colors.inactiveBorder
    };
  }
  function setLabeledPanel(widget, label, active) {
    setWidgetBorder(widget, active);
    widget.setLabel(active ? activeLabel(label) : inactiveLabel(label));
  }
  function setFocusZone(nextZone) {
    if (modalActive || focusZone === nextZone) {
      return;
    }
    focusZone = nextZone;
    if (focusZone === "menu") {
      menu.focus();
    } else if (focusZone === "diagnostics") {
      diagnostics.focus();
    } else if (focusZone === "content") {
      content.focus();
    } else {
      logs.focus();
    }
    applyFocusStyles();
    screen.render();
  }
  function moveFocus(delta) {
    const index = FOCUS_ZONES.indexOf(focusZone);
    const nextIndex = (index + delta + FOCUS_ZONES.length) % FOCUS_ZONES.length;
    setFocusZone(FOCUS_ZONES[nextIndex] ?? "menu");
  }
  function applyFocusStyles() {
    setLabeledPanel(menu, menuLabelText, focusZone === "menu");
    setLabeledPanel(
      diagnostics,
      diagnosticsLabelText,
      focusZone === "diagnostics"
    );
    setLabeledPanel(
      generatedArtifacts,
      generatedArtifactsLabelText,
      focusZone === "diagnostics"
    );
    setLabeledPanel(
      linuxArtifacts,
      linuxArtifactsLabelText,
      focusZone === "diagnostics"
    );
    setLabeledPanel(content, contentLabelText, focusZone === "content");
    setLabeledPanel(logs, logsLabelText, focusZone === "logs");
    menu.style.selected = {
      ...menu.style.selected ?? {},
      fg: focusZone === "menu" ? c420uiTheme.colors.activeCellFg : c420uiTheme.colors.menuInactiveSelectedFg,
      bg: focusZone === "menu" ? c420uiTheme.colors.activeCellBg : c420uiTheme.colors.menuInactiveSelectedBg,
      bold: focusZone === "menu"
    };
  }
  function applyLogPanelLabel() {
    logsLabelText = terminalTextSelectionModeActive ? "Logs - Text selection mode enabled" : "Logs";
    applyFocusStyles();
  }
  function clearProgress() {
    progress.setContent("");
    progressState = "idle";
  }
  function setProgressRunning(percent, label) {
    progressState = "running";
    setProgress(percent, label, false);
  }
  function setProgressSuccess(label = "Completed") {
    progressState = "success";
    setProgress(100, label, false);
  }
  function setProgressWarning(label = "Completed with warnings") {
    progressState = "warning";
    setProgress(100, label, false);
  }
  function setProgressError(label) {
    progressState = "failed";
    setProgress(0, `Error: ${label}`, true);
  }
  function setProgressCanceled() {
    progressState = "canceled";
    setProgress(0, "Canceled", true);
  }
  function clearProgressOnNavigation() {
    if (!running) {
      clearProgress();
    }
  }
  function setProgress(percent, label, isError = false) {
    const barWidth = 20;
    const fill = Math.max(
      0,
      Math.min(barWidth, Math.round(percent / 100 * barWidth))
    );
    const bar = `${"\u2588".repeat(fill)}${"\u2591".repeat(barWidth - fill)}`;
    const color = isError || progressState === "failed" || progressState === "canceled" ? "red-fg" : progressState === "success" || progressState === "warning" ? "green-fg" : progressState === "running" ? "yellow-fg" : "white-fg";
    progress.setContent(
      `Progress: [{${color}}${bar}{/${color}}] ${percent}% - ${label}`
    );
  }
  function renderSelectionDetails() {
    if (["install", "development", "maintenance"].includes(currentView)) {
      clearProgressOnNavigation();
      renderActionHelp(currentView, menu.selected);
    } else if (currentView === "settings") {
      setSettingsMenuItems();
      renderSettingsHelp();
    }
  }
  function scrollFocusedPanel(delta) {
    if (focusZone === "menu") {
      if (delta < 0) {
        menu.up(Math.abs(delta));
      } else {
        menu.down(delta);
      }
      renderSelectionDetails();
      return;
    }
    if (focusZone === "diagnostics") {
      diagnostics.scroll(delta);
      generatedArtifacts.scroll(delta);
      linuxArtifacts.scroll(delta);
    } else if (focusZone === "content") {
      content.scroll(delta);
    } else {
      logs.scroll(delta);
    }
  }
  function setFocusedPanelScroll(percent) {
    if (focusZone === "menu") {
      if (percent === 0) {
        menu.select(0);
      } else {
        menu.select(Math.max(0, (menu.items?.length ?? 1) - 1));
      }
      renderSelectionDetails();
      return;
    }
    if (focusZone === "diagnostics") {
      diagnostics.setScrollPerc(percent);
      generatedArtifacts.setScrollPerc(percent);
      linuxArtifacts.setScrollPerc(percent);
    } else if (focusZone === "content") {
      content.setScrollPerc(percent);
    } else {
      logs.setScrollPerc(percent);
    }
  }
  function renderActionHelp(view, selectedIndex) {
    if (!["install", "development", "maintenance"].includes(view)) {
      return;
    }
    const selected = currentActions[selectedIndex] ?? null;
    const base = [
      `{${c420uiTheme.colors.helpTitle}-fg}${view.charAt(0).toUpperCase() + view.slice(1)} Actions{/${c420uiTheme.colors.helpTitle}-fg}`
    ];
    if (!selected) {
      return content.setContent(base.join("\n"));
    }
    const plannedBlock = isPlannedAction(selected) ? [
      "",
      `{${c420uiTheme.colors.infoItemTitle}-fg}Status:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
      `  {${c420uiTheme.colors.warning}-fg}Planned - visible in c420ui, but not executable in this phase.{/${c420uiTheme.colors.warning}-fg}`
    ] : [];
    const warningBlock = selected.warning ? [
      "",
      `{${c420uiTheme.colors.infoItemTitle}-fg}Warning:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
      `  {${c420uiTheme.colors.error}-fg}${selected.warning}{/${c420uiTheme.colors.error}-fg}`
    ] : [];
    content.setContent(
      [
        ...base,
        "",
        `{${c420uiTheme.colors.infoItemTitle}-fg}Selected action:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.infoText}-fg}${selected.label}{/${c420uiTheme.colors.infoText}-fg}`,
        "",
        `{${c420uiTheme.colors.infoItemTitle}-fg}Description:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.descriptionText}-fg}${selected.description ?? "No description available."}{/${c420uiTheme.colors.descriptionText}-fg}`,
        ...plannedBlock,
        ...warningBlock
      ].join("\n")
    );
  }
  function activeSettingsSectionIndex() {
    for (let index = menu.selected; index >= 0; index -= 1) {
      if (settingsItems[index]?.kind === "section") {
        return index;
      }
    }
    return -1;
  }
  function settingsItemLabel(item, index) {
    if (item.kind === "section") {
      const sectionColor = activeSettingsSectionIndex() === index ? c420uiTheme.colors.activeLabel : c420uiTheme.colors.inactiveLabel;
      return `{${sectionColor}-fg}{bold}${item.label}{/bold}{/${sectionColor}-fg}`;
    }
    if (item.kind === "note") {
      return `  {${c420uiTheme.colors.inactiveLabel}-fg}${item.label}{/${c420uiTheme.colors.inactiveLabel}-fg}`;
    }
    const enabled = Boolean(toolSettings.tool[item.key]);
    const checkbox = enabled ? "\u2713" : " ";
    const checkboxColor = enabled ? c420uiTheme.colors.activeCheckboxFg : c420uiTheme.colors.inactiveCheckboxFg;
    return `  {${checkboxColor}-fg}[${checkbox}]{/${checkboxColor}-fg} ${item.label}`;
  }
  function setSettingsMenuItems() {
    const selected = Math.min(
      Math.max(menu.selected, 0),
      settingsItems.length - 1
    );
    updatingSettingsMenuItems = true;
    try {
      menu.setItems(settingsItems.map(settingsItemLabel));
      menu.select(selected);
    } finally {
      updatingSettingsMenuItems = false;
    }
  }
  function selectedSettingsItem() {
    return settingsItems[menu.selected] ?? null;
  }
  function renderSettingsHelp() {
    const selected = selectedSettingsItem();
    const details = [
      `{${c420uiTheme.colors.helpTitle}-fg}Application Settings{/${c420uiTheme.colors.helpTitle}-fg}`,
      "",
      `{${c420uiTheme.colors.infoItemTitle}-fg}Settings file:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
      `  {${c420uiTheme.colors.descriptionText}-fg}${settingsPath}{/${c420uiTheme.colors.descriptionText}-fg}`,
      ""
    ];
    if (selected?.kind === "toggle") {
      details.push(
        `{${c420uiTheme.colors.infoItemTitle}-fg}Selected setting:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.infoText}-fg}${selected.label}{/${c420uiTheme.colors.infoText}-fg}`,
        ""
      );
      if (selected.key === "generalLogsEnabled") {
        details.push(
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Behavior{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  When enabled, Tool-level logs such as startup, settings, detection and authentication events are visible in the logs panel.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  When disabled, Action logs remain visible and critical Tool warnings/errors still appear. The session log file continues recording Tool diagnostics.{/${c420uiTheme.colors.descriptionText}-fg}`
        );
      } else {
        details.push(
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Behavior{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Manual text selection mode disables c420ui mouse capture globally and keeps keyboard navigation active.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Changes take effect immediately and are saved for the next c420ui start. Use PageUp, PageDown, Home and End to scroll logs while this mode is active.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  F5 continues to copy the visible log history to the clipboard.{/${c420uiTheme.colors.descriptionText}-fg}`
        );
      }
    } else if (selected?.kind === "section") {
      details.push(
        `{${c420uiTheme.colors.infoItemTitle}-fg}Section:{/${c420uiTheme.colors.infoItemTitle}-fg}`,
        `  {${c420uiTheme.colors.infoText}-fg}${selected.label}{/${c420uiTheme.colors.infoText}-fg}`,
        "",
        `{${c420uiTheme.colors.descriptionText}-fg}Tool settings affect this installer/development interface. Final build settings will apply to the packaged ${opts.project.projectName} app in a later phase.{/${c420uiTheme.colors.descriptionText}-fg}`
      );
    } else {
      details.push(
        `{${c420uiTheme.colors.descriptionText}-fg}Use Enter or Space on a checkbox setting to toggle it. Application Settings are persistent c420ui state, not shell actions.{/${c420uiTheme.colors.descriptionText}-fg}`
      );
    }
    content.setContent(details.join("\n"));
  }
  function persistSettings(reason) {
    try {
      saveToolSettings(toolSettings, opts.project.stateDirectoryName);
    } catch (error) {
      appendLogText(
        `[error] Settings could not be saved: ${error instanceof Error ? error.message : String(error)}
`,
        "system"
      );
      return;
    }
    applyGlobalMouseMode();
    applyLogPanelLabel();
    if (currentView === "settings") {
      setSettingsMenuItems();
    }
    appendLogText(`[info] Settings changed (${reason}).
`, "system");
    renderSettingsHelp();
    screen.render();
  }
  function toggleSelectedSetting() {
    const selected = selectedSettingsItem();
    if (selected?.kind !== "toggle") {
      return;
    }
    toolSettings = {
      ...toolSettings,
      tool: {
        ...toolSettings.tool,
        [selected.key]: !toolSettings.tool[selected.key]
      }
    };
    persistSettings(selected.key);
  }
  function renderCurrentContentPreservingProgress() {
    if (currentView === "main") {
      renderDiagnosticsBox();
      screen.render();
      return;
    }
    if (["install", "development", "maintenance"].includes(currentView)) {
      renderActionHelp(currentView, menu.selected);
      screen.render();
    }
    if (currentView === "settings") {
      renderSettingsHelp();
      screen.render();
    }
  }
  function setView(view) {
    currentView = view;
    clearProgressOnNavigation();
    if (view === "main") {
      if (!overviewStatus) {
        void refreshDetectedInstallations("enter-overview");
      }
      renderDiagnosticsBox();
      currentActions = [];
      menu.setItems(mainItems.map((item) => item.label));
      menuLabelText = "Main Menu";
      contentLabelText = "Overview";
      content.setContent(
        [
          `{${c420uiTheme.colors.logo}-fg}${opts.project.logoLines.join("\n")}{/${c420uiTheme.colors.logo}-fg}`,
          "",
          "Version:",
          `  {${c420uiTheme.colors.version}-fg}${opts.project.displayVersion}{/${c420uiTheme.colors.version}-fg}`,
          "",
          "Phase:",
          `  {${c420uiTheme.colors.phase}-fg}${opts.project.phase ?? "unknown"}{/${c420uiTheme.colors.phase}-fg}`,
          "",
          "Version Release Notes:",
          `  ${opts.releaseNotes}`,
          "",
          "Package / Version Information:",
          `  App ID: ${opts.project.appId}`,
          `  Executable: ${opts.project.executableName}`,
          `  Repository: ${opts.project.repositoryUrl}`
        ].join("\n")
      );
      applyFocusStyles();
      screen.render();
      return;
    }
    if (view === "help") {
      currentActions = [];
      menu.setItems(["Back to Main"]);
      menuLabelText = "Help";
      contentLabelText = "Help";
      content.setContent(
        [
          `{${c420uiTheme.colors.helpTitle}-fg}Help{/${c420uiTheme.colors.helpTitle}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Navigation{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Tab / Shift+Tab       Move focus between menu, diagnostics, action panel and logs{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Up/Down               Move menu selection when the menu is focused{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Enter                 Select action only when the menu is focused{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Space                 Toggle setting checkbox only when Application Settings is focused{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  PageUp/PageDown       Scroll the focused panel{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Home/End              Move the focused scrollable panel to start/end{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Esc                   Back to main or confirm exit{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  q                     Quit{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Panels{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Active panel: highlighted border and label{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Active cell: highlighted menu/settings row{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Alt+Up/Down or Shift+PgUp/PgDn still scroll action panel directly{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Logs{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  F5             Copy logs to clipboard{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  PageUp/PageDown/Home/End{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Manual text selection mode can be enabled in Application Settings. It disables c420ui mouse capture globally, keeps keyboard navigation active, and some terminals may still require Shift during selection.{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Launcher{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  ${opts.project.launcherCommand} opens the c420ui.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Any direct action flag runs CLI mode instead.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Do not run the Tool with sudo or as root; privileged actions ask for administrator authentication only when needed.{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Root authentication failures are shown in a centered popup and the action is not started.{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Settings{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Tool settings file: ${settingsPath}{/${c420uiTheme.colors.descriptionText}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  Tool settings affect this installer/development interface. Final build settings apply to the packaged app and are reserved for a later phase.{/${c420uiTheme.colors.descriptionText}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Status colors{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `  {${c420uiTheme.colors.activeLabel}-fg}Active panel border / label{/${c420uiTheme.colors.activeLabel}-fg}`,
          `  {${c420uiTheme.colors.activeCellFg}-fg}{${c420uiTheme.colors.activeCellBg}-bg}Active cell row{/${c420uiTheme.colors.activeCellBg}-bg}{/${c420uiTheme.colors.activeCellFg}-fg}`,
          `  {${c420uiTheme.colors.statusDetected}-fg}Detected / Completed{/${c420uiTheme.colors.statusDetected}-fg}`,
          `  {${c420uiTheme.colors.statusNotDetected}-fg}Not detected{/${c420uiTheme.colors.statusNotDetected}-fg}`,
          `  {${c420uiTheme.colors.warning}-fg}Running{/${c420uiTheme.colors.warning}-fg}`,
          `  {${c420uiTheme.colors.error}-fg}Error / Canceled{/${c420uiTheme.colors.error}-fg}`,
          "",
          `{${c420uiTheme.colors.helpSectionTitle}-fg}Clipboard order{/${c420uiTheme.colors.helpSectionTitle}-fg}`,
          `{${c420uiTheme.colors.descriptionText}-fg}  wl-copy -> KDE qdbus6/qdbus -> GPaste -> xclip -> xsel{/${c420uiTheme.colors.descriptionText}-fg}`
        ].join("\n")
      );
      applyFocusStyles();
      screen.render();
      return;
    }
    if (view === "settings") {
      currentActions = [];
      setSettingsMenuItems();
      menuLabelText = "Application Settings";
      contentLabelText = "Application Settings";
      renderSettingsHelp();
      applyFocusStyles();
      screen.render();
      return;
    }
    const group = view === "install" ? "install" : view === "maintenance" ? "maintenance" : "development";
    currentActions = bridge.actions().filter((action) => action.group === group);
    menu.setItems(currentActions.map((a) => a.label));
    menuLabelText = `${view.charAt(0).toUpperCase() + view.slice(1)} Actions`;
    contentLabelText = view.charAt(0).toUpperCase() + view.slice(1);
    renderActionHelp(view, menu.selected);
    applyFocusStyles();
    screen.render();
  }
  menu.on("select", async (_, index) => {
    if (running || modalActive || focusZone !== "menu") {
      return;
    }
    if (currentView === "main") {
      return setView(mainItems[index]?.view ?? "main");
    }
    if (currentView === "help") {
      return setView("main");
    }
    if (currentView === "settings") {
      toggleSelectedSetting();
      return;
    }
    const action = currentActions[index];
    if (!action) {
      return;
    }
    if (isPlannedAction(action)) {
      const message = action.description || `${action.label} is not implemented in this phase.`;
      await actionRunner.runAction(action, { dryRun: false });
      modalActive = true;
      await messageDialog(
        screen,
        "Planned action",
        [
          message,
          "",
          "This action is visible in c420ui for roadmap awareness, but it is not executable in this phase."
        ].join("\n")
      );
      modalActive = false;
      return;
    }
    const requiresConfirmation = interactiveActionRequiresConfirmation(action);
    let confirmed = false;
    if (requiresConfirmation) {
      modalActive = true;
      const ok = await confirmDialog(screen, {
        title: action.confirmationTitle ?? "Confirm",
        message: action.confirmationMessage ?? action.description ?? "Continue?",
        dangerous: action.dangerous === true
      });
      modalActive = false;
      if (!ok) {
        return;
      }
      confirmed = true;
    }
    appendLogText(`[action] ${action.id} ${action.label}
`, "system");
    writeSession(`[action] ${action.id} ${action.label}`);
    const result = await actionRunner.runAction(action, {
      confirmed,
      dryRun: false
    });
    const installAction = action.id.startsWith("install-");
    let detectedNow = false;
    if (installAction) {
      const detectionKey = getInstallDetectionKey(action);
      if (detectionKey) {
        const latestStatus = await detectInstallationStatusNow();
        if (latestStatus) {
          overviewStatus = latestStatus;
        }
        detectedNow = Boolean(latestStatus?.installations?.[detectionKey]);
      }
    }
    if (result.status === "canceled") {
      setProgressCanceled();
    } else if (installAction && detectedNow && result.code !== 0) {
      setProgressWarning("Completed with warnings");
    } else if (result.code === 0 || installAction && detectedNow) {
      setProgressSuccess("Completed");
    } else if (result.status === "planned") {
      setProgressWarning("Planned action");
    } else {
      setProgressError(`exit code ${result.code ?? "unknown"}`);
    }
    appendLogText(
      `[info] Action finished (${result.status}:${result.code}).
`,
      "system"
    );
    await refreshDetectedInstallations(`action:${action.id}`);
    running = false;
    renderActionHelp(currentView, menu.selected);
    screen.render();
  });
  const confirmExit = async () => {
    if (modalActive) {
      return;
    }
    modalActive = true;
    const ok = await confirmDialog(screen, {
      title: "Exit Application",
      message: "Do you want to exit the application?",
      confirmLabel: "Yes",
      cancelLabel: "No"
    });
    modalActive = false;
    if (ok) {
      screen.destroy();
      process.exit(0);
    }
  };
  screen.key(["q"], () => {
    void confirmExit();
  });
  screen.key(["tab"], () => {
    if (!modalActive) {
      moveFocus(1);
    }
  });
  screen.key(["S-tab", "backtab"], () => {
    if (!modalActive) {
      moveFocus(-1);
    }
  });
  screen.key(["escape"], () => {
    if (modalActive) {
      return;
    }
    if (running) {
      void confirmExit();
      return;
    }
    if (currentView === "main") {
      void confirmExit();
      return;
    }
    setView("main");
  });
  screen.key(["C-c"], () => {
    if (modalActive) {
      return;
    }
    const now = Date.now();
    if (running) {
      if (now - lastCtrlCAt < 1500) {
        void confirmExit();
        return;
      }
      lastCtrlCAt = now;
      if (actionRunner.cancel()) {
        appendLogText(
          "[warn] Interrupt requested for running action. Press Ctrl+C again to exit application.\n",
          "system"
        );
      } else {
        appendLogText(
          "[warn] Action is running. Press Ctrl+C again to exit application.\n",
          "system"
        );
      }
      return;
    }
    void confirmExit();
  });
  screen.key(["f5"], () => {
    const result = copyTextToClipboard(logHistory.join("\n"));
    appendLogText(
      `${result.ok ? "[ok]" : "[warn]"} ${result.message}
`,
      "system"
    );
  });
  screen.key(["S-pageup", "M-up"], () => {
    content.scroll(-5);
    screen.render();
  });
  screen.key(["S-pagedown", "M-down"], () => {
    content.scroll(5);
    screen.render();
  });
  screen.key(["pageup"], () => {
    if (!modalActive) {
      scrollFocusedPanel(-10);
    }
    screen.render();
  });
  screen.key(["pagedown"], () => {
    if (!modalActive) {
      scrollFocusedPanel(10);
    }
    screen.render();
  });
  screen.key(["home"], () => {
    if (!modalActive) {
      setFocusedPanelScroll(0);
    }
    screen.render();
  });
  screen.key(["end"], () => {
    if (!modalActive) {
      setFocusedPanelScroll(100);
    }
    screen.render();
  });
  screen.key(["?"], () => {
    if (!running && !modalActive) {
      setView("help");
    }
  });
  screen.key(["space"], () => {
    if (!running && !modalActive && focusZone === "menu" && currentView === "settings") {
      toggleSelectedSetting();
    }
  });
  menu.on("click", () => {
    if (!modalActive) {
      setFocusZone("menu");
    }
  });
  diagnostics.on("click", () => {
    if (!modalActive) {
      setFocusZone("diagnostics");
    }
  });
  generatedArtifacts.on("click", () => {
    if (!modalActive) {
      setFocusZone("diagnostics");
    }
  });
  linuxArtifacts.on("click", () => {
    if (!modalActive) {
      setFocusZone("diagnostics");
    }
  });
  content.on("click", () => {
    if (!modalActive) {
      setFocusZone("content");
    }
  });
  logs.on("click", () => {
    if (!modalActive) {
      setFocusZone("logs");
    }
  });
  menu.on("keypress", (_, key) => {
    if (updatingSettingsMenuItems) {
      return;
    }
    if ((key.name === "up" || key.name === "down") && ["install", "development", "maintenance"].includes(currentView)) {
      renderSelectionDetails();
      screen.render();
    }
    if ((key.name === "up" || key.name === "down") && currentView === "settings") {
      renderSelectionDetails();
      screen.render();
    }
  });
  menu.on("select item", () => {
    if (updatingSettingsMenuItems) {
      return;
    }
    if (["install", "development", "maintenance"].includes(currentView)) {
      renderSelectionDetails();
      screen.render();
    }
    if (currentView === "settings") {
      renderSelectionDetails();
      screen.render();
    }
  });
  applyLogPanelLabel();
  importLauncherSessionLog();
  appendLogText(
    `[info] c420ui started. project=${opts.project.projectName} version=${opts.project.displayVersion} phase=${opts.project.phase}
`,
    "system"
  );
  appendLogText(`[info] Settings loaded from ${settingsPath}.
`, "system");
  setView("main");
  void refreshDetectedInstallations("startup");
  renderDiagnosticsBox();
  menu.focus();
  if (options.startupTasks?.length) {
    setImmediate(() => {
      void runC420UIStartupTasks(options.startupTasks ?? [], (text) => {
        appendLogText(text, "system");
      }).then(() => screen.render());
    });
  }
  return screen;
}

// build-resources/c420ui/src/terminal/help.ts
function formatC420UITerminalHelp(options) {
  const launcher = options.launcherCommand || options.config.project.launcherCommand;
  return [
    `${options.config.project.projectName} c420ui terminal interface`,
    "",
    "Usage:",
    "  npm run c420ui",
    launcher ? `  ${launcher}` : ""
  ].filter(Boolean).join("\n");
}
function printC420UITerminalHelp(options) {
  console.log(formatC420UITerminalHelp(options));
}

// build-resources/c420ui/src/terminal/root-guard.ts
function createC420UIRootLaunchGuardMessage(projectName) {
  const toolName = `${projectName} Install and Development Tool`;
  return [
    `Do not run ${toolName} with sudo or as root.`,
    "",
    `Run this tool as your regular user. When an operation needs administrator privileges, ${projectName} will ask for authentication only for that specific action.`,
    "",
    "Running the whole tool as root may break file ownership, user sessions, build artifacts and desktop integration."
  ].join("\n");
}
function isC420UIRootLaunch(getuid = process.getuid) {
  return typeof getuid === "function" && getuid() === 0;
}
function enforceC420UIRootLaunchGuard(options) {
  if (!isC420UIRootLaunch(options.getuid)) return;
  const message = createC420UIRootLaunchGuardMessage(options.projectName);
  options.writeError?.(message);
  options.exit?.(1);
}

// build-resources/c420ui/src/terminal/runtime.ts
function runC420UITerminalApp(options, runtimeOptions = {}) {
  const writeError = runtimeOptions.writeError ?? console.error;
  const exit = runtimeOptions.exit ?? process.exit;
  enforceC420UIRootLaunchGuard({
    projectName: options.config.project.projectName,
    getuid: runtimeOptions.getuid,
    writeError,
    exit
  });
  const create = runtimeOptions.create ?? createApp;
  const screen = create(options);
  const onUncaughtException = runtimeOptions.onUncaughtException ?? ((listener) => process.on("uncaughtException", listener));
  onUncaughtException((err) => {
    try {
      screen.destroy();
    } catch {
    }
    writeError(err instanceof Error ? err.stack || err.message : String(err));
    exit(1);
  });
}

// build-resources/canva-linux/c420ui-adapter/adapter.ts
import fs17 from "node:fs";
import path17 from "node:path";

// build-resources/c420ui/src/linux-root-provider.ts
import {
  spawnSync as spawnSync2
} from "node:child_process";

// build-resources/c420ui/src/root-provider.ts
var c420uiRootPolicyExitCode = 64;

// build-resources/c420ui/src/linux-root-provider.ts
function defaultC420UILinuxRootValidationCommand(sudoCommand) {
  return { command: sudoCommand, args: ["-v"] };
}
function defaultC420UILinuxRootValidationStdinCommand(sudoCommand) {
  return { command: sudoCommand, args: ["-S", "-v", "-p", ""] };
}
function defaultC420UILinuxBuildActionEnvironment(action, baseEnv) {
  return { ...baseEnv, ...action.env || {} };
}
function defaultC420UILinuxActionHasUserScope(action, actionEnv = {}) {
  void actionEnv;
  return isC420UIUserScope(action.scope);
}
function validateC420UILinuxActionScope(action, actionEnv, actionHasUserScope = defaultC420UILinuxActionHasUserScope) {
  if (action.requiresRoot === true && actionHasUserScope(action, actionEnv)) {
    return {
      ok: false,
      code: c420uiRootPolicyExitCode,
      message: `[error] ${action.id}: requiresRoot=true cannot be combined with user scope.`
    };
  }
  return { ok: true };
}
function createC420UILinuxRootProviderBase(options) {
  const runCommand = options.runCommand ?? spawnSync2;
  const buildActionEnvironment = options.buildActionEnvironment ?? defaultC420UILinuxBuildActionEnvironment;
  const actionHasUserScope = options.actionHasUserScope ?? defaultC420UILinuxActionHasUserScope;
  const buildRootValidationCommand = options.buildRootValidationCommand ?? defaultC420UILinuxRootValidationCommand;
  const buildRootValidationStdinCommand = options.buildRootValidationStdinCommand ?? defaultC420UILinuxRootValidationStdinCommand;
  return {
    id: options.id ?? "c420ui-linux-root-provider-base",
    label: options.label ?? "c420ui Linux root provider base",
    buildActionEnvironment(action, baseEnv) {
      return buildActionEnvironment(action, baseEnv);
    },
    validateActionScope(action, actionEnv) {
      return validateC420UILinuxActionScope(
        action,
        actionEnv,
        actionHasUserScope
      );
    },
    validateRootAccess(rootDir2, actionEnv) {
      const validationCommand = buildRootValidationCommand(
        options.sudoCommand
      );
      const result = runCommand(validationCommand.command, validationCommand.args, {
        cwd: rootDir2,
        stdio: "inherit",
        env: actionEnv,
        shell: false
      });
      if (result.error) {
        return {
          ok: false,
          code: 1,
          message: `[error] Failed to start privilege validation: ${result.error.message}`
        };
      }
      const code = result.status ?? 1;
      if (code !== 0) {
        return {
          ok: false,
          code,
          message: "[error] Privilege validation failed before action execution."
        };
      }
      return { ok: true };
    },
    validateRootAccessWithInput(rootDir2, actionEnv, input) {
      const validationCommand = buildRootValidationStdinCommand(
        options.sudoCommand
      );
      const result = runCommand(validationCommand.command, validationCommand.args, {
        cwd: rootDir2,
        env: actionEnv,
        shell: false,
        input: `${input}
`,
        stdio: ["pipe", "pipe", "pipe"]
      });
      if (result.error) {
        return {
          ok: false,
          code: 1,
          message: `[error] Failed to start privilege validation: ${result.error.message}`
        };
      }
      const code = result.status ?? 1;
      if (code !== 0) {
        return {
          ok: false,
          code,
          message: "[error] Privilege validation failed before action execution."
        };
      }
      return { ok: true };
    },
    buildRootActionEnvironment(_action, actionEnv) {
      if (!options.rootAuthEnvKey) return { ...actionEnv };
      return {
        ...actionEnv,
        [options.rootAuthEnvKey]: options.rootAuthEnvValue ?? "1"
      };
    }
  };
}

// build-resources/c420ui/src/command-dependencies.ts
import fs3 from "node:fs";
import path3 from "node:path";
function candidateNames(command, env) {
  if (process.platform !== "win32") return [command];
  const extensions = (env?.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean);
  return path3.extname(command) ? [command] : [command, ...extensions.map((extension) => `${command}${extension}`)];
}
var lookupC420UICommandInPath = (command, options) => {
  if (!command) return false;
  const env = options.env ?? process.env;
  const pathValue = env.PATH || "";
  const pathSeparator = process.platform === "win32" ? ";" : ":";
  const commandHasDirectory = command.includes("/") || command.includes("\\");
  const directories = commandHasDirectory ? [""] : pathValue.split(pathSeparator);
  for (const directory of directories) {
    for (const candidate of candidateNames(command, env)) {
      const fullPath = commandHasDirectory ? candidate : path3.join(directory, candidate);
      try {
        const stat = fs3.statSync(fullPath);
        if (!stat.isFile()) continue;
        if (process.platform !== "win32") {
          fs3.accessSync(fullPath, fs3.constants.X_OK);
        }
        return true;
      } catch {
      }
    }
  }
  return false;
};
function checkC420UICommandDependencies(dependencies = [], options = {}) {
  if (dependencies.length === 0) {
    return { status: "skipped", message: "No command dependencies were declared." };
  }
  const lookupCommand = options.lookupCommand ?? lookupC420UICommandInPath;
  const missing = [];
  for (const dependency of dependencies) {
    if (lookupCommand(dependency.command, { env: options.env })) continue;
    if (dependency.required === false) continue;
    missing.push({
      id: dependency.id,
      label: dependency.installHint ? `${dependency.command} (${dependency.installHint})` : dependency.command,
      command: dependency.command,
      requiredFor: dependency.requiredFor
    });
  }
  if (missing.length > 0) {
    return {
      status: "missing",
      dependencies: missing,
      exitCode: 1,
      message: `Missing required command dependencies: ${missing.map((item) => item.command ?? item.id).join(", ")}.`
    };
  }
  return { status: "available", message: "Required command dependencies are available." };
}

// build-resources/c420ui/src/node-dependencies.ts
function parseMajor(version) {
  const normalized = version.startsWith("v") ? version.slice(1) : version;
  const major = Number(normalized.split(".")[0]);
  return Number.isFinite(major) ? major : null;
}
function checkC420UINodeDependency(config, options = {}) {
  if (!config || config.required === false) {
    return { status: "skipped", message: "No required Node.js dependency was declared." };
  }
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const currentMajor = parseMajor(nodeVersion);
  if (currentMajor === null) {
    return {
      status: "failed",
      exitCode: 1,
      message: `Unable to parse Node.js version: ${nodeVersion}.`
    };
  }
  if (typeof config.minimumMajor === "number" && currentMajor < config.minimumMajor) {
    return {
      status: "failed",
      exitCode: 1,
      message: `Node.js major version ${config.minimumMajor} or newer is required. Current version: ${nodeVersion}.`
    };
  }
  return { status: "available", message: "Node.js dependency is available." };
}

// build-resources/c420ui/src/npm-dependencies.ts
import { spawnSync as spawnSync3 } from "node:child_process";
import fs4 from "node:fs";
import path4 from "node:path";
function readPackageJson(rootDir2) {
  const packagePath = path4.join(rootDir2, "package.json");
  if (!fs4.existsSync(packagePath)) {
    return { result: { status: "failed", exitCode: 1, message: "package.json was not found." } };
  }
  try {
    const packageJson = JSON.parse(fs4.readFileSync(packagePath, "utf8"));
    return { packageJson };
  } catch (error) {
    return {
      result: {
        status: "failed",
        exitCode: 1,
        message: `package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`
      }
    };
  }
}
function validatePackageScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const failures = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string") {
      failures.push(`scripts.${name} must be a string`);
    } else if (/\r|\n/.test(command)) {
      failures.push(`scripts.${name} must stay on one line`);
    }
  }
  if (failures.length > 0) {
    return {
      status: "failed",
      exitCode: 1,
      message: `package.json contains invalid npm scripts: ${failures.join("; ")}.`
    };
  }
  return void 0;
}
function dependencyNames(dependencies) {
  return dependencies ? Object.keys(dependencies) : [];
}
function declaredDependencyNames(packageJson, config) {
  return /* @__PURE__ */ new Set([
    ...dependencyNames(packageJson.dependencies),
    ...dependencyNames(packageJson.optionalDependencies),
    ...config.includeDev === false ? [] : dependencyNames(packageJson.devDependencies)
  ]);
}
function resolveC420UINpmDependency(dependency, rootDir2) {
  let currentDir = path4.resolve(rootDir2);
  while (true) {
    const candidate = path4.join(currentDir, "node_modules", dependency, "package.json");
    if (fs4.existsSync(candidate)) return true;
    const parent = path4.dirname(currentDir);
    if (parent === currentDir) return false;
    currentDir = parent;
  }
}
function requiredNpmDependencies(config) {
  return [
    ...config.requiredDependencies ?? [],
    ...config.includeDev === false ? [] : config.requiredDevDependencies ?? []
  ];
}
function installArgs(config, rootDir2) {
  const strategy = config.installStrategy ?? "auto";
  const lockfile = config.lockfile ?? "package-lock.json";
  const hasLockfile = fs4.existsSync(path4.join(rootDir2, lockfile));
  const command = strategy === "ci" || strategy === "auto" && hasLockfile ? "ci" : "install";
  return config.includeDev === false ? [command] : [command, "--include=dev"];
}
function planC420UINpmInstallCommand(config, rootDir2) {
  if (!config) return void 0;
  return {
    command: "npm",
    args: installArgs(config, rootDir2),
    cwd: rootDir2
  };
}
function checkC420UINpmDeclaredDependencies(config, packageJson) {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }
  const declared = declaredDependencyNames(packageJson, config);
  const undeclared = requiredNpmDependencies(config).filter((dependency) => !declared.has(dependency));
  if (undeclared.length > 0) {
    return {
      status: "failed",
      dependencies: undeclared.map((dependency) => ({
        id: dependency,
        label: dependency
      })),
      exitCode: 1,
      message: `Required npm dependencies are not declared in package.json: ${undeclared.join(", ")}.`
    };
  }
  return { status: "available", message: "Required npm dependencies are declared." };
}
function checkC420UINpmInstalledDependencies(config, options) {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }
  const resolveDependency = options.resolveDependency ?? resolveC420UINpmDependency;
  const missing = requiredNpmDependencies(config).filter((dependency) => !resolveDependency(dependency, options.rootDir)).map((dependency) => ({
    id: dependency,
    label: dependency
  }));
  if (missing.length > 0) {
    return {
      status: "missing",
      dependencies: missing,
      exitCode: 1,
      message: `Required npm dependencies are declared but not installed: ${missing.map((item) => item.id).join(", ")}.`
    };
  }
  return { status: "available", message: "Required npm dependencies are installed." };
}
function checkC420UINpmDependencies(config, options) {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }
  if (config.packageManager !== "npm") {
    return { status: "failed", exitCode: 1, message: `Unsupported package manager: ${config.packageManager}.` };
  }
  const { packageJson, result } = readPackageJson(options.rootDir);
  if (result) return result;
  const scriptsResult = validatePackageScripts(packageJson ?? {});
  if (scriptsResult) return scriptsResult;
  const declaredResult = checkC420UINpmDeclaredDependencies(config, packageJson ?? {});
  if (declaredResult.status === "failed") return declaredResult;
  return checkC420UINpmInstalledDependencies(config, {
    rootDir: options.rootDir,
    resolveDependency: options.resolveDependency
  });
}
var defaultNpmCommandRunner = (command, args, options) => spawnSync3(command, args, {
  cwd: options.cwd,
  env: options.env,
  stdio: options.stdio ?? "inherit",
  shell: false
});
function ensureC420UINpmDependencies(config, options) {
  if (!config) {
    return { status: "skipped", message: "No npm dependencies were declared." };
  }
  const env = options.env ?? process.env;
  if (env.C420UI_SKIP_DEPENDENCY_INSTALL === "1") {
    return {
      status: "failed",
      exitCode: 1,
      message: "npm dependency installation was skipped because C420UI_SKIP_DEPENDENCY_INSTALL=1."
    };
  }
  const { packageJson, result } = readPackageJson(options.rootDir);
  if (result) return result;
  const scriptsResult = validatePackageScripts(packageJson ?? {});
  if (scriptsResult) return scriptsResult;
  const declaredResult = checkC420UINpmDeclaredDependencies(config, packageJson ?? {});
  if (declaredResult.status === "failed") return declaredResult;
  const args = installArgs(config, options.rootDir);
  const runCommand = options.runCommand ?? defaultNpmCommandRunner;
  const repairMessage = env.C420UI_DEPENDENCY_REPAIR === "clean" ? " after clean repair was requested" : "";
  const commandResult = runCommand("npm", args, {
    cwd: options.rootDir,
    env,
    stdio: "inherit"
  });
  if (commandResult.error) {
    return { status: "failed", exitCode: 1, message: commandResult.error.message };
  }
  const status = commandResult.status ?? 1;
  if (status !== 0) {
    return {
      status: "failed",
      exitCode: status,
      message: `npm ${args.join(" ")} failed${repairMessage}.`
    };
  }
  return { status: "available", message: `npm ${args.join(" ")} completed successfully${repairMessage}.` };
}

// build-resources/c420ui/src/host-dependency-runner.ts
function runC420UIHostDependencyEnsure(config, options) {
  const nodeResult = checkC420UINodeDependency(config.node);
  if (nodeResult.status === "failed" || nodeResult.status === "missing") return nodeResult;
  const commandResult = checkC420UICommandDependencies(config.commands ?? [], {
    env: options.env
  });
  if (commandResult.status === "failed" || commandResult.status === "missing") return commandResult;
  const npmResult = checkC420UINpmDependencies(config.npm, {
    rootDir: options.rootDir,
    env: options.env
  });
  const repairRequested = options.env?.C420UI_DEPENDENCY_REPAIR === "clean";
  if (npmResult.status === "available" && !repairRequested) {
    return { status: "available", message: "Host dependencies are available." };
  }
  if (npmResult.status === "failed") return npmResult;
  if (npmResult.status === "missing" || repairRequested) {
    if (options.dryRun) {
      return {
        status: "skipped",
        message: "Host dependency installation would run, but dry-run is enabled.",
        plannedCommand: planC420UINpmInstallCommand(config.npm, options.rootDir)
      };
    }
    return ensureC420UINpmDependencies(config.npm, {
      rootDir: options.rootDir,
      env: options.env,
      runCommand: options.runCommand
    });
  }
  return { status: "available", message: "Host dependencies are available." };
}

// build-resources/c420ui/src/command-runner.ts
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

// build-resources/c420ui/src/operational-logs.ts
var c420uiDefaultRedactionPatterns = [
  {
    id: "token-assignment",
    pattern: /\b(token|secret|password|passwd|api[_-]?key)=([^\s]+)/gi,
    replacement: "$1=[redacted]"
  },
  {
    id: "bearer-token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/g,
    replacement: "Bearer [redacted]"
  }
];
function redactC420UILogLine(line) {
  return c420uiDefaultRedactionPatterns.reduce(
    (redactedLine, redaction) => redactedLine.replace(redaction.pattern, redaction.replacement),
    line
  );
}
function createC420UIOperationalLogEvent(options) {
  return {
    source: options.source,
    line: options.redact === false ? options.line : redactC420UILogLine(options.line),
    level: options.level,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// build-resources/c420ui/src/command-runner.ts
function emitOperationalLog(options, event) {
  options.emitLog(createC420UIOperationalLogEvent(event));
}
function emitDecodedChunk(stream, chunk, source, emitLog) {
  stream.pending += stream.decoder.write(chunk);
  const lines = stream.pending.split(/\r?\n/);
  stream.pending = lines.pop() ?? "";
  for (const line of lines) {
    emitLog(createC420UIOperationalLogEvent({ source, line }));
  }
}
function emitRemainingChunk(stream, source, emitLog) {
  if (stream.ended) return;
  stream.pending += stream.decoder.end();
  if (stream.pending) {
    emitLog(createC420UIOperationalLogEvent({ source, line: stream.pending }));
  }
  stream.pending = "";
  stream.ended = true;
}
async function runC420UICommand(options) {
  const spawnCommand = options.spawnCommand ?? spawn;
  const args = options.args ?? [];
  const stdoutStream = { decoder: new StringDecoder("utf8"), pending: "", ended: false };
  const stderrStream = { decoder: new StringDecoder("utf8"), pending: "", ended: false };
  const cancelSignal = options.cancelSignal ?? "SIGINT";
  const cancelKillSignal = options.cancelKillSignal ?? "SIGTERM";
  const cancelKillTimeoutMs = options.cancelKillTimeoutMs ?? 5e3;
  if (options.signal?.aborted) {
    emitOperationalLog(options, {
      source: "action",
      line: `[action] Cancel requested for ${options.label}`,
      level: "info"
    });
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: "Action canceled before start."
    };
  }
  return new Promise((resolve) => {
    let settled = false;
    let closeObserved = false;
    let cancellationRequested = false;
    let canceledProgressEmitted = false;
    let cancelKillTimer;
    let child;
    function emitCanceledProgress() {
      if (canceledProgressEmitted) return;
      canceledProgressEmitted = true;
      options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    }
    function clearCancelKillTimer() {
      if (!cancelKillTimer) return;
      clearTimeout(cancelKillTimer);
      cancelKillTimer = void 0;
    }
    function settle(result) {
      if (settled) return;
      settled = true;
      clearCancelKillTimer();
      options.signal?.removeEventListener("abort", abortAction);
      resolve(result);
    }
    function abortAction() {
      cancellationRequested = true;
      emitOperationalLog(options, {
        source: "action",
        line: `[action] Cancel requested for ${options.label}`,
        level: "info"
      });
      emitCanceledProgress();
      child.kill(cancelSignal);
      cancelKillTimer = setTimeout(() => {
        if (!closeObserved) child.kill(cancelKillSignal);
      }, cancelKillTimeoutMs);
      cancelKillTimer.unref();
    }
    emitOperationalLog(options, {
      source: "action",
      line: `[action] Starting ${options.label}`,
      level: "info"
    });
    options.emitProgress({ state: "running", label: options.label });
    try {
      child = spawnCommand(options.command, args, {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitOperationalLog(options, {
        source: "action",
        line: `[error] Failed to start ${options.label}: ${message}`,
        level: "error"
      });
      options.emitProgress({ state: "failed", label: options.label });
      settle({ code: c420uiExitCodes.generalError, status: "failed", message });
      return;
    }
    options.signal?.addEventListener("abort", abortAction, { once: true });
    child.stdout?.on("data", (chunk) => {
      emitDecodedChunk(stdoutStream, chunk, "stdout", options.emitLog);
    });
    child.stderr?.on("data", (chunk) => {
      emitDecodedChunk(stderrStream, chunk, "stderr", options.emitLog);
    });
    child.stdout?.on("end", () => {
      emitRemainingChunk(stdoutStream, "stdout", options.emitLog);
    });
    child.stderr?.on("end", () => {
      emitRemainingChunk(stderrStream, "stderr", options.emitLog);
    });
    child.on("error", (error) => {
      if (settled) return;
      if (options.signal?.aborted) {
        settle({ code: c420uiExitCodes.canceled, status: "canceled", message: "Action canceled." });
        return;
      }
      emitOperationalLog(options, {
        source: "action",
        line: `[error] Failed to start ${options.label}: ${error.message}`,
        level: "error"
      });
      options.emitProgress({ state: "failed", label: options.label });
      settle({ code: c420uiExitCodes.generalError, status: "failed", message: error.message });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      closeObserved = true;
      clearCancelKillTimer();
      setImmediate(() => {
        if (settled) return;
        emitRemainingChunk(stdoutStream, "stdout", options.emitLog);
        emitRemainingChunk(stderrStream, "stderr", options.emitLog);
        if (cancellationRequested || options.signal?.aborted || signal === cancelSignal) {
          emitCanceledProgress();
          settle({ code: c420uiExitCodes.canceled, status: "canceled", message: "Action canceled." });
          return;
        }
        const resultCode = code ?? c420uiExitCodes.generalError;
        const success = resultCode === c420uiExitCodes.success;
        if (!success) {
          emitOperationalLog(options, {
            source: "action",
            line: `[error] ${options.label} exited with code ${resultCode}`,
            level: "error"
          });
        }
        options.emitProgress({
          state: success ? "success" : "failed",
          percent: success ? 100 : void 0,
          label: options.label
        });
        settle({
          code: resultCode,
          status: success ? "success" : "failed"
        });
      });
    });
  });
}

// build-resources/c420ui/src/artifacts.ts
import path5 from "node:path";
var artifactCapabilityFields = [
  "supportsArtifacts",
  "supportsInstall",
  "supportsUninstall",
  "supportsPurge",
  "supportsRelease",
  "supportsRootActions",
  "supportsDryRun",
  "supportsPlannedActions"
];
var artifactWorkflowKinds = [
  "appimage",
  "flatpak",
  "tarball",
  "deb",
  "rpm",
  "aur",
  "native",
  "custom"
];
var artifactWorkflowScopes = [
  "user",
  "system",
  "portable",
  "release",
  "none"
];
var artifactActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId",
  "releaseActionId"
];
var executableArtifactActionIdFields = [
  "buildActionId",
  "validateActionId",
  "installActionId",
  "uninstallActionId",
  "purgeActionId"
];
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertRequiredString(value, field, context) {
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string`);
  }
}
function assertOptionalBoolean2(value, field, context) {
  if (value[field] !== void 0 && typeof value[field] !== "boolean") {
    throw new Error(`${context}: ${field} must be a boolean when present`);
  }
}
function assertOptionalString2(value, field, context) {
  if (value[field] !== void 0 && typeof value[field] !== "string") {
    throw new Error(`${context}: ${field} must be a string when present`);
  }
}
function assertOptionalActionId(value, field, context) {
  if (value[field] === void 0) return;
  if (typeof value[field] !== "string" || !value[field].trim()) {
    throw new Error(`${context}: ${field} must be a non-empty string when present`);
  }
}
function assertKnownValue(value, allowedValues, field, context) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${context}: ${field} must be one of ${allowedValues.join(", ")}`);
  }
}
function validateOutputPattern(outputPattern, context) {
  if (outputPattern === void 0) return;
  if (!outputPattern.trim()) {
    throw new Error(`${context}: outputPattern must be non-empty when present`);
  }
  if (outputPattern.includes("x64")) {
    throw new Error(`${context}: outputPattern must not normalize architecture names to x64`);
  }
  if (outputPattern.includes("${arch}")) {
    throw new Error(`${context}: outputPattern must preserve generated architecture globs instead of \${arch}`);
  }
}
function isExecutableArtifactActionField(field) {
  return executableArtifactActionIdFields.includes(field);
}
function isRootManagedArtifactActionField(field) {
  return field === "installActionId" || field === "uninstallActionId" || field === "purgeActionId";
}
function toConfigPath(configPath) {
  return path5.normalize(configPath.replace(/^[\\/]+/, ""));
}
function assertC420UIArtifactRecipeConfig(config, context = "artifact recipe config") {
  if (!isRecord3(config)) throw new Error(`${context}: artifacts config must be an object`);
  if (!isRecord3(config.capabilities)) {
    throw new Error(`${context}: capabilities must be an object`);
  }
  for (const field of artifactCapabilityFields) {
    if (typeof config.capabilities[field] !== "boolean") {
      throw new Error(`${context}: capabilities.${field} must be a boolean`);
    }
  }
  if (!Array.isArray(config.workflows)) {
    throw new Error(`${context}: workflows must be an array`);
  }
  const workflowIds = /* @__PURE__ */ new Set();
  for (const [index, workflow] of config.workflows.entries()) {
    const workflowContext = `${context}: workflows[${index}]`;
    if (!isRecord3(workflow)) throw new Error(`${workflowContext} must be an object`);
    for (const field of ["id", "kind", "label", "scope"]) {
      assertRequiredString(workflow, field, workflowContext);
    }
    const workflowId = workflow.id;
    if (workflowIds.has(workflowId)) {
      throw new Error(`${workflowContext}: duplicate workflow id ${workflowId}`);
    }
    workflowIds.add(workflowId);
    assertKnownValue(workflow.kind, artifactWorkflowKinds, "kind", workflowContext);
    assertKnownValue(workflow.scope, artifactWorkflowScopes, "scope", workflowContext);
    assertOptionalBoolean2(workflow, "planned", workflowContext);
    assertOptionalBoolean2(workflow, "requiresRoot", workflowContext);
    assertOptionalString2(workflow, "description", workflowContext);
    assertOptionalString2(workflow, "outputPattern", workflowContext);
    validateOutputPattern(workflow.outputPattern, workflowContext);
    for (const field of artifactActionIdFields) {
      assertOptionalActionId(workflow, field, workflowContext);
    }
  }
}
function validateC420UIArtifactRecipeConfig(config, context) {
  assertC420UIArtifactRecipeConfig(config, context);
  return config;
}
function validateC420UIArtifactWorkflowsAgainstActions(workflows, actions) {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const workflow of workflows) {
    for (const field of artifactActionIdFields) {
      const actionId = workflow[field];
      if (!actionId) continue;
      const action = actionsById.get(actionId);
      if (!action) {
        throw new Error(`Artifact workflow ${workflow.id} references unknown ${field} ${actionId}`);
      }
      const actionPlanned = isC420UIPlannedAction(action);
      if (workflow.planned === true && actionPlanned !== true) {
        throw new Error(`Artifact workflow ${workflow.id} is planned but ${field} ${actionId} is executable`);
      }
      if (workflow.planned !== true && isExecutableArtifactActionField(field) && actionPlanned) {
        throw new Error(`Artifact workflow ${workflow.id} is executable but ${field} ${actionId} is planned`);
      }
      if (workflow.requiresRoot === true && action.scope === "user") {
        throw new Error(`Artifact workflow ${workflow.id} requires root but ${field} ${actionId} is user-scoped`);
      }
      if (workflow.requiresRoot === false && action.requiresRoot === true) {
        throw new Error(`Artifact workflow ${workflow.id} declares requiresRoot=false but ${field} ${actionId} requires root`);
      }
      if (workflow.scope === "system" && isRootManagedArtifactActionField(field) && action.scope === "user") {
        throw new Error(`Artifact workflow ${workflow.id} is system-scoped but ${field} ${actionId} is user-scoped`);
      }
      if (workflow.scope === "system" && isRootManagedArtifactActionField(field) && action.scope === "system" && action.requiresRoot === false) {
        throw new Error(`Artifact workflow ${workflow.id} is system-scoped but ${field} ${actionId} declares requiresRoot=false`);
      }
    }
  }
}
function resolveC420UIArtifactOutputPattern(outputPattern, values) {
  validateOutputPattern(outputPattern, "artifact outputPattern");
  return toConfigPath(outputPattern.replaceAll("${version}", values.version));
}

// build-resources/c420ui/src/bridge.ts
function createC420UIBridge(bridge) {
  return bridge;
}

// build-resources/c420ui/src/detection.ts
function boolFromC420UIDetectionValue(value) {
  return value === "true";
}

// build-resources/c420ui/src/development-provider.ts
var c420uiDevelopmentTaskKinds = [
  "doctor",
  "validate",
  "build",
  "package",
  "install",
  "uninstall",
  "purge",
  "clean",
  "release",
  "custom"
];
var c420uiDevelopmentTaskRequiredForValues = [
  "development",
  "build",
  "package",
  "release",
  "validation"
];
function isRecord4(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requireString2(value, message) {
  if (typeof value !== "string" || !value.trim()) throw new Error(message);
}
function requireOptionalBoolean2(task, key) {
  if (task[key] !== void 0 && typeof task[key] !== "boolean") {
    throw new Error(`Development task ${key} must be boolean: ${String(task.id)}`);
  }
}
function validateOptionalScope(task) {
  if (task.scope === void 0) return;
  requireString2(task.scope, `Development task scope must be string: ${String(task.id)}`);
  if (!c420uiKnownActionScopes.includes(task.scope)) {
    throw new Error(`Invalid development task scope: ${String(task.id)} -> ${task.scope}`);
  }
}
function validateRequiredFor(task) {
  if (task.requiredFor === void 0) return;
  if (!Array.isArray(task.requiredFor)) {
    throw new Error(`Development task requiredFor must be an array: ${String(task.id)}`);
  }
  for (const value of task.requiredFor) {
    if (typeof value !== "string" || !c420uiDevelopmentTaskRequiredForValues.includes(
      value
    )) {
      throw new Error(`Invalid development task requiredFor: ${String(task.id)} -> ${String(value)}`);
    }
  }
}
function kindToWorkflowPhase(kind) {
  switch (kind) {
    case "doctor":
    case "clean":
    case "custom":
      return "development";
    case "validate":
      return "validation";
    case "build":
      return "build";
    case "package":
      return "package";
    case "install":
      return "install";
    case "uninstall":
      return "uninstall";
    case "purge":
      return "purge";
    case "release":
      return "release";
  }
}
function validateC420UIDevelopmentTasks(tasks) {
  if (!Array.isArray(tasks)) throw new Error("development tasks must be an array");
  const ids = /* @__PURE__ */ new Set();
  for (const item of tasks) {
    if (!isRecord4(item)) throw new Error("Development task entries must be objects");
    requireString2(item.id, "Development task missing id");
    if (ids.has(item.id)) throw new Error(`Duplicate development task id: ${item.id}`);
    ids.add(item.id);
    requireString2(item.label, `Development task missing label: ${item.id}`);
    requireString2(item.kind, `Development task missing kind: ${item.id}`);
    if (!c420uiDevelopmentTaskKinds.includes(item.kind)) {
      throw new Error(`Invalid development task kind: ${item.id} -> ${item.kind}`);
    }
    requireString2(item.actionId, `Development task missing actionId: ${item.id}`);
    if (item.description !== void 0) {
      requireString2(item.description, `Development task description must be string: ${item.id}`);
    }
    validateOptionalScope(item);
    requireOptionalBoolean2(item, "requiresRoot");
    requireOptionalBoolean2(item, "supportsDryRun");
    requireOptionalBoolean2(item, "planned");
    validateRequiredFor(item);
  }
}
function validateC420UIDevelopmentConfig(config) {
  if (!isRecord4(config)) throw new Error("development config must be an object");
  validateC420UIDevelopmentTasks(config.tasks);
}
function supportsDryRunAction(action) {
  if (isC420UIPlannedAction(action)) return false;
  if (action.dryRun === "disabled") return false;
  return action.kind === "command" || action.dryRun === "supported" || action.dryRun === "required";
}
function assertC420UIDevelopmentTaskMatchesAction(task, action) {
  validateC420UIDevelopmentTasks([task]);
  if (task.actionId !== action.id) {
    throw new Error(`Development task ${task.id} actionId does not match action ${action.id}`);
  }
  const plannedAction = isC420UIPlannedAction(action);
  if (task.planned === true && !plannedAction) {
    throw new Error(`Development task ${task.id} is planned but action ${action.id} is executable`);
  }
  if (task.planned !== true && plannedAction) {
    throw new Error(`Development task ${task.id} is executable but action ${action.id} is planned`);
  }
  if (task.requiresRoot !== void 0 && Boolean(task.requiresRoot) !== Boolean(action.requiresRoot)) {
    throw new Error(`Development task ${task.id} requiresRoot contradicts action ${action.id}`);
  }
  if (task.scope !== void 0 && task.scope !== action.scope) {
    throw new Error(`Development task ${task.id} scope contradicts action ${action.id}`);
  }
  if (task.supportsDryRun === true && !supportsDryRunAction(action)) {
    throw new Error(`Development task ${task.id} promises dry-run but action ${action.id} does not support it`);
  }
  const workflowPhase = kindToWorkflowPhase(task.kind);
  if (action.phase !== void 0 && action.phase !== workflowPhase) {
    throw new Error(`Development task ${task.id} phase ${workflowPhase} contradicts action ${action.id} phase ${action.phase}`);
  }
}
function createC420UIDevelopmentWorkflowFromAction(task, action) {
  assertC420UIDevelopmentTaskMatchesAction(task, action);
  const phase = kindToWorkflowPhase(task.kind);
  const workflowAction = {
    ...action,
    phase
  };
  return {
    id: task.id,
    label: task.label || action.label,
    phase,
    actions: [workflowAction],
    requiresRoot: action.requiresRoot,
    supportsDryRun: task.supportsDryRun
  };
}

// build-resources/c420ui/src/terminal/logo.ts
var c420uiLogoLines = [
  "\u2584\u2584  \u2588 \u2588 \u2584\u2584\u2584 \u2584\u2580\u2584  \u2584 \u2584  \u2584",
  "\u2588   \u2580\u2584\u2588  \u2584\u2580 \u2588 \u2588  \u2588 \u2588  \u2588",
  "\u2580\u2580    \u2588 \u2588\u2584\u2584  \u2580   \u2580\u2584\u2580  \u2580"
];

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
import fs11 from "node:fs";
import path11 from "node:path";
import {
  execFileSync
} from "node:child_process";

// build-resources/canva-linux/project-root.ts
import fs5 from "node:fs";
import path6 from "node:path";
function isProjectRoot(dir) {
  return fs5.existsSync(path6.join(dir, "package.json")) && fs5.existsSync(path6.join(dir, "build-resources/canva-linux/config/actions.json")) && fs5.existsSync(path6.join(dir, "build-resources/canva-linux/config/project-ui.json"));
}
function scriptDirFromArgv() {
  const scriptPath = process.argv[1];
  if (!scriptPath) return null;
  return path6.dirname(path6.resolve(scriptPath));
}
function searchUpwards(startDir) {
  let current = path6.resolve(startDir);
  while (true) {
    if (isProjectRoot(current)) return current;
    const parent = path6.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function defaultRootSearchDir() {
  const fromEnv = process.env.CANVA_SCRIPT_REPO_ROOT;
  if (fromEnv) return path6.resolve(fromEnv);
  const fromScript = scriptDirFromArgv();
  if (fromScript) {
    const match = searchUpwards(fromScript);
    if (match) return match;
  }
  return path6.resolve(process.cwd());
}
function findCanvaLinuxProjectRoot(startDir = defaultRootSearchDir()) {
  const fromStart = searchUpwards(startDir);
  if (fromStart) return fromStart;
  return defaultRootSearchDir();
}

// build-resources/canva-linux/c420ui-adapter/detection/artifact-fragments.ts
import fs6 from "node:fs";
import path7 from "node:path";
var ARTIFACTS_CONFIG_PATH = "build-resources/canva-linux/config/artifacts.json";
var ARTIFACT_PATH_COLLATOR = new Intl.Collator(void 0, {
  numeric: true,
  sensitivity: "base"
});
var SUPPORTED_ARTIFACT_PATTERN_EXAMPLES = [
  "*.AppImage",
  "*.flatpak",
  "linux-unpacked",
  "*.tar.gz",
  "SHA256SUMS",
  ".deb",
  ".rpm",
  "PKGBUILD",
  "*.pkg.tar.*"
];
function readJsonFile(filePath) {
  return JSON.parse(fs6.readFileSync(filePath, "utf8"));
}
function readPackageVersion(rootDir2) {
  return readJsonFile(path7.join(rootDir2, "package.json")).version ?? "unknown";
}
function loadArtifactWorkflows(rootDir2) {
  const configPath = path7.join(rootDir2, ARTIFACTS_CONFIG_PATH);
  if (!fs6.existsSync(configPath)) return [];
  const config = readJsonFile(configPath);
  return Array.isArray(config.workflows) ? config.workflows : [];
}
function normalizeConfigPath(configPath) {
  return configPath.split(/[\\/]+/).filter(Boolean).join(path7.sep);
}
function resolveOutputPattern(outputPattern, version) {
  return normalizeConfigPath(outputPattern.replaceAll("${version}", version));
}
function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
function patternToRegExp(pattern) {
  const normalized = normalizeConfigPath(pattern);
  const source = normalized.split("*").map(escapeRegExp).join("[^\\/]*");
  return new RegExp(`^${source}$`);
}
function artifactKind(id, kind) {
  if (id === "linux-unpacked" || id.includes("linux-unpacked")) return "linux-unpacked";
  if (id === "release-checksums") return "sha256sums";
  return kind;
}
function candidatePathsForPattern(rootDir2, outputPattern) {
  const resolvedPattern = normalizeConfigPath(outputPattern);
  if (!resolvedPattern.includes("*")) {
    const absolutePath = path7.join(rootDir2, resolvedPattern);
    return fs6.existsSync(absolutePath) ? [absolutePath] : [];
  }
  const firstWildcard = resolvedPattern.indexOf("*");
  const scanRootRelative = path7.dirname(resolvedPattern.slice(0, firstWildcard));
  const scanRoot = path7.join(rootDir2, scanRootRelative || ".");
  if (!fs6.existsSync(scanRoot)) return [];
  const matcher = patternToRegExp(resolvedPattern);
  const candidates = [];
  for (const entry of fs6.readdirSync(scanRoot, { withFileTypes: true })) {
    const absolutePath = path7.join(scanRoot, entry.name);
    const relativePath = normalizeConfigPath(path7.relative(rootDir2, absolutePath));
    if (matcher.test(relativePath)) candidates.push(absolutePath);
  }
  return candidates.sort(ARTIFACT_PATH_COLLATOR.compare);
}
function readMetadataJson(filePath) {
  try {
    const raw = readJsonFile(filePath);
    return raw && typeof raw === "object" ? raw : void 0;
  } catch {
    return void 0;
  }
}
function firstMetadataVersion(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}
function normalizeMetadata(metadata) {
  if (!metadata) return {};
  const version = firstMetadataVersion(
    metadata.baseVersion,
    metadata.basePhase,
    metadata.version
  );
  const fullVersion = firstMetadataVersion(
    metadata.fullVersion,
    metadata.version,
    metadata.baseVersion,
    metadata.basePhase
  );
  return {
    ...version ? { version } : {},
    ...fullVersion ? { fullVersion } : {}
  };
}
function readVersionSidecar(filePath) {
  const raw = fs6.readFileSync(filePath, "utf8").trim();
  return raw ? { version: raw, fullVersion: raw } : {};
}
function readArtifactPackageJsonVersion(artifactPath) {
  const packageJsonPath = path7.join(artifactPath, "package.json");
  if (!fs6.existsSync(packageJsonPath)) return {};
  const version = readJsonFile(packageJsonPath).version?.trim();
  return version ? { version, fullVersion: version } : {};
}
function readArtifactMetadata(rootDir2, artifactPath, artifactKindValue) {
  const sidecars = [
    `${artifactPath}.build-metadata.json`,
    `${artifactPath}.version.json`,
    `${artifactPath}.version`
  ];
  for (const sidecar of sidecars) {
    if (!fs6.existsSync(sidecar)) continue;
    if (sidecar.endsWith(".json")) return normalizeMetadata(readMetadataJson(sidecar));
    return readVersionSidecar(sidecar);
  }
  if (fs6.existsSync(artifactPath) && fs6.statSync(artifactPath).isDirectory()) {
    const markers = [
      path7.join(artifactPath, "resources/config/canva-linux/build-metadata.json"),
      path7.join(artifactPath, "config/canva-linux/build-metadata.json"),
      ...artifactKindValue === "linux-unpacked" ? [path7.join(rootDir2, "build-resources/canva-linux/config/build-metadata.json")] : []
    ];
    for (const marker of markers) {
      if (fs6.existsSync(marker)) return normalizeMetadata(readMetadataJson(marker));
    }
    return readArtifactPackageJsonVersion(artifactPath);
  }
  return {};
}
function inferVersionFromFilename(artifactPath, packageVersion) {
  const name = path7.basename(artifactPath);
  if (name.includes(packageVersion)) return packageVersion;
  const match = name.match(/^canva-linux-([0-9][^-]*(?:[-+.][A-Za-z0-9.]+)*)-/);
  return match?.[1];
}
function toRelativeArtifactPath(rootDir2, artifactPath) {
  return normalizeConfigPath(path7.relative(rootDir2, artifactPath));
}
function buildCanvaLinuxArtifactFragments(rootDir2) {
  void SUPPORTED_ARTIFACT_PATTERN_EXAMPLES;
  const packageVersion = readPackageVersion(rootDir2);
  const workflows = loadArtifactWorkflows(rootDir2);
  const fragments = [];
  for (const workflow of workflows) {
    if (typeof workflow.id !== "string" || typeof workflow.kind !== "string" || typeof workflow.label !== "string") continue;
    if (typeof workflow.outputPattern !== "string") {
      fragments.push({
        id: workflow.id,
        kind: artifactKind(workflow.id, workflow.kind),
        label: workflow.label,
        detected: false
      });
      continue;
    }
    const outputPattern = resolveOutputPattern(workflow.outputPattern, packageVersion);
    const candidates = candidatePathsForPattern(rootDir2, outputPattern);
    const artifactPath = candidates.at(-1);
    const detected = Boolean(artifactPath);
    const kind = artifactKind(workflow.id, workflow.kind);
    const metadata = artifactPath ? readArtifactMetadata(rootDir2, artifactPath, kind) : {};
    const fallbackVersion = artifactPath && kind !== "linux-unpacked" ? inferVersionFromFilename(artifactPath, packageVersion) : void 0;
    fragments.push({
      id: workflow.id,
      kind,
      label: workflow.label,
      detected,
      ...artifactPath ? { path: toRelativeArtifactPath(rootDir2, artifactPath) } : {},
      ...metadata.version ? { version: metadata.version } : fallbackVersion ? { version: fallbackVersion } : {},
      ...metadata.fullVersion ? { fullVersion: metadata.fullVersion } : {}
    });
  }
  return fragments;
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
import fs8 from "node:fs";
import path8 from "node:path";

// build-resources/c420ui/operations/detection/version-marker.ts
import fs7 from "node:fs";
function readVersionFile(versionFile) {
  if (fs7.existsSync(versionFile)) {
    return fs7.readFileSync(versionFile, "utf8").trim();
  }
  return "";
}
function readPackageJsonVersion(packageFile) {
  if (!fs7.existsSync(packageFile)) return "";
  try {
    const pkg = JSON.parse(fs7.readFileSync(packageFile, "utf8"));
    return pkg.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataFullVersion(metadataFile) {
  if (!fs7.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs7.readFileSync(metadataFile, "utf8"));
    return m.fullVersion || m.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataBaseVersion(metadataFile) {
  if (!fs7.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs7.readFileSync(metadataFile, "utf8"));
    return m.baseVersion || m.basePhase || m.version || "";
  } catch {
    return "";
  }
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
function detectAppImageArtifacts(rootDir2) {
  const distDir = path8.join(rootDir2, "dist");
  if (!fs8.existsSync(distDir)) return false;
  try {
    const files = fs8.readdirSync(distDir);
    return files.some((file) => file.endsWith(".AppImage"));
  } catch {
    return false;
  }
}
function findLatestAppImageArtifact(rootDir2) {
  const distDir = path8.join(rootDir2, "dist");
  if (!fs8.existsSync(distDir)) return "";
  try {
    const files = fs8.readdirSync(distDir).filter((file) => file.endsWith(".AppImage")).sort();
    const latest = files[files.length - 1];
    return latest ? path8.join("dist", latest) : "";
  } catch {
    return "";
  }
}
function findArtifactBuildMetadataMarker(artifactPath, rootDir2) {
  if (!artifactPath) return "";
  const absoluteArtifactPath = path8.isAbsolute(artifactPath) ? artifactPath : path8.join(rootDir2, artifactPath);
  const markers = [
    `${absoluteArtifactPath}.build-metadata.json`,
    `${absoluteArtifactPath}.version.json`,
    `${absoluteArtifactPath}.version`
  ];
  for (const marker of markers) {
    if (fs8.existsSync(marker)) return marker;
  }
  return "";
}
function detectAppImageVersion(rootDir2) {
  const file = findLatestAppImageArtifact(rootDir2);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir2);
  let version = readBuildMetadataBaseVersion(metadata);
  if (version) return version;
  const findMetadataInDist = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs8.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path8.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  const distDir = path8.join(rootDir2, "dist");
  if (fs8.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataBaseVersion(distMetadata);
    if (version) return version;
  }
  if (!file) return "";
  const name = path8.basename(file);
  const match = name.match(
    /^canva-linux-([0-9]+\.[0-9]+\.[0-9]+[-+.a-zA-Z0-9]*)-[^-]+\.AppImage$/
  );
  return match?.[1] ?? "";
}
function detectAppImageFullVersion(rootDir2) {
  const file = findLatestAppImageArtifact(rootDir2);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir2);
  let version = readBuildMetadataFullVersion(metadata);
  if (version) return version;
  const findMetadataInDist = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs8.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path8.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findMetadataInDist(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/resources/config/canva-linux/build-metadata.json")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  const distDir = path8.join(rootDir2, "dist");
  if (fs8.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataFullVersion(distMetadata);
    if (version) return version;
  }
  return detectAppImageVersion(rootDir2);
}

// build-resources/c420ui/operations/detection/flatpak-detection.ts
import fs9 from "node:fs";
import path9 from "node:path";
import os from "node:os";
import { spawnSync as spawnSync4 } from "node:child_process";
var APP_ID = "io.github.coletivo420.canva-linux";
function detectFlatpakSystemInstall() {
  try {
    const result = spawnSync4("flatpak", ["--system", "info", APP_ID], {
      stdio: "ignore"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
function detectFlatpakUserInstall() {
  try {
    const result = spawnSync4("flatpak", ["--user", "info", APP_ID], {
      stdio: "ignore"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
function findFlatpakVersionMarker(scopeRoot) {
  const markerBase = `app/${APP_ID}/current/active/files/share/canva-linux/version`;
  const directPath = path9.join(scopeRoot, markerBase);
  if (fs9.existsSync(directPath)) return directPath;
  const appDir = path9.join(scopeRoot, `app/${APP_ID}`);
  if (!fs9.existsSync(appDir)) return "";
  const findVersionMarker = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs9.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path9.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findVersionMarker(fullPath, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && fullPath.endsWith("/active/files/share/canva-linux/version")) {
          return fullPath;
        }
      }
    } catch {
    }
    return "";
  };
  return findVersionMarker(appDir, 0);
}
function readFlatpakVersionMarkerKey(markerFile, key) {
  if (!fs9.existsSync(markerFile)) return "";
  try {
    const raw = fs9.readFileSync(markerFile, "utf8").trim();
    if (!raw) return "";
    if (raw.includes(`"${key}"`)) {
      const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
      if (match) return match[1] ?? "";
    }
  } catch {
  }
  return "";
}
function readFlatpakVersionMarker(markerFile) {
  if (!fs9.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "version");
  if (version) return version;
  try {
    return fs9.readFileSync(markerFile, "utf8").split("\n")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}
function readFlatpakFullVersionMarker(markerFile) {
  if (!fs9.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "fullVersion");
  if (version) return version;
  return readFlatpakVersionMarker(markerFile);
}
function detectFlatpakSystemVersion() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;
  try {
    const result = spawnSync4(
      "flatpak",
      ["--system", "info", APP_ID, "--show-version"],
      { encoding: "utf8" }
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}
function detectFlatpakUserVersion() {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path9.join(home, ".local/share/flatpak")
  );
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;
  try {
    const result = spawnSync4(
      "flatpak",
      ["--user", "info", APP_ID, "--show-version"],
      { encoding: "utf8" }
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}
function detectFlatpakSystemFullVersion() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;
  return detectFlatpakSystemVersion();
}
function detectFlatpakUserFullVersion() {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path9.join(home, ".local/share/flatpak")
  );
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;
  return detectFlatpakUserVersion();
}

// build-resources/c420ui/operations/detection/native-detection.ts
import fs10 from "node:fs";
import path10 from "node:path";
import os2 from "node:os";
var APP_EXECUTABLE = "canva-linux";
var APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";
function detectNativeSystemInstall() {
  return fs10.existsSync("/opt/canva-linux") || fs10.existsSync(`/usr/local/bin/${APP_EXECUTABLE}`) || fs10.existsSync(`/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`);
}
function detectNativeUserInstall() {
  const home = os2.homedir();
  return fs10.existsSync(path10.join(home, ".local/opt/canva-linux")) || fs10.existsSync(path10.join(home, `.local/bin/${APP_EXECUTABLE}`)) || fs10.existsSync(
    path10.join(home, `.local/share/applications/${APP_NATIVE_DESKTOP_NAME}`)
  );
}
function detectNativeSystemVersion() {
  let version = readBuildMetadataBaseVersion(
    "/opt/canva-linux/config/canva-linux/build-metadata.json"
  );
  if (version) return version;
  version = readVersionFile("/opt/canva-linux/CANVA_LINUX_VERSION");
  if (version) return version;
  return readPackageJsonVersion("/opt/canva-linux/package.json");
}
function detectNativeUserVersion() {
  const home = os2.homedir();
  let version = readBuildMetadataBaseVersion(
    path10.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json")
  );
  if (version) return version;
  version = readVersionFile(
    path10.join(home, ".local/opt/canva-linux/CANVA_LINUX_VERSION")
  );
  if (version) return version;
  return readPackageJsonVersion(
    path10.join(home, ".local/opt/canva-linux/package.json")
  );
}
function detectNativeSystemFullVersion() {
  const version = readBuildMetadataFullVersion(
    "/opt/canva-linux/config/canva-linux/build-metadata.json"
  );
  if (version) return version;
  return detectNativeSystemVersion();
}
function detectNativeUserFullVersion() {
  const home = os2.homedir();
  const version = readBuildMetadataFullVersion(
    path10.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json")
  );
  if (version) return version;
  return detectNativeUserVersion();
}

// build-resources/c420ui/operations/detection/install-detection.ts
function detectInstallations(rootDir2) {
  return {
    DETECTED_NATIVE_SYSTEM: detectNativeSystemInstall(),
    DETECTED_NATIVE_USER: detectNativeUserInstall(),
    DETECTED_FLATPAK_SYSTEM: detectFlatpakSystemInstall(),
    DETECTED_FLATPAK_USER: detectFlatpakUserInstall(),
    DETECTED_APPIMAGE_ARTIFACTS: detectAppImageArtifacts(rootDir2),
    DETECTED_NATIVE_SYSTEM_VERSION: detectNativeSystemVersion(),
    DETECTED_NATIVE_USER_VERSION: detectNativeUserVersion(),
    DETECTED_FLATPAK_SYSTEM_VERSION: detectFlatpakSystemVersion(),
    DETECTED_FLATPAK_USER_VERSION: detectFlatpakUserVersion(),
    DETECTED_APPIMAGE_VERSION: detectAppImageVersion(rootDir2),
    DETECTED_NATIVE_SYSTEM_FULL_VERSION: detectNativeSystemFullVersion(),
    DETECTED_NATIVE_USER_FULL_VERSION: detectNativeUserFullVersion(),
    DETECTED_FLATPAK_SYSTEM_FULL_VERSION: detectFlatpakSystemFullVersion(),
    DETECTED_FLATPAK_USER_FULL_VERSION: detectFlatpakUserFullVersion(),
    DETECTED_APPIMAGE_FULL_VERSION: detectAppImageFullVersion(rootDir2)
  };
}

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
var cachedPackageJson;
function readPackage(rootDir2) {
  if (cachedPackageJson?.rootDir === rootDir2) {
    return cachedPackageJson.packageJson;
  }
  const packageJson = JSON.parse(
    fs11.readFileSync(path11.join(rootDir2, "package.json"), "utf8")
  );
  cachedPackageJson = {
    rootDir: rootDir2,
    packageJson
  };
  return packageJson;
}
function readPackageDependencyVersion(rootDir2, name) {
  const packageJson = readPackage(rootDir2);
  return packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name];
}
function normalizeSemverRange(range) {
  if (!range) return void 0;
  return range.replace(/[\^~><=]/g, "").split(" ")[0];
}
function readNodeVersion(rootDir2) {
  const packageJson = readPackage(rootDir2);
  return normalizeSemverRange(packageJson.engines?.node) ?? process.versions.node;
}
var readNpmVersion = /* @__PURE__ */ (() => {
  let cached;
  let attempted = false;
  return () => {
    if (attempted) {
      return cached;
    }
    attempted = true;
    try {
      cached = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
      return cached;
    } catch {
      return void 0;
    }
  };
})();
var emptyInstallations = {
  nativeSystem: false,
  nativeUser: false,
  flatpakSystem: false,
  flatpakUser: false,
  appImageArtifacts: false,
  nativeSystemVersion: "",
  nativeUserVersion: "",
  flatpakSystemVersion: "",
  flatpakUserVersion: "",
  appImageVersion: "",
  nativeSystemFullVersion: "",
  nativeUserFullVersion: "",
  flatpakSystemFullVersion: "",
  flatpakUserFullVersion: "",
  appImageFullVersion: ""
};
function readPhase(rootDir2) {
  const projectUiPath = path11.join(rootDir2, "build-resources/canva-linux/config/project-ui.json");
  try {
    if (!fs11.existsSync(projectUiPath)) return "unknown";
    const projectUi = JSON.parse(fs11.readFileSync(projectUiPath, "utf8"));
    return projectUi.phase ?? "unknown";
  } catch {
    return "unknown";
  }
}
function safeProjectMetadata(rootDir2) {
  let version = "unknown";
  let phase = "unknown";
  try {
    version = readPackage(rootDir2).version || "unknown";
  } catch {
    version = "unknown";
  }
  try {
    phase = readPhase(rootDir2);
  } catch {
    phase = "unknown";
  }
  return {
    version,
    phase,
    appId: "io.github.coletivo420.canva-linux",
    executable: "canva-linux",
    repository: "https://github.com/coletivo420/canva-linux"
  };
}
function buildInstallations(values, artifactFragments = []) {
  const appImageFragment = artifactFragments.find(
    (fragment) => fragment.kind === "appimage" || fragment.id.includes("appimage")
  );
  return {
    nativeSystem: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_SYSTEM),
    nativeUser: boolFromC420UIDetectionValue(values.DETECTED_NATIVE_USER),
    flatpakSystem: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_SYSTEM),
    flatpakUser: boolFromC420UIDetectionValue(values.DETECTED_FLATPAK_USER),
    appImageArtifacts: appImageFragment?.detected ?? boolFromC420UIDetectionValue(values.DETECTED_APPIMAGE_ARTIFACTS),
    nativeSystemVersion: values.DETECTED_NATIVE_SYSTEM_VERSION || "",
    nativeUserVersion: values.DETECTED_NATIVE_USER_VERSION || "",
    flatpakSystemVersion: values.DETECTED_FLATPAK_SYSTEM_VERSION || "",
    flatpakUserVersion: values.DETECTED_FLATPAK_USER_VERSION || "",
    appImageVersion: appImageFragment?.version || values.DETECTED_APPIMAGE_VERSION || "",
    // Detected Installations renderers should prefer *FullVersion fields and
    // fall back to the base *Version fields for older detectors/markers.
    nativeSystemFullVersion: values.DETECTED_NATIVE_SYSTEM_FULL_VERSION || values.DETECTED_NATIVE_SYSTEM_VERSION || "",
    nativeUserFullVersion: values.DETECTED_NATIVE_USER_FULL_VERSION || values.DETECTED_NATIVE_USER_VERSION || "",
    flatpakSystemFullVersion: values.DETECTED_FLATPAK_SYSTEM_FULL_VERSION || values.DETECTED_FLATPAK_SYSTEM_VERSION || "",
    flatpakUserFullVersion: values.DETECTED_FLATPAK_USER_FULL_VERSION || values.DETECTED_FLATPAK_USER_VERSION || "",
    appImageFullVersion: appImageFragment?.fullVersion || appImageFragment?.version || values.DETECTED_APPIMAGE_FULL_VERSION || values.DETECTED_APPIMAGE_VERSION || ""
  };
}
function createCanvaLinuxDetectionProvider(options = {}) {
  const detect = options.detectInstallations ?? detectInstallations;
  return {
    id: "canva-linux-detection-provider",
    label: "Canva Linux detection provider",
    buildOverviewStatus(rootDir2) {
      const project = safeProjectMetadata(rootDir2);
      const warnings = [];
      let values = {};
      try {
        const result = detect(rootDir2);
        for (const [key, value] of Object.entries(result)) {
          values[key] = String(value);
        }
      } catch (error) {
        warnings.push(
          `Installation detection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const artifactFragments = buildCanvaLinuxArtifactFragments(rootDir2);
      return {
        project,
        runtime: {
          electronVersion: normalizeSemverRange(
            readPackageDependencyVersion(rootDir2, "electron")
          ) ?? "unknown",
          nodeVersion: readNodeVersion(rootDir2),
          npmVersion: readNpmVersion() ?? "unknown"
        },
        installations: {
          ...emptyInstallations,
          ...buildInstallations(values, artifactFragments)
        },
        artifactFragments,
        warnings
      };
    }
  };
}
function buildCanvaLinuxOverviewStatus(rootDir2 = findCanvaLinuxProjectRoot()) {
  return createCanvaLinuxDetectionProvider().buildOverviewStatus(rootDir2);
}

// build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts
import { execFileSync as execFileSync2 } from "node:child_process";
import fs13 from "node:fs";
import path13 from "node:path";

// build-resources/electron/main/build-metadata.ts
var build_metadata_exports = {};
__export(build_metadata_exports, {
  appendBuildRevision: () => appendBuildRevision,
  createBuildMetadata: () => createBuildMetadata,
  fallbackBaseMetadata: () => fallbackBaseMetadata,
  formatCanvaLinuxVersion: () => formatCanvaLinuxVersion,
  loadCanvaLinuxBuildMetadata: () => loadCanvaLinuxBuildMetadata,
  normalizeBuildRevision: () => normalizeBuildRevision,
  normalizeLoadedBuildMetadata: () => normalizeLoadedBuildMetadata
});
import fs12 from "node:fs";
import path12 from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
var UNKNOWN_BASE_VERSION = "0.0.0";
var UNKNOWN_DISPLAY_VERSION = "0.0.0";
var UNKNOWN_BUILD_REVISION = "unknown";
var UNKNOWN_SOURCE_HASH = "unknown";
var RUNTIME_DIR = path12.dirname(fileURLToPath(import.meta.url));
function combineSourceHashes(canvaLinuxHash, c420uiHash) {
  const left = canvaLinuxHash || UNKNOWN_SOURCE_HASH;
  const right = c420uiHash || UNKNOWN_SOURCE_HASH;
  const hash = crypto.createHash("sha256");
  hash.update("canva-linux");
  hash.update("\0");
  hash.update(left);
  hash.update("\0");
  hash.update("c420ui");
  hash.update("\0");
  hash.update(right);
  return `sha256:${hash.digest("hex")}`;
}
function normalizeBuildRevision(input) {
  if (!input) return "unknown";
  const trimmed = input.trim();
  if (!trimmed || trimmed === "unknown") return "unknown";
  const withoutPrefix = trimmed.replace(/^g/i, "");
  const shortHash = withoutPrefix.slice(0, 7);
  return `g${shortHash}`;
}
function appendBuildRevision(base, buildRevision) {
  return buildRevision && buildRevision !== "unknown" ? `${base}+${buildRevision}` : base;
}
function createBuildMetadata(input) {
  const buildRevision = normalizeBuildRevision(input.buildRevision);
  const canvaLinuxSourceHash = input.canvaLinuxSourceHash || UNKNOWN_SOURCE_HASH;
  const c420uiSourceHash = input.c420uiSourceHash || UNKNOWN_SOURCE_HASH;
  return {
    baseVersion: input.baseVersion,
    baseDisplayVersion: input.baseDisplayVersion,
    basePhase: input.basePhase,
    buildRevision,
    canvaLinuxSourceHash,
    c420uiSourceHash,
    combinedSourceHash: input.combinedSourceHash || combineSourceHashes(canvaLinuxSourceHash, c420uiSourceHash),
    version: appendBuildRevision(input.baseVersion, buildRevision),
    displayVersion: appendBuildRevision(input.baseDisplayVersion, buildRevision),
    phase: appendBuildRevision(input.basePhase, buildRevision),
    fullVersion: appendBuildRevision(input.basePhase, buildRevision)
  };
}
function readJsonFile2(filePath) {
  try {
    return JSON.parse(fs12.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function candidateMetadataPaths() {
  const cwd = process.cwd();
  return [
    path12.join(cwd, ".build", "canva-linux", "build-metadata.effective.json"),
    path12.join(cwd, "build-resources", "canva-linux", "config", "build-metadata.json"),
    path12.join(RUNTIME_DIR, "..", "..", ".build", "canva-linux", "build-metadata.effective.json"),
    path12.join(RUNTIME_DIR, "..", "..", "build-resources", "canva-linux", "config", "build-metadata.json"),
    path12.join(RUNTIME_DIR, "..", ".build", "canva-linux", "build-metadata.effective.json"),
    path12.join(RUNTIME_DIR, "..", "build-resources", "canva-linux", "config", "build-metadata.json")
  ];
}
function fallbackBaseMetadata() {
  const packageJson = readJsonFile2(path12.join(process.cwd(), "package.json")) ?? {};
  const projectUi = readJsonFile2(
    path12.join(
      process.cwd(),
      "build-resources",
      "canva-linux",
      "config",
      "project-ui.json"
    )
  ) ?? {};
  const baseVersion = packageJson.version || UNKNOWN_BASE_VERSION;
  const baseDisplayVersion = projectUi.displayVersion || UNKNOWN_DISPLAY_VERSION;
  const basePhase = projectUi.phase || baseVersion;
  return createBuildMetadata({
    baseVersion,
    baseDisplayVersion,
    basePhase,
    buildRevision: UNKNOWN_BUILD_REVISION,
    canvaLinuxSourceHash: UNKNOWN_SOURCE_HASH,
    c420uiSourceHash: UNKNOWN_SOURCE_HASH,
    combinedSourceHash: UNKNOWN_SOURCE_HASH
  });
}
function normalizeLoadedBuildMetadata(metadata) {
  if (!metadata.baseVersion || !metadata.baseDisplayVersion || !metadata.basePhase) {
    return null;
  }
  return createBuildMetadata({
    baseVersion: metadata.baseVersion,
    baseDisplayVersion: metadata.baseDisplayVersion,
    basePhase: metadata.basePhase,
    buildRevision: metadata.buildRevision || UNKNOWN_BUILD_REVISION,
    canvaLinuxSourceHash: metadata.canvaLinuxSourceHash || UNKNOWN_SOURCE_HASH,
    c420uiSourceHash: metadata.c420uiSourceHash || UNKNOWN_SOURCE_HASH,
    combinedSourceHash: metadata.combinedSourceHash || UNKNOWN_SOURCE_HASH
  });
}
function loadCanvaLinuxBuildMetadata() {
  for (const filePath of candidateMetadataPaths()) {
    const metadata = readJsonFile2(filePath);
    const normalized = metadata ? normalizeLoadedBuildMetadata(metadata) : null;
    if (normalized) return normalized;
  }
  return fallbackBaseMetadata();
}
function formatCanvaLinuxVersion(metadata) {
  return `Canva Linux ${metadata.version}`;
}

// build-resources/canva-linux/c420ui-adapter/build-metadata-loader.ts
var UNKNOWN_BASE_VERSION2 = "0.0.0";
var UNKNOWN_BUILD_REVISION2 = "unknown";
function readJsonFile3(filePath) {
  try {
    return JSON.parse(fs13.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir2) {
  return fs13.existsSync(path13.join(rootDir2, ".git"));
}
function resolveEnvBuildRevision() {
  for (const key of [
    "CANVA_LINUX_BUILD_REVISION",
    "GITHUB_SHA",
    "CI_COMMIT_SHA",
    "SOURCE_COMMIT"
  ]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}
function resolveGitBuildRevision(rootDir2) {
  if (!hasGitRepository(rootDir2)) return null;
  try {
    const value = execFileSync2("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: rootDir2,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return value || null;
  } catch {
    return null;
  }
}
function createSourceMetadata(rootDir2, buildRevision, metadataModule) {
  const packageJson = readJsonFile3(path13.join(rootDir2, "package.json"));
  const projectUi = readJsonFile3(
    path13.join(rootDir2, "build-resources", "canva-linux", "config", "project-ui.json")
  );
  if (!packageJson?.version || !projectUi?.displayVersion || !projectUi?.phase) {
    return null;
  }
  return metadataModule.createBuildMetadata({
    baseVersion: packageJson.version,
    baseDisplayVersion: projectUi.displayVersion,
    basePhase: projectUi.phase,
    buildRevision
  });
}
function loadPackagedMetadata(rootDir2, metadataModule) {
  const metadata = readJsonFile3(
    path13.join(rootDir2, "build-resources", "canva-linux", "config", "build-metadata.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function loadEffectiveFileMetadata(rootDir2, metadataModule) {
  const metadata = readJsonFile3(
    path13.join(rootDir2, ".build", "canva-linux", "build-metadata.effective.json")
  );
  if (!metadata) return null;
  return metadataModule.normalizeLoadedBuildMetadata(metadata);
}
function fallbackEffectiveBuildMetadata(rootDir2 = process.cwd(), metadataModule) {
  const module = metadataModule ?? build_metadata_exports;
  return module.createBuildMetadata({
    baseVersion: UNKNOWN_BASE_VERSION2,
    baseDisplayVersion: UNKNOWN_BASE_VERSION2,
    basePhase: UNKNOWN_BASE_VERSION2,
    buildRevision: UNKNOWN_BUILD_REVISION2
  });
}
function loadEffectiveBuildMetadata(rootDir2) {
  const resolvedRootDir = path13.resolve(rootDir2);
  const metadataModule = build_metadata_exports;
  const effective = loadEffectiveFileMetadata(resolvedRootDir, metadataModule);
  if (effective) return effective;
  const envRevision = resolveEnvBuildRevision();
  if (envRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, envRevision, metadataModule);
    if (sourceMetadata) return sourceMetadata;
  }
  const gitRevision = resolveGitBuildRevision(resolvedRootDir);
  if (gitRevision) {
    const sourceMetadata = createSourceMetadata(resolvedRootDir, gitRevision, metadataModule);
    if (sourceMetadata) return sourceMetadata;
  }
  return loadPackagedMetadata(resolvedRootDir, metadataModule) ?? fallbackEffectiveBuildMetadata(resolvedRootDir, metadataModule);
}

// build-resources/canva-linux/c420ui-adapter/artifacts.ts
import fs15 from "node:fs";
import path15 from "node:path";

// build-resources/canva-linux/actions/registry.ts
import fs14 from "node:fs";
import path14 from "node:path";
var ACTION_GROUPS = ["install", "development", "maintenance"];
var ACTION_SECTIONS = [
  "Install",
  "Package generation",
  "Build",
  "Validation",
  "Maintenance",
  "Uninstall"
];
var ACTION_KINDS = ["command", "planned"];
var INSTALL_SCOPES = ["system", "user"];
var cachedRoot = null;
var cachedActions = null;
function findProjectRoot(startDir) {
  return findCanvaLinuxProjectRoot(startDir);
}
function actionsPath(rootDir2 = findProjectRoot()) {
  return path14.join(rootDir2, "build-resources/canva-linux/config/actions.json");
}
function validateCanvaLinuxGroupSection(action) {
  if (action.group === "install" && action.section !== "Install") {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
  if (action.group === "development" && !["Package generation", "Build", "Validation"].includes(action.section)) {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
  if (action.group === "maintenance" && !["Maintenance", "Uninstall"].includes(action.section)) {
    throw new Error(`Group/section mismatch: ${action.id}`);
  }
}
function validateCanvaLinuxActions(actions) {
  validateC420UIActionRegistry(actions, {
    allowedGroups: ACTION_GROUPS,
    allowedSections: ACTION_SECTIONS,
    allowedKinds: ACTION_KINDS,
    allowedScopes: INSTALL_SCOPES
  });
  for (const action of actions) {
    validateCanvaLinuxGroupSection(action);
  }
}
function loadCanvaLinuxActionRegistry(rootDir2 = findProjectRoot()) {
  const resolvedRoot = path14.resolve(rootDir2);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(
    fs14.readFileSync(actionsPath(resolvedRoot), "utf8")
  );
  validateCanvaLinuxActions(actions);
  cachedRoot = resolvedRoot;
  cachedActions = actions;
  return actions;
}
function loadCanvaLinuxActions(rootDir2 = findProjectRoot()) {
  return loadCanvaLinuxActionRegistry(rootDir2);
}

// build-resources/canva-linux/c420ui-adapter/actions.ts
function actionPhase(action) {
  if (action.phase) return action.phase;
  if (action.group === "install") return "install";
  if (action.group === "maintenance") return void 0;
  return void 0;
}
function toC420UIActionDescriptor(action) {
  const isCommandAction = action.kind === "command";
  const kind = isCommandAction ? "command" : "planned";
  return {
    ...action,
    kind,
    phase: actionPhase(action),
    cliFlags: action.cli
  };
}
function loadCanvaLinuxC420UIActions(rootDir2) {
  return loadCanvaLinuxActions(rootDir2).map(toC420UIActionDescriptor);
}

// build-resources/canva-linux/c420ui-adapter/artifacts.ts
var ARTIFACTS_CONFIG_PATH2 = "build-resources/canva-linux/config/artifacts.json";
function readJsonFile4(filePath) {
  if (!fs15.existsSync(filePath)) {
    throw new Error(`Missing Canva Linux configuration file: ${filePath}`);
  }
  try {
    return JSON.parse(fs15.readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse configuration file ${filePath}: ${message}`);
  }
}
var cachedArtifactsConfig = null;
var cachedArtifactsConfigPath = null;
function loadArtifactsConfig(rootDir2) {
  const configPath = path15.join(rootDir2, ARTIFACTS_CONFIG_PATH2);
  if (cachedArtifactsConfig && cachedArtifactsConfigPath === configPath) {
    return cachedArtifactsConfig;
  }
  const config = readJsonFile4(configPath);
  cachedArtifactsConfig = validateC420UIArtifactRecipeConfig(config, configPath);
  cachedArtifactsConfigPath = configPath;
  return cachedArtifactsConfig;
}
function loadCanvaLinuxCapabilities(rootDir2 = process.env.CANVA_SCRIPT_REPO_ROOT ?? process.cwd()) {
  return { ...loadArtifactsConfig(rootDir2).capabilities };
}
function loadCanvaLinuxArtifactWorkflows(rootDir2, version) {
  const config = loadArtifactsConfig(rootDir2);
  validateC420UIArtifactWorkflowsAgainstActions(
    config.workflows,
    loadCanvaLinuxC420UIActions(rootDir2)
  );
  return config.workflows.map((workflow) => ({
    ...workflow,
    outputPattern: workflow.outputPattern ? resolveC420UIArtifactOutputPattern(workflow.outputPattern, { version }) : void 0
  }));
}

// build-resources/canva-linux/c420ui-adapter/development.ts
import fs16 from "node:fs";
import path16 from "node:path";
function readJsonFile5(filePath) {
  return JSON.parse(fs16.readFileSync(filePath, "utf8"));
}
function loadCanvaLinuxDevelopmentTasks(rootDir2) {
  const developmentConfigPath = path16.join(
    rootDir2,
    "build-resources/canva-linux/config/development.json"
  );
  const config = readJsonFile5(developmentConfigPath);
  validateC420UIDevelopmentConfig(config);
  return config.tasks;
}
function validateCanvaLinuxDevelopmentTasksAgainstActions(tasks, actions) {
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  for (const task of tasks) {
    const action = actionsById.get(task.actionId);
    if (!action) {
      throw new Error(`Development task ${task.id} references unknown actionId ${task.actionId}`);
    }
    createC420UIDevelopmentWorkflowFromAction(task, action);
  }
}
function loadCanvaLinuxDevelopmentWorkflows(rootDir2, actions = loadCanvaLinuxC420UIActions(rootDir2)) {
  const tasks = loadCanvaLinuxDevelopmentTasks(rootDir2);
  validateCanvaLinuxDevelopmentTasksAgainstActions(tasks, actions);
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  return tasks.map((task) => {
    const action = actionsById.get(task.actionId);
    if (!action) {
      throw new Error(`Development task ${task.id} references unknown actionId ${task.actionId}`);
    }
    return createC420UIDevelopmentWorkflowFromAction(task, action);
  });
}

// build-resources/canva-linux/c420ui-adapter/adapter.ts
function readJsonFile6(filePath) {
  return JSON.parse(fs17.readFileSync(filePath, "utf8"));
}
function readAppIdentity(identityPath) {
  try {
    const identity = readJsonFile6(identityPath);
    return {
      projectDisplayVersion: identity.displayVersion,
      projectPhase: identity.phase
    };
  } catch {
    return {};
  }
}
function stateHome() {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) return xdgStateHome;
  return path17.join(process.env.HOME || ".", ".local/state");
}
function createCanvaLinuxC420UIAdapter(rootDir2) {
  const resolvedRootDir = path17.resolve(rootDir2);
  const projectUiPath = path17.join(resolvedRootDir, "build-resources/canva-linux/config/project-ui.json");
  const packageJsonPath = path17.join(resolvedRootDir, "package.json");
  const actionsJsonPath = path17.join(resolvedRootDir, "build-resources/canva-linux/config/actions.json");
  const artifactsJsonPath = path17.join(resolvedRootDir, "build-resources/canva-linux/config/artifacts.json");
  const appIdentityPath = path17.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/project-ui.json"
  );
  const buildMetadataPath = path17.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/build-metadata.json"
  );
  const c420uiPackageJsonPath = path17.join(
    resolvedRootDir,
    "build-resources/c420ui/package.json"
  );
  function loadProjectUi() {
    return readJsonFile6(projectUiPath);
  }
  function loadPackageJson() {
    return readJsonFile6(packageJsonPath);
  }
  function loadAppIdentity() {
    return readAppIdentity(appIdentityPath);
  }
  function loadBuildMetadata() {
    return loadEffectiveBuildMetadata(resolvedRootDir);
  }
  function loadC420UIPackageJson() {
    return readJsonFile6(c420uiPackageJsonPath);
  }
  function getPackageVersion() {
    return loadPackageJson().version ?? "unknown";
  }
  function getProjectPhase() {
    const fromEnv = process.env.CANVA_PROJECT_PHASE?.trim();
    if (fromEnv) return fromEnv;
    const identity = loadAppIdentity();
    if (identity.projectPhase) return identity.projectPhase;
    return loadProjectUi().phase || "unknown";
  }
  function getEffectiveProjectDisplayVersion() {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.displayVersion) return buildMetadata.displayVersion;
    const projectUi = loadProjectUi();
    if (projectUi.displayVersion) return projectUi.displayVersion;
    return getPackageVersion();
  }
  function getEffectiveProjectPhase() {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.phase) return buildMetadata.phase;
    return getProjectPhase();
  }
  function getEffectiveProjectFullVersion() {
    const buildMetadata = loadBuildMetadata();
    if (buildMetadata.fullVersion) return buildMetadata.fullVersion;
    if (buildMetadata.version) return buildMetadata.version;
    return getPackageVersion();
  }
  function getEffectiveProjectBuildRevision() {
    return loadBuildMetadata().buildRevision || "unknown";
  }
  function loadProjectConfig() {
    const projectUi = loadProjectUi();
    return {
      projectName: projectUi.projectName,
      projectSubtitle: projectUi.projectSubtitle,
      displayVersion: getEffectiveProjectDisplayVersion(),
      phase: getEffectiveProjectPhase(),
      fullVersion: getEffectiveProjectFullVersion(),
      buildRevision: getEffectiveProjectBuildRevision(),
      status: projectUi.status,
      logoLines: [...projectUi.logoLines],
      appId: projectUi.appId,
      executableName: projectUi.executableName,
      repositoryUrl: projectUi.repositoryUrl,
      launcherCommand: projectUi.launcherCommand,
      stateDirectoryName: projectUi.stateDirectoryName
    };
  }
  function loadBrandConfig() {
    return {
      name: "c420ui",
      version: loadC420UIPackageJson().version ?? "unknown",
      logoLines: [...c420uiLogoLines]
    };
  }
  function getSessionLogPath() {
    const fromEnv = process.env.CANVA_TOOL_SESSION_LOG?.trim();
    if (fromEnv) return fromEnv;
    return path17.join(
      stateHome(),
      loadProjectUi().stateDirectoryName,
      "tool-session.log"
    );
  }
  function getSessionId() {
    return process.env.CANVA_TOOL_SESSION_ID?.trim() || "";
  }
  function getToolSettingsPath() {
    return toolSettingsPath(loadProjectUi().stateDirectoryName);
  }
  function loadCanvaLinuxActions2() {
    if (!fs17.existsSync(actionsJsonPath)) {
      throw new Error(`Missing Canva Linux actions registry: ${actionsJsonPath}`);
    }
    return loadCanvaLinuxC420UIActions(resolvedRootDir);
  }
  function loadArtifactWorkflows2() {
    return loadCanvaLinuxArtifactWorkflows(
      resolvedRootDir,
      getPackageVersion()
    );
  }
  function loadWorkflows() {
    return loadCanvaLinuxDevelopmentWorkflows(resolvedRootDir);
  }
  function projectInfo() {
    const project = loadProjectConfig();
    return {
      projectName: project.projectName,
      projectSubtitle: project.projectSubtitle,
      displayVersion: project.fullVersion ?? getEffectiveProjectFullVersion(),
      phase: project.phase,
      fullVersion: project.fullVersion,
      buildRevision: project.buildRevision,
      status: project.status,
      appId: project.appId,
      repositoryUrl: project.repositoryUrl
    };
  }
  function actions() {
    return loadCanvaLinuxActions2();
  }
  function artifactWorkflows() {
    return loadArtifactWorkflows2();
  }
  function overviewStatus() {
    return buildCanvaLinuxOverviewStatus(resolvedRootDir);
  }
  async function runAction(actionId, context) {
    const action = loadCanvaLinuxActions2().find((item) => item.id === actionId);
    if (!action) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `Unknown action: ${actionId}`
      };
    }
    if (!action.command) {
      return {
        code: c420uiExitCodes.invalidUsage,
        status: "failed",
        message: `${actionId} has no command`
      };
    }
    if (context.signal?.aborted) {
      context.emitProgress({ state: "canceled", percent: 0, label: action.label });
      return {
        code: c420uiExitCodes.canceled,
        status: "canceled",
        message: "Action canceled before start."
      };
    }
    return runC420UICommand({
      command: action.command,
      args: action.args ?? [],
      cwd: resolvedRootDir,
      env: context.env,
      label: action.label,
      signal: context.signal,
      emitLog: context.emitLog,
      emitProgress: context.emitProgress
    });
  }
  function toC420UIConfig() {
    const projectUi = loadProjectUi();
    return {
      rootDir: resolvedRootDir,
      title: projectUi.c420uiTitle,
      brand: loadBrandConfig(),
      project: loadProjectConfig(),
      releaseNotes: projectUi.versionReleaseNotes,
      sessionLogPath: getSessionLogPath(),
      sessionId: getSessionId()
    };
  }
  const adapter = {
    id: "canva-linux",
    rootDir: resolvedRootDir,
    projectInfo,
    actions,
    artifactWorkflows,
    runAction,
    overviewStatus,
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      artifactsJson: artifactsJsonPath,
      appIdentity: appIdentityPath,
      buildMetadata: buildMetadataPath,
      c420uiPackageJson: c420uiPackageJsonPath
    },
    loadProjectInfo: loadProjectConfig,
    loadConfig: toC420UIConfig,
    loadProjectUi,
    loadPackageJson,
    loadAppIdentity,
    loadBuildMetadata,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions2,
    loadArtifactWorkflows: loadArtifactWorkflows2,
    loadWorkflows,
    loadCapabilities: () => loadCanvaLinuxCapabilities(resolvedRootDir),
    getProjectPhase,
    getEffectiveProjectDisplayVersion,
    getEffectiveProjectPhase,
    getEffectiveProjectFullVersion,
    getEffectiveProjectBuildRevision,
    getSessionLogPath,
    getSessionId,
    getToolSettingsPath,
    toC420UIConfig
  };
  return createC420UIBridge(adapter);
}

// build-resources/canva-linux/c420ui-adapter/dependencies.ts
import fs18 from "node:fs";
import path18 from "node:path";
function loadCanvaLinuxDependencyConfig(rootDir2) {
  const relativeConfigPath = "build-resources/canva-linux/config/dependencies.json";
  const configPath = path18.join(rootDir2, relativeConfigPath);
  return validateC420UIHostDependencyConfig(JSON.parse(fs18.readFileSync(configPath, "utf8")));
}
function ensureCanvaLinuxHostDependencies(options) {
  return runC420UIHostDependencyEnsure(loadCanvaLinuxDependencyConfig(options.rootDir), options);
}

// build-resources/canva-linux/c420ui-adapter/root-provider.ts
var conditionalSystemRootActionIds = /* @__PURE__ */ new Set([
  "purge",
  "uninstall-detected"
]);
function buildCanvaLinuxRootActionEnvironment(action, baseEnv) {
  const env = {
    ...baseEnv,
    ...action.env || {}
  };
  if (env.CANVA_NATIVE_SCOPE === "user" || env.CANVA_FLATPAK_SCOPE === "user") {
    env.C420UI_ACTION_SCOPE = "user";
  } else if (env.CANVA_NATIVE_SCOPE === "system" || env.CANVA_FLATPAK_SCOPE === "system" || action.scope === "system") {
    env.C420UI_ACTION_SCOPE = "system";
  } else if (action.scope) {
    env.C420UI_ACTION_SCOPE = action.scope;
  }
  return env;
}
function hasCanvaLinuxUserScope(action, actionEnv) {
  return isC420UIUserScope(action.scope) || actionEnv.CANVA_NATIVE_SCOPE === "user" || actionEnv.CANVA_FLATPAK_SCOPE === "user";
}
function createCanvaLinuxRootProvider(options = {}) {
  const base = createC420UILinuxRootProviderBase({
    id: "canva-linux-root-provider",
    label: "Canva Linux root provider",
    sudoCommand: "sudo",
    rootAuthEnvKey: "C420UI_ROOT_AUTH",
    rootAuthEnvValue: "1",
    runCommand: options.runCommand,
    buildActionEnvironment: buildCanvaLinuxRootActionEnvironment,
    actionHasUserScope: hasCanvaLinuxUserScope
  });
  return {
    ...base,
    resolveRootPolicy(action, rootDir2, actionEnv) {
      void actionEnv;
      if (action.requiresRoot === true) {
        return { requiresRoot: true, reason: `${action.id}: requiresRoot=true` };
      }
      if (conditionalSystemRootActionIds.has(action.id)) {
        try {
          const status = buildCanvaLinuxOverviewStatus(rootDir2);
          if (status.installations.nativeSystem || status.installations.flatpakSystem) {
            return {
              requiresRoot: true,
              reason: `${action.id}: detected system installation`
            };
          }
          if (status.warnings.length) {
            return {
              requiresRoot: false,
              warning: `[warn] Unable to detect system installations for root policy: ${status.warnings.join("; ")}`
            };
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            requiresRoot: false,
            warning: `[warn] Unable to detect system installations for root policy: ${message}`
          };
        }
      }
      return { requiresRoot: false };
    }
  };
}

// build-resources/canva-linux/c420ui-adapter/run.ts
function runCanvaLinuxC420UI(options = {}) {
  const rootDir2 = options.rootDir ?? process.cwd();
  const argv = options.argv ?? process.argv.slice(2);
  const adapter = createCanvaLinuxC420UIAdapter(rootDir2);
  const config = adapter.toC420UIConfig();
  if (argv.includes("--help")) {
    printC420UITerminalHelp({
      config,
      launcherCommand: config.project.launcherCommand
    });
    return;
  }
  runC420UITerminalApp({
    config,
    bridge: adapter,
    rootProvider: createCanvaLinuxRootProvider(),
    startupTasks: [
      {
        id: "host-dependencies",
        label: "Checking dependent project dependencies",
        run: () => ensureCanvaLinuxHostDependencies({
          rootDir: rootDir2,
          env: options.env
        })
      }
    ]
  });
}

// build-resources/c420ui/scripts/run-c420ui.ts
var rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
process.chdir(rootDir);
async function main() {
  const argv = process.argv.slice(2);
  runCanvaLinuxC420UI({
    rootDir,
    argv,
    env: process.env
  });
}
var argv1 = (process.argv[1] || "").replace(/\\/g, "/");
if (argv1 && import.meta.url.endsWith(argv1) || /run-c420ui\.(mjs|js|ts)$/.test(argv1)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
export {
  main
};
