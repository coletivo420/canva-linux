export type FlatpakScope = "system" | "user";

export function resolveFlatpakScope(env: NodeJS.ProcessEnv): FlatpakScope {
  return env.CANVA_FLATPAK_SCOPE === "user" ? "user" : "system";
}

export function flatpakScopeArg(scope: FlatpakScope): string {
  return scope === "system" ? "--system" : "--user";
}
