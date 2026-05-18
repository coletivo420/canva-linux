export type c420uiDetectionProbe = {
  id: string;
  label: string;
  run(rootDir: string): Promise<c420uiDetectionProbeResult> | c420uiDetectionProbeResult;
};

export type c420uiDetectionProbeResult = {
  ok: boolean;
  values: Record<string, string>;
  warnings?: string[];
};

export type CanvaLinuxArtifactFragment = {
  id: string;
  kind: string;
  label: string;
  detected: boolean;
  path?: string;
  version?: string;
  fullVersion?: string;
};

export type c420uiOverviewProjectStatus = {
  version: string;
  phase: string;
  appId: string;
  executable: string;
  repository: string;
};

export type c420uiOverviewStatus = {
  project: c420uiOverviewProjectStatus;
  // Installations may include both base *Version fields and effective
  // *FullVersion fields. Renderers should prefer *FullVersion when present
  // and fall back to *Version for older detectors/markers.
  installations: Record<string, boolean | string>;
  artifactFragments?: CanvaLinuxArtifactFragment[];
  warnings: string[];
};

export type c420uiOverviewStatusProvider = {
  id: string;
  label: string;
  buildOverviewStatus(rootDir: string): Promise<c420uiOverviewStatus> | c420uiOverviewStatus;
};

export function parseC420UIDetectionKeyValueLines(
  text: string,
  allowedKeys?: readonly string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  const allowed = allowedKeys ? new Set(allowedKeys) : null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const index = line.indexOf("=");
    if (index <= 0) continue;

    const key = line.slice(0, index);
    if (allowed && !allowed.has(key)) continue;

    result[key] = line.slice(index + 1);
  }

  return result;
}

export function boolFromC420UIDetectionValue(value: string | undefined): boolean {
  return value === "true";
}


export async function runC420UIDetectionProbes(
  probes: readonly c420uiDetectionProbe[],
  rootDir: string,
): Promise<c420uiDetectionProbeResult> {
  const values: Record<string, string> = {};
  const warnings: string[] = [];
  let ok = true;

  for (const probe of probes) {
    try {
      const result = await probe.run(rootDir);
      Object.assign(values, result.values);
      if (!result.ok) ok = false;
      warnings.push(...(result.warnings ?? []));
    } catch (error) {
      ok = false;
      warnings.push(
        `${probe.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { ok, values, warnings };
}

export async function buildC420UIOverviewStatus(
  provider: c420uiOverviewStatusProvider,
  rootDir: string,
): Promise<c420uiOverviewStatus> {
  return await provider.buildOverviewStatus(rootDir);
}
