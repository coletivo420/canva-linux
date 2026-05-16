type LinuxCredentialRuntimeEnvironment = NodeJS.ProcessEnv;

type LinuxPasswordStorePreference = {
  preferredStore: "gnome-libsecret" | "kwallet6";
  desktop: string;
  isKde: boolean;
};

function normalizeDesktopValue(value: string | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectDesktopHints(
  env: LinuxCredentialRuntimeEnvironment = process.env,
): string[] {
  return [
    env.XDG_CURRENT_DESKTOP,
    env.XDG_SESSION_DESKTOP,
    env.DESKTOP_SESSION,
    env.KDE_FULL_SESSION === "true" || env.KDE_FULL_SESSION === "1"
      ? "kde"
      : undefined,
  ]
    .map(normalizeDesktopValue)
    .filter(Boolean);
}

function selectLinuxPasswordStore(
  env: LinuxCredentialRuntimeEnvironment = process.env,
): LinuxPasswordStorePreference {
  const desktopHints = collectDesktopHints(env);
  const desktop = desktopHints.join(";") || "unknown";
  const isKde = desktopHints.some((hint) =>
    hint.split(" ").some((token) => token === "kde" || token === "plasma"),
  );

  return {
    desktop,
    isKde,
    preferredStore: isKde ? "kwallet6" : "gnome-libsecret",
  };
}

type CommandLineLike = {
  appendSwitch(name: string, value?: string): void;
};

type ElectronAppLike = {
  commandLine: CommandLineLike;
};

function configureLinuxNativeCredentialStore({
  app,
  env = process.env,
  platform = process.platform,
}: {
  app: ElectronAppLike;
  env?: LinuxCredentialRuntimeEnvironment;
  platform?: NodeJS.Platform;
}): LinuxPasswordStorePreference | null {
  if (platform !== "linux") {
    return null;
  }

  const preference = selectLinuxPasswordStore(env);
  app.commandLine.appendSwitch("password-store", preference.preferredStore);
  return preference;
}

export {
  collectDesktopHints,
  configureLinuxNativeCredentialStore,
  selectLinuxPasswordStore,
};

export type { LinuxPasswordStorePreference };
