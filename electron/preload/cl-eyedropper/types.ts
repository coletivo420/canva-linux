"use strict";

export type RgbTuple = [number, number, number];

export type LTCodeCompatibleResult = {
  hex: string;
  rgb: RgbTuple;
};

export type CLEyeDropperOptions = {
  overlay?: Record<string, any>;
  magnifier?: Record<string, any>;
  preview?: Record<string, any>;
  renderPreview?: (pixel: unknown) => string;
  onPick?: (payload: unknown) => void;
};

export type CLEyeDropperOpenOptions = Record<string, unknown>;

export type EyeDropperLog = (...args: unknown[]) => void;

export type CLEyeDropperOpenTarget =
  | HTMLCanvasElement
  | CanvasRenderingContext2D;
