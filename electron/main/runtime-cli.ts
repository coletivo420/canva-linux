type RuntimeDebugLevel = 0 | 1 | 2;

type RuntimeCredentialStore =
  | "auto"
  | "gnome-libsecret"
  | "kwallet6"
  | "kwallet5";

type RuntimeGpuBackend = "auto" | "opengl" | "vulkan" | "software" | "force";

type CanvaLinuxRuntimeCliOptions = {
  help: boolean;
  version: boolean;
  debugLevel: RuntimeDebugLevel;
  credentialStore: RuntimeCredentialStore;
  gpuBackend: RuntimeGpuBackend;
  forceX11: boolean;
  forceWayland: boolean;
  disableWaylandColorManager: boolean;
  passthroughArgs: string[];
};

const CREDENTIAL_STORES = new Set<RuntimeCredentialStore>([
  "auto",
  "gnome-libsecret",
  "kwallet6",
  "kwallet5",
]);

const GPU_BACKENDS = new Set<RuntimeGpuBackend>([
  "auto",
  "opengl",
  "vulkan",
  "software",
  "force",
]);

const UNSUPPORTED_DEBUG_MESSAGE =
  "Unsupported --debug value. Use --debug=1 or --debug=2.";
const UNSUPPORTED_CREDENTIAL_STORE_MESSAGE =
  "Unsupported --credential-store value. Use auto, gnome-libsecret, kwallet6, or kwallet5.";
const UNSUPPORTED_GPU_BACKEND_MESSAGE =
  "Unsupported --gpu-backend value. Use auto, opengl, vulkan, software, or force.";

function unsupportedDebugValue(): Error {
  return new Error(UNSUPPORTED_DEBUG_MESSAGE);
}

function matchesValuedOption(arg: string, option: string): boolean {
  return arg.startsWith(`${option}=`);
}

function readRequiredValue(arg: string, option: string, message: string): string {
  if (arg === option) throw new Error(message);
  const prefix = `${option}=`;
  if (!arg.startsWith(prefix)) throw new Error(message);
  return arg.slice(prefix.length).trim();
}

function parseCanvaLinuxRuntimeCli(
  argv = process.argv,
): CanvaLinuxRuntimeCliOptions {
  const options: CanvaLinuxRuntimeCliOptions = {
    help: false,
    version: false,
    debugLevel: 0,
    credentialStore: "auto",
    gpuBackend: "auto",
    forceX11: false,
    forceWayland: false,
    disableWaylandColorManager: false,
    passthroughArgs: [],
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--version" || arg === "-v") {
      options.version = true;
      continue;
    }
    if (arg === "--debug") throw new Error(UNSUPPORTED_DEBUG_MESSAGE);
    if (arg === "--credential-store") {
      throw new Error(UNSUPPORTED_CREDENTIAL_STORE_MESSAGE);
    }
    if (arg === "--gpu-backend") throw new Error(UNSUPPORTED_GPU_BACKEND_MESSAGE);
    if (matchesValuedOption(arg, "--debug")) {
      const value = readRequiredValue(arg, "--debug", UNSUPPORTED_DEBUG_MESSAGE);
      if (value !== "1" && value !== "2") throw unsupportedDebugValue();
      options.debugLevel = Number(value) as 1 | 2;
      continue;
    }
    if (matchesValuedOption(arg, "--credential-store")) {
      const value = readRequiredValue(
        arg,
        "--credential-store",
        UNSUPPORTED_CREDENTIAL_STORE_MESSAGE,
      );
      if (!CREDENTIAL_STORES.has(value as RuntimeCredentialStore)) {
        throw new Error(UNSUPPORTED_CREDENTIAL_STORE_MESSAGE);
      }
      options.credentialStore = value as RuntimeCredentialStore;
      continue;
    }
    if (matchesValuedOption(arg, "--gpu-backend")) {
      const value = readRequiredValue(
        arg,
        "--gpu-backend",
        UNSUPPORTED_GPU_BACKEND_MESSAGE,
      );
      if (!GPU_BACKENDS.has(value as RuntimeGpuBackend)) {
        throw new Error(UNSUPPORTED_GPU_BACKEND_MESSAGE);
      }
      options.gpuBackend = value as RuntimeGpuBackend;
      continue;
    }
    if (arg === "--force-x11") {
      options.forceX11 = true;
      continue;
    }
    if (arg === "--force-wayland") {
      options.forceWayland = true;
      continue;
    }
    if (arg === "--disable-wayland-color-manager") {
      options.disableWaylandColorManager = true;
      continue;
    }

    options.passthroughArgs.push(arg);
  }

  if (options.forceX11 && options.forceWayland) {
    throw new Error("Use either --force-x11 or --force-wayland, not both.");
  }

  return options;
}

function printCanvaLinuxRuntimeHelp(): string {
  return `Canva Linux

Usage:
  canva-linux [options]

Options:
  --help                         Show help
  --version                      Show version

Debug:
  --debug=1                      Enable Canva Linux internal diagnostics
  --debug=2                      Enable internal diagnostics plus verbose Chromium/Electron stderr logging

Credential storage:
  --credential-store=auto        Automatically resolve native Linux credential storage
  --credential-store=gnome-libsecret
  --credential-store=kwallet6
  --credential-store=kwallet5

Display / GPU:
  --gpu-backend=auto
  --gpu-backend=opengl
  --gpu-backend=vulkan
  --gpu-backend=software
  --gpu-backend=force
  --force-x11
  --force-wayland
  --disable-wayland-color-manager`;
}

function applyCanvaLinuxRuntimeCliEarly(
  options: CanvaLinuxRuntimeCliOptions,
): CanvaLinuxRuntimeCliOptions {
  return options;
}

export {
  applyCanvaLinuxRuntimeCliEarly,
  parseCanvaLinuxRuntimeCli,
  printCanvaLinuxRuntimeHelp,
};

export type {
  CanvaLinuxRuntimeCliOptions,
  RuntimeCredentialStore,
  RuntimeDebugLevel,
  RuntimeGpuBackend,
};
