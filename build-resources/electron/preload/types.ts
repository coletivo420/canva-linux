export type DebugLog = (category: string, ...args: unknown[]) => boolean;
export type EyeDropperLog = (...args: unknown[]) => void;

export type EyeDropperOpenOptions = {
  signal?: AbortSignal;
};

export type EyeDropperResult = {
  sRGBHex: string;
};

export type EyeDropperCtor = new () => {
  open: (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;
};

export type UploadIngress = {
  id: number;
  source: string;
  timestamp: number;
  files?: number;
  types?: string;
  target?: string;
  fileSummary?: string;
  kinds?: string;
};

type ShowOpenFilePicker = ((...args: unknown[]) => Promise<unknown>) & {
  __canvaDebugWrapped?: boolean;
};

declare global {
  interface Window {
    __canvaUploadIngressCounter?: number;
    __canvaLastUploadIngress?: UploadIngress;
    __canvaDragDiagnosticsInstalled?: boolean;
    showOpenFilePicker?: ShowOpenFilePicker;
  }

  var __canvaWrappedEyeDropperInstalled: boolean | undefined;
  var __canvaWrappedEyeDropper: EyeDropperCtor | undefined;
  var __canvaNativeEyeDropper: EyeDropperCtor | undefined;
}

export {};
