export type C420UIVersionInfo = {
  packageName: string;
  packageVersion: string;
  sourceHash: string | null;
};

export function shortSourceHash(hash: string | null | undefined): string {
  if (!hash || hash === "unknown") return "hash unknown";

  if (hash.startsWith("sha256:")) {
    const digest = hash.slice("sha256:".length);
    return `sha256:${digest.slice(0, 8)}`;
  }

  return hash.slice(0, 12);
}

export function formatC420UIVersionLabel(info: C420UIVersionInfo): string {
  return `${info.packageName} ${info.packageVersion} · ${shortSourceHash(info.sourceHash)}`;
}
