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

function unsupportedDebugValue(): Error {
  return new Error("Unsupported --debug value. Use --debug=1 or --debug=2.");
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
    if (arg === "--debug" || arg.startsWith("--debug=")) {
      const value = readRequiredValue(arg, "--debug", unsupportedDebugValue().message);
      if (value !== "1" && value !== "2") throw unsupportedDebugValue();
      options.debugLevel = Number(value) as 1 | 2;
      continue;
    }
    if (arg === "--credential-store" || arg.startsWith("--credential-store=")) {
      const value = readRequiredValue(
        arg,
        "--credential-store",
        "Unsupported --credential-store value. Use auto, gnome-libsecret, kwallet6, or kwallet5.",
      );
      if (!CREDENTIAL_STORES.has(value as RuntimeCredentialStore)) {
        throw new Error(
          "Unsupported --credential-store value. Use auto, gnome-libsecret, kwallet6, or kwallet5.",
        );
      }
      options.credentialStore = value as RuntimeCredentialStore;
      continue;
    }
    if (arg === "--gpu-backend" || arg.startsWith("--gpu-backend=")) {
      const value = readRequiredValue(
        arg,
        "--gpu-backend",
        "Unsupported --gpu-backend value. Use auto, opengl, vulkan, software, or force.",
      );
      if (!GPU_BACKENDS.has(value as RuntimeGpuBackend)) {
        throw new Error(
          "Unsupported --gpu-backend value. Use auto, opengl, vulkan, software, or force.",
        );
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
