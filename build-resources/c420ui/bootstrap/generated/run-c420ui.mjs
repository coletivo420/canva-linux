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
function formatShortHash(hash, version) {
  void version;
  if (!hash) return "";
  if (hash === "unknown") return " \xB7 unknown";
  const parts = hash.split(":");
  const algo = parts.length > 1 ? `${parts[0]}:` : "";
  const value = (parts.length > 1 ? parts[1] : parts[0]) || "";
  return ` \xB7 ${algo}${value.slice(0, 8)}`;
}
function artifactVersion(fragment) {
  return fragment.fullVersion || fragment.version;
}
function formatDetectedStatus(colors2, detected, version, hash) {
  if (!detected) {
    return `{${colors2.statusNotDetected}-fg}not detected{/${colors2.statusNotDetected}-fg}`;
  }
  return typeof version === "string" && version.trim() ? `v${version.trim().replace(/^v/, "")}${formatShortHash(hash, version)}` : "version unknown";
}
function formatArtifactLine(fragment, colors2) {
  return `  ${fragment.label}: ${formatDetectedStatus(colors2, fragment.detected, artifactVersion(fragment), fragment.hash)}`;
}
function isGeneratedArtifactFragment(fragment) {
  if (fragment.kind === "linux-unpacked" || fragment.id === "linux-unpacked") return false;
  if (fragment.kind === "native" || fragment.id === "native-system" || fragment.id === "native-user") return false;
  return GENERATED_ARTIFACT_KINDS.has(fragment.kind) || GENERATED_ARTIFACT_KINDS.has(fragment.id);
}
function versionSummaryItem(label, version, hash) {
  return `${label} ${version ? `v${version.trim().replace(/^v/, "")}${formatShortHash(hash, version)}` : "unknown"}`;
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
      detectedVersion(i.appImageFullVersion, i.appImageVersion),
      i.appImageHash
    )}`
  ];
  return {
    detectedInstallations: [
      `  Native System: ${formatDetectedStatus(colors2, Boolean(i.nativeSystem), detectedVersion(i.nativeSystemFullVersion, i.nativeSystemVersion), i.nativeSystemHash)}`,
      `  Native User: ${formatDetectedStatus(colors2, Boolean(i.nativeUser), detectedVersion(i.nativeUserFullVersion, i.nativeUserVersion), i.nativeUserHash)}`,
      `  Flatpak System: ${formatDetectedStatus(colors2, Boolean(i.flatpakSystem), detectedVersion(i.flatpakSystemFullVersion, i.flatpakSystemVersion), i.flatpakSystemHash)}`,
      `  Flatpak User: ${formatDetectedStatus(colors2, Boolean(i.flatpakUser), detectedVersion(i.flatpakUserFullVersion, i.flatpakUserVersion), i.flatpakUserHash)}`
    ],
    generatedArtifacts,
    linuxArtifacts: [
      [
        versionSummaryItem("Electron", s.runtime?.electronVersion),
        versionSummaryItem("Node", s.runtime?.nodeVersion),
        versionSummaryItem("npm", s.runtime?.npmVersion),
        versionSummaryItem(
          "Linux unpacked",
          linuxUnpacked ? artifactVersion(linuxUnpacked) : void 0,
          linuxUnpacked?.hash
        )
      ].join(", ")
    ]
  };
}

// build-resources/c420ui/src/terminal/settings.ts
import path from "node:path";
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
function assertOptionalBoolean(value, key, failures, path18) {
  if (key in value && typeof value[key] !== "boolean") {
    failures.push(`${path18}.${key} must be a boolean`);
  }
}
function assertOptionalString(value, key, failures, path18) {
  if (key in value && typeof value[key] !== "string") {
    failures.push(`${path18}.${key} must be a string`);
  }
}
function assertOptionalStringArray(value, key, failures, path18) {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some((item) => typeof item !== "string")) {
    failures.push(`${path18}.${key} must be a string array`);
  }
}
function assertOptionalPurposeArray(value, key, failures, path18) {
  if (!(key in value)) return;
  const array = value[key];
  if (!Array.isArray(array) || array.some(
    (item) => typeof item !== "string" || !c420uiKnownHostDependencyPurposes.includes(item)
  )) {
    failures.push(`${path18}.${key} must contain only known host dependency purposes`);
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
var PANEL_VERTICAL_FRAME_ROWS = 2;
var DETECTED_INSTALLATION_ROWS = 4;
var DETECTED_INSTALLATIONS_MIN_HEIGHT = DETECTED_INSTALLATION_ROWS + PANEL_VERTICAL_FRAME_ROWS;

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

// build-resources/c420ui/src/rust-tui-runner.ts
import { spawn } from "node:child_process";
import fs from "node:fs";
import path2 from "node:path";
import { StringDecoder } from "node:string_decoder";

// build-resources/c420ui/src/rust-tui-contracts.ts
function createC420UITuiRenderInput(options) {
  const { config } = options;
  const input = {
    brand: {
      name: requireNonEmpty(config.brand.name, "brand.name"),
      version: requireNonEmpty(config.brand.version, "brand.version"),
      hash: optionalNonEmpty(config.brand.hash),
      logoLines: config.brand.logoLines
    },
    project: {
      name: requireNonEmpty(config.project.projectName, "project.name"),
      subtitle: requireNonEmpty(
        config.project.projectSubtitle,
        "project.subtitle"
      ),
      version: requireNonEmpty(
        config.project.fullVersion ?? config.project.displayVersion,
        "project.version"
      ),
      displayVersion: requireNonEmpty(
        config.project.displayVersion,
        "project.displayVersion"
      ),
      phase: optionalNonEmpty(config.project.phase),
      hash: optionalNonEmpty(config.project.hash),
      logoLines: config.project.logoLines,
      releaseNotes: config.releaseNotes,
      appId: requireNonEmpty(config.project.appId, "project.appId"),
      executableName: requireNonEmpty(
        config.project.executableName,
        "project.executableName"
      ),
      repositoryUrl: requireNonEmpty(
        config.project.repositoryUrl,
        "project.repositoryUrl"
      ),
      launcherCommand: requireNonEmpty(
        config.project.launcherCommand,
        "project.launcherCommand"
      )
    },
    actions: options.actions.map((action) => ({
      id: requireNonEmpty(action.id, "action.id"),
      label: requireNonEmpty(action.label, `${action.id}.label`),
      group: requireNonEmpty(action.group, `${action.id}.group`),
      description: optionalNonEmpty(action.description),
      warning: optionalNonEmpty(action.warning),
      dangerous: action.dangerous === true || action.requiresConfirmation === true || void 0,
      planned: action.planned === true || action.kind === "planned" || void 0
    })),
    view: options.view ?? "main",
    focusZone: options.focusZone ?? "menu",
    menu: options.menu ?? createLegacyMenu(options.view ?? "main", options.actions),
    panels: {
      detectedInstallations: options.panels?.detectedInstallations ?? {
        label: "Detected Installations",
        lines: []
      },
      generatedArtifacts: options.panels?.generatedArtifacts ?? {
        label: "Generated Artifacts",
        lines: []
      },
      linuxArtifacts: options.panels?.linuxArtifacts ?? {
        label: "Linux Artifacts",
        lines: []
      },
      content: options.panels?.content ?? {
        label: "Overview",
        lines: createOverviewLines(config)
      },
      logs: options.panels?.logs ?? {
        label: "Logs",
        lines: (options.logs ?? []).map((log) => ({
          source: requireNonEmpty(log.source, "log.source"),
          line: String(log.line),
          level: optionalNonEmpty(log.level)
        }))
      }
    },
    logs: (options.logs ?? []).map((log) => ({
      source: requireNonEmpty(log.source, "log.source"),
      line: String(log.line),
      level: optionalNonEmpty(log.level)
    })),
    footer: options.footer ?? {
      textSelectionMode: false,
      items: [
        "Tab Focus",
        "Enter Select",
        "Space Toggle",
        "F5 Copy Logs",
        "? Help",
        "q Quit"
      ]
    },
    theme: options.theme ?? {
      supportsTrueColor: true,
      colors: {
        lightBlue: "#00C4CC",
        blue: "#007C89",
        purple: "#7D2AE8",
        success: "#00843D",
        warning: "#E67E22",
        error: "#EB001B",
        text: "#FFFFFF",
        muted: "#9EA1A2",
        background: "#0E1318",
        surface: "#181D23",
        surfaceAlt: "#252B33",
        menuSelectedBg: "#7D2AE8",
        menuSelectedFg: "#FFFFFF",
        menuInactiveSelectedBg: "#252B33",
        menuInactiveSelectedFg: "#00C4CC",
        activeBorder: "#00C4CC",
        inactiveBorder: "#252B33",
        activeLabel: "#FFFFFF",
        inactiveLabel: "#9EA1A2",
        activeCellBg: "#00C4CC",
        activeCellFg: "#000000",
        footerBg: "#181D23",
        footerFg: "#9EA1A2"
      }
    }
  };
  if (options.progress) {
    input.progress = {
      state: requireNonEmpty(options.progress.state, "progress.state"),
      label: optionalNonEmpty(options.progress.label),
      percent: options.progress.percent
    };
  }
  if (options.modal) {
    input.modal = options.modal;
  }
  return input;
}
function createLegacyMenu(view, actions) {
  if (view === "main") {
    return {
      label: "Main Menu",
      items: [
        { id: "view-install", label: "Install", view: "install" },
        { id: "view-development", label: "Development", view: "development" },
        {
          id: "view-maintenance",
          label: "Maintenance & Uninstall",
          view: "maintenance"
        },
        {
          id: "view-settings",
          label: "Application Settings",
          view: "settings"
        },
        { id: "view-help", label: "Help", view: "help" }
      ],
      selected: 0
    };
  }
  const group = view === "install" ? "install" : view === "maintenance" ? "maintenance" : "development";
  return {
    label: `${view.charAt(0).toUpperCase()}${view.slice(1)} Actions`,
    items: actions.filter((action) => action.group === group).map((action) => ({
      id: requireNonEmpty(action.id, "action.id"),
      label: requireNonEmpty(action.label, `${action.id}.label`),
      description: optionalNonEmpty(action.description),
      warning: optionalNonEmpty(action.warning),
      dangerous: action.dangerous === true || action.requiresConfirmation === true || void 0,
      planned: action.planned === true || action.kind === "planned" || void 0,
      actionId: action.id
    })),
    selected: 0
  };
}
function createOverviewLines(config) {
  return [
    ...config.project.logoLines,
    "",
    "Version:",
    `  ${config.project.displayVersion}`,
    "",
    "Hash:",
    `  ${config.project.hash ?? "unknown"}`,
    "",
    "Phase:",
    `  ${config.project.phase ?? "unknown"}`,
    "",
    "Version Release Notes:",
    `  ${config.releaseNotes}`,
    "",
    "Package / Version Information:",
    `  App ID: ${config.project.appId}`,
    `  Executable: ${config.project.executableName}`,
    `  Repository: ${config.project.repositoryUrl}`
  ];
}
function requireNonEmpty(value, label) {
  if (!value?.trim()) throw new Error(`${label} is required`);
  return value;
}
function optionalNonEmpty(value) {
  return value?.trim() ? value : void 0;
}

// build-resources/c420ui/src/rust-tui-runner.ts
function runC420UIRustTuiApp(options) {
  const writeError = options.writeError ?? console.error;
  const exit = options.exit ?? process.exit;
  const abortController = new AbortController();
  const pendingRootRequests = /* @__PURE__ */ new Map();
  let child;
  try {
    const binary = (options.resolveBinary ?? resolveC420UITuiBinary)({
      rootDir: options.config.rootDir,
      env: options.env
    });
    const spawnProcess = options.spawnProcess ?? spawn;
    child = spawnProcess(binary, ["run", "--json-lines"], {
      cwd: options.config.rootDir,
      env: createC420UITuiProcessEnv(options.env ?? process.env),
      stdio: ["pipe", "pipe", "inherit"]
    });
  } catch (error) {
    writeError(formatRustTuiError(error));
    exit(c420uiExitCodes.generalError);
    return;
  }
  const send = (event) => {
    child.stdin.write(`${JSON.stringify(event)}
`);
  };
  const actions = options.bridge.actions();
  const theme = {
    supportsTrueColor: c420uiTheme.supportsTrueColor,
    colors: c420uiTheme.colors
  };
  const renderState = async (view = "main") => createC420UITuiRenderInput({
    config: options.config,
    actions: options.bridge.actions(),
    theme,
    view,
    panels: await createLegacyPanels(options)
  });
  send({ event: "init", state: createInitialRenderState(options, actions, theme) });
  void renderState("main").then((state) => send({ event: "state", state }));
  const engine = createC420UIActionEngine({
    bridge: options.bridge,
    rootDir: options.config.rootDir,
    env: options.env,
    rootProvider: options.rootProvider,
    requestRootAccess: (request) => requestRootAccessThroughTui(
      request,
      send,
      pendingRootRequests,
      options.rootProvider
    ),
    emit(event) {
      forwardActionEngineEvent(event, send);
    }
  });
  child.on("error", (error) => {
    writeError(formatRustTuiError(error));
    exit(c420uiExitCodes.generalError);
  });
  child.on("close", (code) => {
    if (code && code !== 0) {
      writeError(`c420ui-tui exited with code ${code}`);
      exit(code);
    }
  });
  readJsonLines(child.stdout, (event) => {
    void handleTuiEvent({
      event,
      engine,
      send,
      config: options.config,
      bridge: options.bridge,
      renderState,
      startupTasks: options.startupTasks ?? [],
      pendingRootRequests,
      abortController,
      writeError,
      exit
    });
  }, (error) => {
    writeError(error);
    exit(c420uiExitCodes.generalError);
  });
}
function resolveC420UITuiBinary(options) {
  const configured = options.env?.C420UI_TUI_BIN?.trim();
  if (configured) {
    if (!fs.existsSync(configured)) {
      throw new Error(`Configured c420ui-tui binary does not exist: ${configured}`);
    }
    return configured;
  }
  const extension = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    path2.join(
      options.rootDir,
      "build-resources",
      "c420ui-rs",
      "target",
      "debug",
      `c420ui-tui${extension}`
    ),
    path2.join(
      options.rootDir,
      "build-resources",
      "c420ui-rs",
      "target",
      "release",
      `c420ui-tui${extension}`
    )
  ];
  const binary = candidates.find((candidate) => fs.existsSync(candidate));
  if (!binary) {
    throw new Error("Missing c420ui-tui binary. Run npm run build:c420ui-tui.");
  }
  return binary;
}
function createC420UITuiProcessEnv(env) {
  const output = {};
  for (const key of ["PATH", "TERM", "COLORTERM", "LANG", "LC_ALL", "C420UI_TUI_BIN"]) {
    const value = env[key];
    if (value) output[key] = value;
  }
  return output;
}
async function handleTuiEvent(options) {
  const {
    event,
    engine,
    send,
    config,
    bridge,
    renderState,
    startupTasks,
    pendingRootRequests,
    abortController,
    writeError,
    exit
  } = options;
  if (event.event === "ready") {
    if (startupTasks.length > 0) {
      await runC420UIStartupTasks(startupTasks, (text) => {
        for (const line of splitLogLines(text)) {
          send({ event: "log", source: "system", line });
        }
      });
    }
    return;
  }
  if (event.event === "action-selected") {
    const result = await engine.runActionById(event.actionId, {
      yes: true,
      signal: abortController.signal
    });
    if (result.message) {
      if (result.status === "success") {
        send({ event: "log", source: "action", line: result.message });
      } else {
        send({ event: "error", message: result.message });
      }
    }
    return;
  }
  if (event.event === "view-changed") {
    send({
      event: "state",
      state: await renderState(event.view)
    });
    return;
  }
  if (event.event === "root-request-response") {
    const resolve = pendingRootRequests.get(event.requestId);
    if (resolve) {
      pendingRootRequests.delete(event.requestId);
      resolve({ accepted: event.accepted, input: event.input });
    }
    return;
  }
  if (event.event === "cancel") {
    abortController.abort();
    exit(c420uiExitCodes.canceled);
    return;
  }
  if (event.event === "quit") {
    exit(c420uiExitCodes.success);
    return;
  }
  writeError(`Unknown c420ui-tui event: ${JSON.stringify(event)}`);
}
function createInitialRenderState(options, actions, theme) {
  return createC420UITuiRenderInput({
    config: options.config,
    actions,
    theme,
    view: "main",
    panels: createLoadingPanels()
  });
}
function createLoadingPanels() {
  const loading = "loading...";
  return {
    detectedInstallations: {
      label: "Detected Installations",
      lines: [
        `  Native System: ${loading}`,
        `  Native User: ${loading}`,
        `  Flatpak System: ${loading}`,
        `  Flatpak User: ${loading}`
      ]
    },
    generatedArtifacts: {
      label: "Generated Artifacts",
      lines: [`  AppImage: ${loading}`]
    },
    linuxArtifacts: {
      label: "Linux Artifacts",
      lines: ["Electron/Node/npm loading..."]
    },
    content: {
      label: "Overview",
      lines: []
    },
    logs: {
      label: "Logs",
      lines: []
    }
  };
}
async function createLegacyPanels(options) {
  const status = options.bridge.overviewStatus ? await options.bridge.overviewStatus() : null;
  const panels = formatDetectionPanelSummaries(status, c420uiTheme.colors);
  return {
    detectedInstallations: {
      label: "Detected Installations",
      lines: panels.detectedInstallations.map(stripBlessedTags)
    },
    generatedArtifacts: {
      label: "Generated Artifacts",
      lines: panels.generatedArtifacts.map(stripBlessedTags)
    },
    linuxArtifacts: {
      label: "Linux Artifacts",
      lines: panels.linuxArtifacts.map(stripBlessedTags)
    }
  };
}
function stripBlessedTags(line) {
  return line.replace(/\{\/?[^}]+\}/g, "");
}
async function requestRootAccessThroughTui(request, send, pendingRootRequests, rootProvider) {
  const requestId = `root-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  send({
    event: "root-request",
    requestId,
    actionId: request.action.id,
    reason: request.reason
  });
  const response = await new Promise(
    (resolve) => {
      pendingRootRequests.set(requestId, resolve);
    }
  );
  if (!response.accepted) {
    return {
      ok: false,
      code: c420uiExitCodes.canceled,
      message: "Root access was canceled."
    };
  }
  let submittedInput = response.input ?? "";
  let access;
  try {
    access = rootProvider?.validateRootAccessWithInput ? rootProvider.validateRootAccessWithInput(
      request.rootDir,
      request.actionEnv,
      submittedInput
    ) : rootProvider?.validateRootAccess(request.rootDir, request.actionEnv);
  } finally {
    submittedInput = "";
  }
  if (access?.ok === false) {
    return access;
  }
  return { ok: true };
}
function forwardActionEngineEvent(event, send) {
  if (event.type === "log") {
    send({
      event: "log",
      source: event.source,
      line: event.line,
      level: event.level
    });
    return;
  }
  if (event.type === "progress") {
    send({
      event: "progress",
      state: event.state,
      label: event.label,
      percent: event.percent
    });
    return;
  }
  if (event.type === "action:start" && event.actionId) {
    send({ event: "action-start", actionId: event.actionId });
    return;
  }
  if (event.type === "action:finish" && event.actionId) {
    const data = event.data ?? {};
    const code = typeof data.exitCode === "number" ? data.exitCode : 0;
    const status = typeof data.status === "string" ? data.status : "success";
    send({
      event: "action-finish",
      actionId: event.actionId,
      status,
      code
    });
    return;
  }
  if (event.message) {
    send({ event: "log", source: "system", line: event.message });
  }
}
function readJsonLines(stream, onEvent, onError) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line));
        } catch (error) {
          onError(`Invalid c420ui-tui JSONL event: ${formatRustTuiError(error)}`);
          stream.destroy();
          return;
        }
      }
      newlineIndex = buffer.indexOf("\n");
    }
  });
}
function splitLogLines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
function formatRustTuiError(error) {
  return error instanceof Error ? error.message : String(error);
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
  const runRustTuiApp = runtimeOptions.runRustTuiApp ?? runC420UIRustTuiApp;
  return runRustTuiApp({
    ...options,
    writeError,
    exit
  });
}

// build-resources/c420ui/src/linux-root-provider.ts
import {
  spawnSync
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
  const runCommand = options.runCommand ?? spawnSync;
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

// build-resources/c420ui/src/npm-dependencies.ts
import fs3 from "node:fs";
import path4 from "node:path";

// build-resources/c420ui/src/rust-host.ts
import { spawn as spawn2 } from "node:child_process";
import { StringDecoder as StringDecoder2 } from "node:string_decoder";
import fs2 from "node:fs";
import path3 from "node:path";
function resolveC420UIRustHostBinary(rootDir2, env = {}) {
  let binPath = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  if (!binPath) {
    const debugPath = path3.join(rootDir2, "build-resources/c420ui-rs/target/debug/c420ui-host");
    const releasePath = path3.join(rootDir2, "build-resources/c420ui-rs/target/release/c420ui-host");
    if (fs2.existsSync(debugPath)) {
      binPath = debugPath;
    } else if (fs2.existsSync(releasePath)) {
      binPath = releasePath;
    }
  }
  if (!binPath || !fs2.existsSync(binPath)) {
    throw new Error("c420ui Rust host is missing. Run npm run build:c420ui-rs.");
  }
  return binPath;
}
function buildRustHostProcessEnv(env = {}) {
  const childEnv = {};
  if (env.PATH) {
    childEnv.PATH = env.PATH;
  } else if (process.env.PATH) {
    childEnv.PATH = process.env.PATH;
  }
  if (env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN) {
    childEnv.C420UI_HOST_BIN = env.C420UI_HOST_BIN || process.env.C420UI_HOST_BIN || "";
  }
  return childEnv;
}
async function runC420UIRustHost(options) {
  const { rootDir: rootDir2, command, input, timeoutMs = 1e4, env = {} } = options;
  const binPath = resolveC420UIRustHostBinary(rootDir2, env);
  const childEnv = buildRustHostProcessEnv(env);
  return new Promise((resolve, reject) => {
    const child = spawn2(binPath, [command, "--json"], {
      env: childEnv,
      shell: false
    });
    let stdoutData = "";
    let stderrData = "";
    let killedByTimeout = false;
    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill();
      clearTimeout(timer);
      reject(new Error(`c420ui-host command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.stdin.on("error", (err) => {
      if (err.code !== "EPIPE") {
        clearTimeout(timer);
        reject(err);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (killedByTimeout) return;
      if (code !== 0) {
        reject(
          new Error(
            `c420ui-host exited with code ${code}. Stderr: ${stderrData.slice(0, 500).trim()}`
          )
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error("Failed to parse c420ui-host output as JSON."));
      }
    });
    child.stdin.write(JSON.stringify(input ?? {}) + "\n");
    child.stdin.end();
  });
}
function parseJsonLine(line) {
  try {
    const parsed = JSON.parse(line);
    if (!parsed || typeof parsed !== "object" || !("event" in parsed)) {
      throw new Error("missing event field");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSONL event from c420ui-host: ${error instanceof Error ? error.message : String(error)}.`);
  }
}
async function runC420UIRustHostJsonLines(options) {
  const { rootDir: rootDir2, input, timeoutMs = 0, env = {}, signal, onEvent } = options;
  const binPath = resolveC420UIRustHostBinary(rootDir2, env);
  const childEnv = buildRustHostProcessEnv(env);
  return new Promise((resolve, reject) => {
    const child = spawn2(binPath, ["run-process", "--json-lines"], {
      env: childEnv,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdoutPending = "";
    let stderrData = "";
    let settled = false;
    let timeout;
    const decoder = new StringDecoder2("utf8");
    function settle(error, code = 0) {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(code);
    }
    function abort() {
      try {
        child.stdin.write(JSON.stringify({ event: "cancel" }) + "\n");
      } catch {
      }
      if (timeoutMs > 0) {
        setTimeout(() => {
          if (!settled) child.kill();
        }, Math.min(timeoutMs, 1e3)).unref();
      }
    }
    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill();
        settle(new Error(`c420ui-host run-process timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      timeout.unref();
    }
    child.on("error", (error) => settle(error));
    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });
    child.stdout.on("data", (chunk) => {
      stdoutPending += decoder.write(chunk);
      const lines = stdoutPending.split(/\r?\n/);
      stdoutPending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEvent(parseJsonLine(line));
        } catch (error) {
          settle(error instanceof Error ? error : new Error(String(error)));
          child.kill();
          return;
        }
      }
    });
    child.stdout.on("end", () => {
      stdoutPending += decoder.end();
      const line = stdoutPending.trim();
      if (!line) return;
      try {
        onEvent(parseJsonLine(line));
      } catch (error) {
        settle(error instanceof Error ? error : new Error(String(error)));
      }
    });
    child.on("close", (code) => {
      if (settled) return;
      if (stderrData.trim() && code !== 0) {
        stderrData = stderrData.slice(0, 500);
      }
      settle(null, code ?? 1);
    });
    signal?.addEventListener("abort", abort, { once: true });
    child.stdin.write(JSON.stringify(input) + "\n");
    if (signal?.aborted) {
      abort();
    }
  });
}

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

// build-resources/c420ui/src/rust-process-runner.ts
var rustProcessEnvAllowlist = /* @__PURE__ */ new Set([
  "PATH",
  "HOME",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "TMPDIR",
  "TEMP",
  "TMP",
  "CI",
  "FORCE_COLOR",
  "NO_COLOR",
  "npm_config_cache",
  "npm_config_userconfig",
  "npm_config_prefix",
  "npm_config_loglevel",
  "npm_config_update_notifier",
  "C420UI_HOST_BIN"
]);
function buildC420UIRustProcessEnv(env) {
  const safeEnv = {};
  for (const key of rustProcessEnvAllowlist) {
    const value = env[key];
    if (typeof value === "string") safeEnv[key] = value;
  }
  return safeEnv;
}
function emitActionLog(options, line, level = "info") {
  options.emitLog(createC420UIOperationalLogEvent({ source: "action", line, level }));
}
function mapEvent(options, event) {
  if (event.event === "stdout" || event.event === "stderr") {
    options.emitLog(createC420UIOperationalLogEvent({ source: event.event, line: event.line }));
    return;
  }
  if (event.event === "error") {
    emitActionLog(options, `[error] Failed to start ${options.label}: ${event.message}`, "error");
  }
}
async function runC420UIRustProcess(options) {
  if (options.signal?.aborted) {
    emitActionLog(options, `[action] Cancel requested for ${options.label}`);
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: "Action canceled before start."
    };
  }
  emitActionLog(options, `[action] Starting ${options.label}`);
  options.emitProgress({ state: "running", label: options.label });
  let exitCode = c420uiExitCodes.generalError;
  let canceled = false;
  let errorMessage;
  try {
    const hostExitCode = await runC420UIRustHostJsonLines({
      rootDir: options.rootDir,
      command: "run-process",
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      env: options.env,
      input: {
        command: options.command,
        args: options.args ?? [],
        cwd: options.cwd,
        env: buildC420UIRustProcessEnv(options.env),
        label: options.label
      },
      onEvent(event) {
        mapEvent(options, event);
        if (event.event === "exit") exitCode = event.code;
        if (event.event === "canceled") {
          canceled = true;
          errorMessage = event.message;
        }
        if (event.event === "error") {
          errorMessage = event.message;
        }
      }
    });
    if (exitCode === c420uiExitCodes.generalError && hostExitCode !== c420uiExitCodes.success) {
      exitCode = hostExitCode;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitActionLog(options, `[error] Failed to start ${options.label}: ${message}`, "error");
    options.emitProgress({ state: "failed", label: options.label });
    return { code: c420uiExitCodes.generalError, status: "failed", message };
  }
  if (canceled || options.signal?.aborted || exitCode === c420uiExitCodes.canceled) {
    options.emitProgress({ state: "canceled", percent: 0, label: options.label });
    return {
      code: c420uiExitCodes.canceled,
      status: "canceled",
      message: errorMessage ?? "Action canceled."
    };
  }
  const success = exitCode === c420uiExitCodes.success;
  if (!success) {
    emitActionLog(options, `[error] ${options.label} exited with code ${exitCode}`, "error");
  }
  options.emitProgress({
    state: success ? "success" : "failed",
    percent: success ? 100 : void 0,
    label: options.label
  });
  return {
    code: exitCode,
    status: success ? "success" : "failed",
    message: errorMessage
  };
}

// build-resources/c420ui/src/npm-dependencies.ts
function readPackageJson(rootDir2) {
  const packagePath = path4.join(rootDir2, "package.json");
  if (!fs3.existsSync(packagePath)) {
    return { result: { status: "failed", exitCode: 1, message: "package.json was not found." } };
  }
  try {
    const packageJson = JSON.parse(fs3.readFileSync(packagePath, "utf8"));
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
    if (fs3.existsSync(candidate)) return true;
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
  const hasLockfile = fs3.existsSync(path4.join(rootDir2, lockfile));
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
var defaultNpmCommandRunner = async (options) => {
  const result = await runC420UIRustProcess({
    rootDir: options.rootDir,
    command: options.command,
    args: options.args,
    cwd: options.cwd,
    env: options.env,
    label: options.label,
    emitLog: options.emitLog ?? (() => {
    }),
    emitProgress: options.emitProgress ?? (() => {
    })
  });
  if (result.status === "success") {
    return { status: "available", message: `${options.label} completed successfully.` };
  }
  return {
    status: "failed",
    exitCode: result.code,
    message: result.message ?? `${options.label} failed.`
  };
};
async function ensureC420UINpmDependencies(config, options) {
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
  const commandResult = await runCommand({
    rootDir: options.rootDir,
    command: "npm",
    args,
    cwd: options.rootDir,
    env,
    label: `npm ${args.join(" ")}`,
    emitLog: options.emitLog,
    emitProgress: options.emitProgress
  });
  if (commandResult.status === "failed") {
    return {
      status: "failed",
      exitCode: commandResult.exitCode ?? 1,
      message: `npm ${args.join(" ")} failed${repairMessage}.`
    };
  }
  return { status: "available", message: `npm ${args.join(" ")} completed successfully${repairMessage}.` };
}

// build-resources/c420ui/src/host-dependency-resolver.ts
async function resolveC420UIHostDependencies(config, options) {
  const validatedConfig = validateC420UIHostDependencyConfig(config);
  const action = options.action ?? "check";
  const rustInput = {
    node: validatedConfig.node ? {
      required: validatedConfig.node.required,
      minimumMajor: validatedConfig.node.minimumMajor,
      version: process.version
    } : void 0,
    commands: validatedConfig.commands,
    env: {
      PATH: options.env?.PATH || process.env.PATH || ""
    }
  };
  let rustResult;
  try {
    rustResult = await runC420UIRustHost({
      rootDir: options.rootDir,
      command: "check-host-dependencies",
      input: rustInput,
      env: options.env
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "failed",
      exitCode: 1,
      message: `c420ui Rust host check failed: ${msg}. Run "npm run build:c420ui-rs" to compile it.`
    };
  }
  if (rustResult.status === "failed" || rustResult.status === "missing") {
    return {
      status: rustResult.status,
      message: rustResult.message,
      dependencies: rustResult.dependencies
    };
  }
  const npmResult = checkC420UINpmDependencies(validatedConfig.npm, {
    rootDir: options.rootDir,
    env: options.env
  });
  if (action === "ensure") {
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
          plannedCommand: planC420UINpmInstallCommand(validatedConfig.npm, options.rootDir)
        };
      }
      return await ensureC420UINpmDependencies(validatedConfig.npm, {
        rootDir: options.rootDir,
        env: options.env,
        runCommand: options.runCommand,
        emitLog: options.emitLog,
        emitProgress: options.emitProgress
      });
    }
  } else {
    if (npmResult.status === "failed" || npmResult.status === "missing") {
      return npmResult;
    }
  }
  return { status: "available", message: "Host dependencies are available." };
}

// build-resources/c420ui/src/host-dependency-runner.ts
async function runC420UIHostDependencyEnsure(config, options) {
  return resolveC420UIHostDependencies(config, {
    ...options,
    action: "ensure",
    runCommand: options.runCommand
  });
}

// build-resources/c420ui/src/maintenance-config.ts
function validateTargetList(input, field) {
  if (input === void 0) return void 0;
  if (!Array.isArray(input)) {
    throw new Error(`${field} must be an array`);
  }
  return input.map((target, index) => {
    if (typeof target !== "string") {
      throw new Error(`${field}[${index}] must be a string`);
    }
    const trimmed = target.trim();
    if (!trimmed) {
      throw new Error(`${field}[${index}] must not be empty`);
    }
    if (trimmed.startsWith("/") || trimmed === "." || trimmed === "/" || trimmed.includes("\\")) {
      throw new Error(`${field}[${index}] must be a safe relative path`);
    }
    if (trimmed.split("/").includes("..")) {
      throw new Error(`${field}[${index}] must not contain ..`);
    }
    return trimmed;
  });
}
function validateC420UIMaintenanceConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("maintenance config must be an object");
  }
  const value = input;
  return {
    cleanupTargets: validateTargetList(value.cleanupTargets, "cleanupTargets"),
    permissionTargets: validateTargetList(value.permissionTargets, "permissionTargets")
  };
}

// build-resources/c420ui/src/command-runner.ts
async function runC420UICommand(options) {
  const processRunner = options.processRunner ?? runC420UIRustProcess;
  return processRunner({
    rootDir: options.cwd,
    command: options.command,
    args: options.args ?? [],
    cwd: options.cwd,
    env: options.env,
    label: options.label,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    emitLog: options.emitLog,
    emitProgress: options.emitProgress
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

// build-resources/canva-linux/c420ui-adapter/adapter.ts
import fs16 from "node:fs";
import path17 from "node:path";

// build-resources/c420ui/src/terminal/logo.ts
var c420uiLogoLines = [
  "\u2584\u2584  \u2588 \u2588 \u2584\u2584\u2584 \u2584\u2580\u2584  \u2584 \u2584  \u2584",
  "\u2588   \u2580\u2584\u2588  \u2584\u2580 \u2588 \u2588  \u2588 \u2588  \u2588",
  "\u2580\u2580    \u2588 \u2588\u2584\u2584  \u2580   \u2580\u2584\u2580  \u2580"
];

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
import fs10 from "node:fs";
import path11 from "node:path";
import {
  execFileSync
} from "node:child_process";

// build-resources/canva-linux/project-root.ts
import fs4 from "node:fs";
import path6 from "node:path";
function isProjectRoot(dir) {
  return fs4.existsSync(path6.join(dir, "package.json")) && fs4.existsSync(path6.join(dir, "build-resources/canva-linux/config/actions.json")) && fs4.existsSync(path6.join(dir, "build-resources/canva-linux/config/project-ui.json"));
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
import fs5 from "node:fs";
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
  return JSON.parse(fs5.readFileSync(filePath, "utf8"));
}
function readPackageVersion(rootDir2) {
  return readJsonFile(path7.join(rootDir2, "package.json")).version ?? "unknown";
}
function loadArtifactWorkflows(rootDir2) {
  const configPath = path7.join(rootDir2, ARTIFACTS_CONFIG_PATH);
  if (!fs5.existsSync(configPath)) return [];
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
    return fs5.existsSync(absolutePath) ? [absolutePath] : [];
  }
  const firstWildcard = resolvedPattern.indexOf("*");
  const scanRootRelative = path7.dirname(resolvedPattern.slice(0, firstWildcard));
  const scanRoot = path7.join(rootDir2, scanRootRelative || ".");
  if (!fs5.existsSync(scanRoot)) return [];
  const matcher = patternToRegExp(resolvedPattern);
  const candidates = [];
  for (const entry of fs5.readdirSync(scanRoot, { withFileTypes: true })) {
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
  const hash = metadata.canvaLinuxSourceHash?.trim();
  return {
    metadataFound: true,
    ...version ? { version } : {},
    ...fullVersion ? { fullVersion } : {},
    hash: hash || "unknown",
    hashKind: "canvaLinuxSourceHash"
  };
}
function readVersionSidecar(filePath) {
  const raw = fs5.readFileSync(filePath, "utf8").trim();
  return raw ? { version: raw, fullVersion: raw } : {};
}
function readArtifactPackageJsonVersion(artifactPath) {
  const packageJsonPath = path7.join(artifactPath, "package.json");
  if (!fs5.existsSync(packageJsonPath)) return {};
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
    if (!fs5.existsSync(sidecar)) continue;
    if (sidecar.endsWith(".json")) return normalizeMetadata(readMetadataJson(sidecar));
    return readVersionSidecar(sidecar);
  }
  if (fs5.existsSync(artifactPath) && fs5.statSync(artifactPath).isDirectory()) {
    const markers = [
      path7.join(artifactPath, "resources/config/canva-linux/build-metadata.json"),
      path7.join(artifactPath, "config/canva-linux/build-metadata.json"),
      ...artifactKindValue === "linux-unpacked" ? [
        path7.join(rootDir2, ".build", "canva-linux", "build-metadata.effective.json"),
        path7.join(rootDir2, "build-resources", "canva-linux", "config", "build-metadata.json")
      ] : []
    ];
    for (const marker of markers) {
      if (fs5.existsSync(marker)) return normalizeMetadata(readMetadataJson(marker));
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
    const version = metadata.version ?? fallbackVersion;
    const hash = metadata.hash ?? (fallbackVersion ? "unknown" : void 0);
    fragments.push({
      id: workflow.id,
      kind,
      label: workflow.label,
      detected,
      ...artifactPath ? { path: toRelativeArtifactPath(rootDir2, artifactPath) } : {},
      ...version ? { version } : {},
      ...metadata.fullVersion ? { fullVersion: metadata.fullVersion } : {},
      ...hash ? { hash, hashKind: metadata.hashKind ?? "canvaLinuxSourceHash" } : {}
    });
  }
  return fragments;
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
import fs7 from "node:fs";
import path8 from "node:path";

// build-resources/c420ui/operations/detection/version-marker.ts
import fs6 from "node:fs";
function readVersionFile(versionFile) {
  if (fs6.existsSync(versionFile)) {
    return fs6.readFileSync(versionFile, "utf8").trim();
  }
  return "";
}
function readPackageJsonVersion(packageFile) {
  if (!fs6.existsSync(packageFile)) return "";
  try {
    const pkg = JSON.parse(fs6.readFileSync(packageFile, "utf8"));
    return pkg.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataFullVersion(metadataFile) {
  if (!fs6.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs6.readFileSync(metadataFile, "utf8"));
    return m.fullVersion || m.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataBaseVersion(metadataFile) {
  if (!fs6.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs6.readFileSync(metadataFile, "utf8"));
    return m.baseVersion || m.basePhase || m.version || "";
  } catch {
    return "";
  }
}
function readBuildMetadataHash(metadataFile, field = "canvaLinuxSourceHash") {
  if (!fs6.existsSync(metadataFile)) return "";
  try {
    const m = JSON.parse(fs6.readFileSync(metadataFile, "utf8"));
    return m[field] || "";
  } catch {
    return "";
  }
}

// build-resources/c420ui/operations/detection/appimage-detection.ts
function detectAppImageArtifacts(rootDir2) {
  const distDir = path8.join(rootDir2, "dist");
  if (!fs7.existsSync(distDir)) return false;
  try {
    const files = fs7.readdirSync(distDir);
    return files.some((file) => file.endsWith(".AppImage"));
  } catch {
    return false;
  }
}
function findLatestAppImageArtifact(rootDir2) {
  const distDir = path8.join(rootDir2, "dist");
  if (!fs7.existsSync(distDir)) return "";
  try {
    const files = fs7.readdirSync(distDir).filter((file) => file.endsWith(".AppImage")).sort();
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
    if (fs7.existsSync(marker)) return marker;
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
      const entries = fs7.readdirSync(dir, { withFileTypes: true });
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
  if (fs7.existsSync(distDir)) {
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
      const entries = fs7.readdirSync(dir, { withFileTypes: true });
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
  if (fs7.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    version = readBuildMetadataFullVersion(distMetadata);
    if (version) return version;
  }
  return detectAppImageVersion(rootDir2);
}
function detectAppImageHash(rootDir2) {
  const file = findLatestAppImageArtifact(rootDir2);
  const metadata = findArtifactBuildMetadataMarker(file, rootDir2);
  let hash = readBuildMetadataHash(metadata, "canvaLinuxSourceHash");
  if (hash) return hash;
  const findMetadataInDist = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs7.readdirSync(dir, { withFileTypes: true });
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
  if (fs7.existsSync(distDir)) {
    const distMetadata = findMetadataInDist(distDir, 0);
    hash = readBuildMetadataHash(distMetadata, "canvaLinuxSourceHash");
    if (hash) return hash;
  }
  return "";
}

// build-resources/c420ui/operations/detection/flatpak-detection.ts
import fs8 from "node:fs";
import path9 from "node:path";
import os from "node:os";
import { spawnSync as spawnSync2 } from "node:child_process";
var APP_ID = "io.github.coletivo420.canva-linux";
function detectFlatpakSystemInstall() {
  try {
    const result = spawnSync2("flatpak", ["--system", "info", APP_ID], {
      stdio: "ignore"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
function detectFlatpakUserInstall() {
  try {
    const result = spawnSync2("flatpak", ["--user", "info", APP_ID], {
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
  if (fs8.existsSync(directPath)) return directPath;
  const appDir = path9.join(scopeRoot, `app/${APP_ID}`);
  if (!fs8.existsSync(appDir)) return "";
  const findVersionMarker = (dir, depth) => {
    if (depth > 8) return "";
    try {
      const entries = fs8.readdirSync(dir, { withFileTypes: true });
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
  if (!fs8.existsSync(markerFile)) return "";
  try {
    const raw = fs8.readFileSync(markerFile, "utf8").trim();
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
  if (!fs8.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "version");
  if (version) return version;
  try {
    return fs8.readFileSync(markerFile, "utf8").split("\n")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}
function readFlatpakFullVersionMarker(markerFile) {
  if (!fs8.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "fullVersion");
  if (version) return version;
  return readFlatpakVersionMarker(markerFile);
}
function detectFlatpakSystemVersion() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;
  try {
    const result = spawnSync2(
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
    const result = spawnSync2(
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
function readFlatpakHashMarker(markerFile) {
  return readFlatpakVersionMarkerKey(markerFile, "canvaLinuxSourceHash");
}
function detectFlatpakSystemHash() {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  return readFlatpakHashMarker(marker);
}
function detectFlatpakUserHash() {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path9.join(home, ".local/share/flatpak")
  );
  return readFlatpakHashMarker(marker);
}

// build-resources/c420ui/operations/detection/native-detection.ts
import fs9 from "node:fs";
import path10 from "node:path";
import os2 from "node:os";
var APP_EXECUTABLE = "canva-linux";
var APP_NATIVE_DESKTOP_NAME = "io.github.coletivo420.canva-linux.native.desktop";
function detectNativeSystemInstall() {
  return fs9.existsSync("/opt/canva-linux") || fs9.existsSync(`/usr/local/bin/${APP_EXECUTABLE}`) || fs9.existsSync(`/usr/local/share/applications/${APP_NATIVE_DESKTOP_NAME}`);
}
function detectNativeUserInstall() {
  const home = os2.homedir();
  return fs9.existsSync(path10.join(home, ".local/opt/canva-linux")) || fs9.existsSync(path10.join(home, `.local/bin/${APP_EXECUTABLE}`)) || fs9.existsSync(
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
function detectNativeSystemHash() {
  return readBuildMetadataHash(
    "/opt/canva-linux/config/canva-linux/build-metadata.json",
    "canvaLinuxSourceHash"
  );
}
function detectNativeUserHash() {
  const home = os2.homedir();
  return readBuildMetadataHash(
    path10.join(home, ".local/opt/canva-linux/config/canva-linux/build-metadata.json"),
    "canvaLinuxSourceHash"
  );
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
    DETECTED_APPIMAGE_FULL_VERSION: detectAppImageFullVersion(rootDir2),
    DETECTED_NATIVE_SYSTEM_HASH: detectNativeSystemHash(),
    DETECTED_NATIVE_USER_HASH: detectNativeUserHash(),
    DETECTED_FLATPAK_SYSTEM_HASH: detectFlatpakSystemHash(),
    DETECTED_FLATPAK_USER_HASH: detectFlatpakUserHash(),
    DETECTED_APPIMAGE_HASH: detectAppImageHash(rootDir2)
  };
}

// build-resources/canva-linux/c420ui-adapter/detection/provider.ts
var cachedPackageJson;
function readPackage(rootDir2) {
  if (cachedPackageJson?.rootDir === rootDir2) {
    return cachedPackageJson.packageJson;
  }
  const packageJson = JSON.parse(
    fs10.readFileSync(path11.join(rootDir2, "package.json"), "utf8")
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
  appImageFullVersion: "",
  nativeSystemHash: "",
  nativeUserHash: "",
  flatpakSystemHash: "",
  flatpakUserHash: "",
  appImageHash: ""
};
function readPhase(rootDir2) {
  const projectUiPath = path11.join(rootDir2, "build-resources/canva-linux/config/project-ui.json");
  try {
    if (!fs10.existsSync(projectUiPath)) return "unknown";
    const projectUi = JSON.parse(fs10.readFileSync(projectUiPath, "utf8"));
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
    appImageFullVersion: appImageFragment?.fullVersion || appImageFragment?.version || values.DETECTED_APPIMAGE_FULL_VERSION || values.DETECTED_APPIMAGE_VERSION || "",
    nativeSystemHash: values.DETECTED_NATIVE_SYSTEM_HASH || "",
    nativeUserHash: values.DETECTED_NATIVE_USER_HASH || "",
    flatpakSystemHash: values.DETECTED_FLATPAK_SYSTEM_HASH || "",
    flatpakUserHash: values.DETECTED_FLATPAK_USER_HASH || "",
    appImageHash: appImageFragment?.hash || values.DETECTED_APPIMAGE_HASH || "",
    nativeSystemHashKind: "canvaLinuxSourceHash",
    nativeUserHashKind: "canvaLinuxSourceHash",
    flatpakSystemHashKind: "canvaLinuxSourceHash",
    flatpakUserHashKind: "canvaLinuxSourceHash",
    appImageHashKind: "canvaLinuxSourceHash"
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
import fs12 from "node:fs";
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
import fs11 from "node:fs";
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
    return JSON.parse(fs11.readFileSync(filePath, "utf8"));
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
    return JSON.parse(fs12.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}
function hasGitRepository(rootDir2) {
  return fs12.existsSync(path13.join(rootDir2, ".git"));
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
function missingBuildMetadataError() {
  return new Error("Missing Canva Linux build metadata. Run npm run build:metadata.");
}
function loadEffectiveBuildMetadata(rootDir2, options = {}) {
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
  const packaged = loadPackagedMetadata(resolvedRootDir, metadataModule);
  if (packaged) return packaged;
  if (options.allowFallback) {
    return fallbackEffectiveBuildMetadata(resolvedRootDir, metadataModule);
  }
  throw missingBuildMetadataError();
}

// build-resources/canva-linux/c420ui-adapter/artifacts.ts
import fs14 from "node:fs";
import path15 from "node:path";

// build-resources/canva-linux/actions/registry.ts
import fs13 from "node:fs";
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
    fs13.readFileSync(actionsPath(resolvedRoot), "utf8")
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
  if (!fs14.existsSync(filePath)) {
    throw new Error(`Missing Canva Linux configuration file: ${filePath}`);
  }
  try {
    return JSON.parse(fs14.readFileSync(filePath, "utf8"));
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
import fs15 from "node:fs";
import path16 from "node:path";
function readJsonFile5(filePath) {
  return JSON.parse(fs15.readFileSync(filePath, "utf8"));
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
  return JSON.parse(fs16.readFileSync(filePath, "utf8"));
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
  const buildMetadataPath = path17.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/build-metadata.json"
  );
  const c420uiPackageJsonPath = path17.join(
    resolvedRootDir,
    "build-resources/c420ui/package.json"
  );
  const hostDependenciesJsonPath = path17.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/host-dependencies.json"
  );
  const maintenanceJsonPath = path17.join(
    resolvedRootDir,
    "build-resources/canva-linux/config/maintenance.json"
  );
  function loadProjectUi() {
    return readJsonFile6(projectUiPath);
  }
  function loadPackageJson() {
    return readJsonFile6(packageJsonPath);
  }
  function loadBuildMetadata() {
    return loadEffectiveBuildMetadata(resolvedRootDir);
  }
  function loadC420UIPackageJson() {
    return readJsonFile6(c420uiPackageJsonPath);
  }
  function loadHostDependencies() {
    const config = readJsonFile6(hostDependenciesJsonPath);
    return validateC420UIHostDependencyConfig(config);
  }
  function loadMaintenanceConfig() {
    const config = readJsonFile6(maintenanceJsonPath);
    return validateC420UIMaintenanceConfig(config);
  }
  function getPackageVersion() {
    return loadPackageJson().version ?? "unknown";
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
    const projectUi = loadProjectUi();
    if (projectUi.phase) return projectUi.phase;
    return "unknown";
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
  function getEffectiveProjectSourceHash() {
    return loadBuildMetadata().canvaLinuxSourceHash || "unknown";
  }
  function getEffectiveProjectCombinedSourceHash() {
    return loadBuildMetadata().combinedSourceHash || "unknown";
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
      hash: getEffectiveProjectSourceHash(),
      hashKind: "canvaLinuxSourceHash",
      combinedHash: getEffectiveProjectCombinedSourceHash(),
      combinedHashKind: "combinedSourceHash",
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
      hash: loadBuildMetadata().c420uiSourceHash || "unknown",
      hashKind: "c420uiSourceHash",
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
    if (!fs16.existsSync(actionsJsonPath)) {
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
      sessionId: getSessionId(),
      hostDependencies: loadHostDependencies(),
      maintenance: loadMaintenanceConfig()
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
    hostDependencies: loadHostDependencies,
    maintenance: loadMaintenanceConfig,
    paths: {
      projectUi: projectUiPath,
      packageJson: packageJsonPath,
      actionsJson: actionsJsonPath,
      artifactsJson: artifactsJsonPath,
      buildMetadata: buildMetadataPath,
      c420uiPackageJson: c420uiPackageJsonPath,
      hostDependenciesJson: hostDependenciesJsonPath,
      maintenanceJson: maintenanceJsonPath
    },
    loadProjectInfo: loadProjectConfig,
    loadConfig: toC420UIConfig,
    loadProjectUi,
    loadPackageJson,
    loadBuildMetadata,
    loadProjectConfig,
    loadBrandConfig,
    loadActions: loadCanvaLinuxActions2,
    loadArtifactWorkflows: loadArtifactWorkflows2,
    loadWorkflows,
    loadCapabilities: () => loadCanvaLinuxCapabilities(resolvedRootDir),
    getEffectiveProjectDisplayVersion,
    getEffectiveProjectPhase,
    getEffectiveProjectFullVersion,
    getEffectiveProjectBuildRevision,
    getSessionLogPath,
    getSessionId,
    getToolSettingsPath,
    toC420UIConfig,
    loadHostDependencies,
    loadMaintenanceConfig
  };
  return createC420UIBridge(adapter);
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
        run: () => runC420UIHostDependencyEnsure(config.hostDependencies ?? {}, {
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
