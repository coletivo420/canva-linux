import fs from "node:fs";

export type PermissionValidation = {
  ok: boolean;
  failures: string[];
};

export const FLATPAK_FORBIDDEN_PERMISSIONS = [
  "--filesystem=home",
  "--device=all",
  "--socket=session-bus",
  "--socket=system-bus",
  "--talk-name=org.freedesktop.portal.Desktop",
  "--talk-name=org.freedesktop.ScreenSaver",
] as const;

export const FLATPAK_REQUIRED_PERMISSIONS = [
  "--talk-name=org.freedesktop.secrets",
  "--filesystem=xdg-download",
  "--filesystem=xdg-run/pipewire-0",
  "--talk-name=org.freedesktop.FileManager1",
] as const;

export function extractFinishArgs(content: string): string[] {
  return content
    .split("\n")
    .filter((line) => line.trimStart().startsWith("- --"))
    .map((line) => (line.trim().replace(/^- /, "").split(/\s+#/)[0] ?? "").trim());
}

export function validateFlatpakPermissions(
  manifests: string[],
): PermissionValidation {
  const failures: string[] = [];
  const byManifest = new Map<string, string[]>();

  for (const manifestPath of manifests) {
    const content = fs.readFileSync(manifestPath, "utf8");
    const finishArgs = extractFinishArgs(content);
    byManifest.set(manifestPath, finishArgs);

    for (const token of FLATPAK_FORBIDDEN_PERMISSIONS) {
      if (finishArgs.includes(token)) {
        failures.push(`${manifestPath}: forbidden permission present: ${token}`);
      }
    }

    for (const token of FLATPAK_REQUIRED_PERMISSIONS) {
      if (!finishArgs.includes(token)) {
        failures.push(`${manifestPath}: required permission missing: ${token}`);
      }
    }
  }

  if (manifests.length >= 2) {
    const localManifest = manifests[0];
    const submissionManifest = manifests[1];
    if (!localManifest || !submissionManifest) {
      return { ok: failures.length === 0, failures };
    }
    const localSet = new Set(byManifest.get(localManifest) ?? []);
    const submissionSet = new Set(byManifest.get(submissionManifest) ?? []);

    const localOnly = [...localSet].filter((token) => !submissionSet.has(token));
    const submissionOnly = [...submissionSet].filter((token) => !localSet.has(token));

    if (localOnly.length || submissionOnly.length) {
      failures.push("Manifest permission policy mismatch detected.");
      if (localOnly.length) failures.push(`${localManifest} only: ${localOnly.join(", ")}`);
      if (submissionOnly.length) failures.push(`${submissionManifest} only: ${submissionOnly.join(", ")}`);
    }
  }

  return { ok: failures.length === 0, failures };
}
