import type { DebugLog, UploadIngress } from "./types.js";

type FileLike = {
  name?: string;
  type?: string;
  size?: number;
};

type DataTransferLike = {
  files?: ArrayLike<FileLike>;
  items?: ArrayLike<{ kind?: string; type?: string }>;
  types?: ArrayLike<string>;
  dropEffect?: string;
  effectAllowed?: string;
};

type UploadDiagnosticsScope = Window &
  typeof globalThis & {
    __canvaUploadIngressCounter?: number;
    __canvaLastUploadIngress?: UploadIngress;
    __canvaDragDiagnosticsInstalled?: boolean;
    showOpenFilePicker?: ((...args: unknown[]) => Promise<unknown>) & {
      __canvaDebugWrapped?: boolean;
    };
  };

type DataTransferSummary = {
  files: number;
  fileSummary: string;
  items: string;
  kinds: string;
  types: string;
  dropEffect: string;
  effectAllowed: string;
  target: string;
};

export function describeDragTarget(
  target: EventTarget | null | undefined | { tagName?: unknown; id?: unknown; className?: unknown },
): string {
  if (!target || typeof target !== "object") return "unknown";
  const element = target as { tagName?: unknown; id?: unknown; className?: unknown };
  const tagName = element.tagName ? String(element.tagName).toLowerCase() : "node";
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string" && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tagName}${id}${className}`;
}

export function describeFileInput(
  target: EventTarget | null | undefined,
): { accept: string; multiple: string; webkitdirectory: string; target: string } | null {
  if (!(target instanceof HTMLInputElement) || target.type !== "file") return null;
  return {
    accept: target.accept || "any",
    multiple: target.multiple ? "true" : "false",
    webkitdirectory: target.webkitdirectory ? "true" : "false",
    target: describeDragTarget(target),
  };
}

function getUploadDiagnosticsScope(): UploadDiagnosticsScope {
  return globalThis as UploadDiagnosticsScope;
}

function nextUploadIngressId(): number {
  const scope = getUploadDiagnosticsScope();
  scope.__canvaUploadIngressCounter = (scope.__canvaUploadIngressCounter || 0) + 1;
  return scope.__canvaUploadIngressCounter;
}

export function formatFileDescriptor(file: FileLike | null | undefined): string {
  if (!file) return "unknown";
  const name = typeof file.name === "string" && file.name ? file.name : "blob";
  const type = typeof file.type === "string" && file.type ? file.type : "unknown";
  const size = Number.isFinite(file.size) ? Number(file.size) : 0;
  return `${name}:${type}:${size}`;
}

export function summarizeFiles(files: ArrayLike<FileLike> | null | undefined, limit = 3): string {
  if (!files || typeof files.length !== "number" || files.length < 1) return "none";
  return Array.from(files)
    .slice(0, limit)
    .map((file) => formatFileDescriptor(file))
    .join(",");
}

export function summarizeClipboardKinds(dataTransfer: DataTransferLike | null | undefined): string {
  const kinds = new Set<string>();
  const types = dataTransfer?.types ? Array.from(dataTransfer.types) : [];
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
  if (dataTransfer?.files?.length) kinds.add("files");
  for (const item of items) {
    if (item.kind === "file") {
      kinds.add("files");
      if ((item.type || "").startsWith("image/")) kinds.add("image");
    }
    if (item.kind === "string") {
      if (item.type === "text/html") kinds.add("html");
      if (item.type === "text/plain") kinds.add("text");
      if (item.type === "text/uri-list") kinds.add("url");
    }
  }
  for (const type of types) {
    if (type === "text/html") kinds.add("html");
    if (type === "text/plain") kinds.add("text");
    if (type === "text/uri-list") kinds.add("url");
    if (type.startsWith("image/")) kinds.add("image");
  }
  return kinds.size ? Array.from(kinds).join(",") : "none";
}

export function rememberUploadIngress(source: string, info: Partial<UploadIngress> = {}): UploadIngress {
  const scope = getUploadDiagnosticsScope();
  const ingress: UploadIngress = {
    id: nextUploadIngressId(),
    source,
    timestamp: Date.now(),
    ...info,
  };
  scope.__canvaLastUploadIngress = ingress;
  return ingress;
}

export function recentUploadIngressSummary(): string {
  const scope = getUploadDiagnosticsScope();
  const ingress = scope.__canvaLastUploadIngress;
  if (!ingress || !ingress.timestamp) return "id=none source=none";
  const ageMs = Math.max(0, Date.now() - ingress.timestamp);
  return [
    `id=${ingress.id || "none"}`,
    `source=${ingress.source || "unknown"}`,
    `ageMs=${ageMs}`,
    `files=${ingress.files ?? 0}`,
    `types=${ingress.types || "none"}`,
    ingress.target || "unknown",
  ].join(" ");
}

function errorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  return "Error";
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error || "");
}

export function installUploadDiagnostics({
  debugEnabled,
  debugLog,
}: {
  debugEnabled: (category?: string) => boolean;
  debugLog: DebugLog;
}): void {
  const scope = getUploadDiagnosticsScope();
  if (scope.__canvaDragDiagnosticsInstalled) return;
  scope.__canvaDragDiagnosticsInstalled = true;

  const summarizeDataTransfer = (
    dataTransfer: DataTransferLike | null | undefined,
    target: EventTarget | null | undefined,
  ): DataTransferSummary => {
    const files = dataTransfer?.files ? Array.from(dataTransfer.files) : [];
    const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
    const types = dataTransfer?.types ? Array.from(dataTransfer.types) : [];
    return {
      files: files.length,
      fileSummary: summarizeFiles(files),
      items: items.map((item) => `${item.kind}:${item.type || "unknown"}`).join(","),
      kinds: summarizeClipboardKinds(dataTransfer),
      types: types.join(","),
      dropEffect: dataTransfer?.dropEffect || "none",
      effectAllowed: dataTransfer?.effectAllowed || "none",
      target: describeDragTarget(target),
    };
  };

  const recordIngressFromDataTransfer = (
    source: string,
    info: DataTransferSummary,
  ): UploadIngress | null => {
    if (!info || (info.files < 1 && (!info.items || info.items === "none") && (!info.types || info.types === "none"))) {
      return null;
    }
    return rememberUploadIngress(source, {
      files: info.files,
      types: info.types,
      target: info.target,
      fileSummary: info.fileSummary,
      kinds: info.kinds,
    });
  };

  const logDrag = (label: string, event: DragEvent): void => {
    if (!debugEnabled("dnd")) return;
    const info = summarizeDataTransfer(event.dataTransfer, event.target);
    const ingress = label === "drop" ? recordIngressFromDataTransfer("drop", info) : null;
    debugLog(
      "dnd",
      label,
      ingress ? `id=${ingress.id}` : "id=none",
      `files=${info.files}`,
      `fileSummary=${info.fileSummary || "none"}`,
      `items=${info.items || "none"}`,
      `kinds=${info.kinds || "none"}`,
      `types=${info.types || "none"}`,
      `dropEffect=${info.dropEffect}`,
      `effectAllowed=${info.effectAllowed}`,
      info.target,
    );
  };

  const logUploadInput = (
    label: string,
    target: EventTarget | null | undefined,
    { remember = true }: { remember?: boolean } = {},
  ): void => {
    const info = describeFileInput(target);
    if (!info) return;
    const ingress = remember
      ? rememberUploadIngress(label, { files: 0, types: "file-input", target: info.target })
      : null;
    debugLog(
      "upload",
      label,
      ingress ? `id=${ingress.id}` : "id=none",
      `accept=${info.accept}`,
      `multiple=${info.multiple}`,
      `webkitdirectory=${info.webkitdirectory}`,
      info.target,
    );
  };

  window.addEventListener("dragenter", (event) => logDrag("enter", event), true);
  window.addEventListener("dragover", (event) => logDrag("over", event), true);
  window.addEventListener("dragleave", (event) => logDrag("leave", event), true);
  window.addEventListener("dragstart", (event) => logDrag("start", event), true);
  window.addEventListener(
    "dragend",
    (event) => {
      logDrag("end", event);
      queueMicrotask(() => {
        try {
          window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, buttons: 0 }));
          document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, buttons: 0 }));
        } catch {}
      });
    },
    true,
  );
  window.addEventListener(
    "drop",
    (event) => {
      logDrag("drop", event);
      debugLog("upload", "drop-ingress", recentUploadIngressSummary());
      queueMicrotask(() => {
        try {
          window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, buttons: 0 }));
          document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, buttons: 0 }));
        } catch {}
      });
    },
    true,
  );
  window.addEventListener(
    "paste",
    (event) => {
      const info = summarizeDataTransfer(event.clipboardData, event.target);
      if (info.files < 1 && !info.items) return;
      recordIngressFromDataTransfer("paste", info);
      debugLog(
        "upload",
        "paste",
        `files=${info.files}`,
        `items=${info.items || "none"}`,
        `types=${info.types || "none"}`,
        info.target,
      );
    },
    true,
  );

  document.addEventListener("click", (event) => logUploadInput("input-click", event.target), true);

  document.addEventListener(
    "change",
    (event) => {
      debugLog("upload", "document-change", describeDragTarget(event.target));
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "file") return;
      logUploadInput("input-change-meta", target);
      debugLog("upload", "input-change", `files=${target.files ? target.files.length : 0}`, describeDragTarget(target));
    },
    true,
  );

  if (typeof scope.showOpenFilePicker === "function" && !scope.showOpenFilePicker.__canvaDebugWrapped) {
    const original = scope.showOpenFilePicker.bind(scope);
    const wrapped = (async (...args: unknown[]) => {
      debugLog("upload", "show-open-file-picker", `args=${args.length}`);
      try {
        const handles = await original(...args);
        debugLog("upload", "show-open-file-picker-result", `handles=${Array.isArray(handles) ? handles.length : 0}`);
        return handles;
      } catch (error) {
        debugLog("upload", "show-open-file-picker-error", errorName(error), errorMessage(error));
        throw error;
      }
    }) as typeof scope.showOpenFilePicker;

    wrapped.__canvaDebugWrapped = true;
    scope.showOpenFilePicker = wrapped;
  }
}
