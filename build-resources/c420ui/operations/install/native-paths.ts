export type NativeScope = "system" | "user";

export function resolveNativeScope(env: NodeJS.ProcessEnv): NativeScope {
  return env.CANVA_NATIVE_SCOPE === "user" ? "user" : "system";
}
