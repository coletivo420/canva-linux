'use strict';

export type CLEyeDropperHex = `#${string}`;

export type CLEyeDropperResult = {
  sRGBHex: string;
};

export type CLEyeDropperOpenOptions = {
  signal?: AbortSignal;
};

export type CLEyeDropperSnapshot = {
  dataUrl: string;
  width?: number;
  height?: number;
  cssWidth?: number;
  cssHeight?: number;
};

export type CLEyeDropperLogger = (category: string, ...args: unknown[]) => void;

export type CLEyeDropperOpenTarget = HTMLCanvasElement | CanvasRenderingContext2D;
