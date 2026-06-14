import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const APP_ID = "io.github.coletivo420.canva-linux";

export function detectFlatpakSystemInstall(): boolean {
  try {
    const result = spawnSync("flatpak", ["--system", "info", APP_ID], {
      stdio: "ignore",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function detectFlatpakUserInstall(): boolean {
  try {
    const result = spawnSync("flatpak", ["--user", "info", APP_ID], {
      stdio: "ignore",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function findFlatpakVersionMarker(scopeRoot: string): string {
  const markerBase = `app/${APP_ID}/current/active/files/share/canva-linux/version`;
  const directPath = path.join(scopeRoot, markerBase);

  if (fs.existsSync(directPath)) return directPath;

  const appDir = path.join(scopeRoot, `app/${APP_ID}`);
  if (!fs.existsSync(appDir)) return "";

  // Recursive search for the version marker, limiting depth
  const findVersionMarker = (dir: string, depth: number): string => {
    if (depth > 8) return "";
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findVersionMarker(fullPath, depth + 1);
          if (found) return found;
        } else if (
          entry.isFile() &&
          fullPath.endsWith("/active/files/share/canva-linux/version")
        ) {
          return fullPath;
        }
      }
    } catch {
      // Ignore
    }
    return "";
  };

  return findVersionMarker(appDir, 0);
}

function readFlatpakVersionMarkerKey(
  markerFile: string,
  key: string,
): string {
  if (!fs.existsSync(markerFile)) return "";
  try {
    const raw = fs.readFileSync(markerFile, "utf8").trim();
    if (!raw) return "";

    if (raw.includes(`"${key}"`)) {
      const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
      if (match) return match[1] ?? "";
    }
  } catch {
    // Ignore
  }
  return "";
}

export function readFlatpakVersionMarker(markerFile: string): string {
  if (!fs.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "version");
  if (version) return version;

  try {
    return fs.readFileSync(markerFile, "utf8").split("\n")[0]?.trim() ?? "";
  } catch {
    return "";
  }
}

export function readFlatpakFullVersionMarker(markerFile: string): string {
  if (!fs.existsSync(markerFile)) return "";
  const version = readFlatpakVersionMarkerKey(markerFile, "fullVersion");
  if (version) return version;

  return readFlatpakVersionMarker(markerFile);
}

export function detectFlatpakSystemVersion(): string {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;

  try {
    const result = spawnSync(
      "flatpak",
      ["--system", "info", APP_ID, "--show-version"],
      { encoding: "utf8" },
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}

export function detectFlatpakUserVersion(): string {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path.join(home, ".local/share/flatpak"),
  );
  const version = readFlatpakVersionMarker(marker);
  if (version) return version;

  try {
    const result = spawnSync(
      "flatpak",
      ["--user", "info", APP_ID, "--show-version"],
      { encoding: "utf8" },
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}

export function detectFlatpakSystemFullVersion(): string {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;

  return detectFlatpakSystemVersion();
}

export function detectFlatpakUserFullVersion(): string {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path.join(home, ".local/share/flatpak"),
  );
  const version = readFlatpakFullVersionMarker(marker);
  if (version) return version;

  return detectFlatpakUserVersion();
}

function readFlatpakHashMarker(markerFile: string): string {
  return readFlatpakVersionMarkerKey(markerFile, "canvaLinuxSourceHash");
}

export function detectFlatpakSystemHash(): string {
  const marker = findFlatpakVersionMarker("/var/lib/flatpak");
  return readFlatpakHashMarker(marker);
}

export function detectFlatpakUserHash(): string {
  const home = os.homedir();
  const marker = findFlatpakVersionMarker(
    path.join(home, ".local/share/flatpak"),
  );
  return readFlatpakHashMarker(marker);
}
