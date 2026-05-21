import type {
  CLEyeDropperOpenTarget,
  CLEyeDropperOptions,
  EyeDropperLog,
  LTCodeCompatibleResult,
  RgbTuple,
} from "./types";

type LastPixel = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  hex: string;
  rgb: RgbTuple;
};

type CanvasCache = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  magW: number;
  magH: number;
};

type MagnifierCache = {
  size: number;
  zoom: number;
};

type BoundMouseHandler = (event: MouseEvent) => void;

export class CLEyeDropper {
  options: CLEyeDropperOptions;

  _resolve?: (result: LTCodeCompatibleResult) => void;

  _container: HTMLDivElement | null = null;

  _canvas: HTMLCanvasElement | null = null;

  _magnifier: HTMLDivElement | null = null;

  _crosshair: HTMLDivElement | null = null;

  _preview: HTMLDivElement | null = null;

  _previewColor: HTMLDivElement | null = null;

  _colorDisplay: HTMLSpanElement | null = null;

  _lastPixel: LastPixel | null = null;

  _currentPosition: { x: number; y: number } | null = null;

  _canvasCache: CanvasCache | null = null;

  _magnifierCache: MagnifierCache | null = null;

  _magCanvas: HTMLCanvasElement | null = null;

  _magCtx: CanvasRenderingContext2D | null = null;

  _mouseThrottle = false;

  _onMouseMoveBound?: BoundMouseHandler;

  _onMouseLeaveBound?: BoundMouseHandler;

  _onMouseEnterBound?: BoundMouseHandler;

  _onClickBound?: BoundMouseHandler;

  constructor(options: CLEyeDropperOptions = {}) {
    this.options = options;
  }

  open(
    canvasOrContext: CLEyeDropperOpenTarget,
    options: CLEyeDropperOptions = {},
  ): Promise<LTCodeCompatibleResult> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error(
        "EyeDropper can only be used in the browser environment.",
      );
    }
    this.options = { ...this.options, ...options };
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._createUI(canvasOrContext);
    });
  }

  _createUI(canvasOrContext: CLEyeDropperOpenTarget): void {
    this._removeUI();

    let canvas: HTMLCanvasElement;
    if (canvasOrContext instanceof HTMLCanvasElement) {
      canvas = canvasOrContext;
    } else if (
      canvasOrContext &&
      typeof canvasOrContext.getImageData === "function"
    ) {
      canvas = canvasOrContext.canvas;
    } else {
      throw new Error(
        "You must provide a valid canvas or 2D context to EyeDropper.",
      );
    }
    this._canvas = canvas;

    const ctx = this._canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas.");
    }

    this._container = document.createElement("div");
    this._container.className = "eyedropper-overlay";
    this._container.id = "eyedropper-overlay";
    Object.assign(this._container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background:
        (this.options.overlay && this.options.overlay.background) ||
        "rgba(0,0,0,0.0)",
      zIndex: (this.options.overlay && this.options.overlay.zIndex) || 99999,
      pointerEvents: "none",
      ...(this.options.overlay && this.options.overlay.style),
    });
    document.body.appendChild(this._container);

    const magOpt = this.options.magnifier || {};
    this._magnifier = document.createElement("div");
    this._magnifier.className = "eyedropper-magnifier";
    this._magnifier.id = "eyedropper-magnifier";
    Object.assign(this._magnifier.style, {
      position: "absolute",
      pointerEvents: "none",
      width: magOpt.width || "80px",
      height: magOpt.height || "80px",
      border: magOpt.border || "2px solid #333",
      borderRadius: magOpt.borderRadius || "50%",
      overflow: magOpt.overflow || "hidden",
      boxShadow: magOpt.boxShadow || "0 2px 8px #0008",
      zIndex: magOpt.zIndex || 100000,
      display: "none",
      background: magOpt.background || "#fff",
      ...magOpt.style,
    });
    this._container.appendChild(this._magnifier);

    this._canvasCache = {
      ctx,
      width: this._canvas.width,
      height: this._canvas.height,
      scaleX:
        this._canvas.width /
        Math.max(1, this._canvas.getBoundingClientRect().width),
      scaleY:
        this._canvas.height /
        Math.max(1, this._canvas.getBoundingClientRect().height),
      magW: parseInt(magOpt.width || "80", 10),
      magH: parseInt(magOpt.height || "80", 10),
    };

    this._crosshair = document.createElement("div");
    this._crosshair.className = "eyedropper-crosshair";
    this._crosshair.id = "eyedropper-crosshair";
    Object.assign(this._crosshair.style, {
      position: "absolute",
      pointerEvents: "none",
      width: "6px",
      height: "6px",
      border: "1px solid #000",
      backgroundColor: "transparent",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: "1",
      boxSizing: "border-box",
    });
    this._magnifier.appendChild(this._crosshair);

    const prevOpt = this.options.preview || {};
    this._preview = document.createElement("div");
    this._preview.className = "eyedropper-preview";
    this._preview.id = "eyedropper-preview";
    Object.assign(this._preview.style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      padding: prevOpt.padding || "10px 18px",
      background: prevOpt.background || "#fff",
      borderRadius: prevOpt.borderRadius || "8px",
      boxShadow: prevOpt.boxShadow || "0 2px 8px #0002",
      fontFamily: prevOpt.fontFamily || "monospace",
      fontSize: prevOpt.fontSize || "1.1em",
      display: "none",
      alignItems: prevOpt.alignItems || "center",
      gap: prevOpt.gap || "12px",
      zIndex: prevOpt.zIndex || 100001,
      pointerEvents: "none",
      minWidth: prevOpt.minWidth || "80px",
      ...prevOpt.style,
    });

    this._previewColor = document.createElement("div");
    this._previewColor.className = "eyedropper-preview-color";
    this._previewColor.id = "eyedropper-preview-color";
    Object.assign(this._previewColor.style, {
      width: "20px",
      height: "20px",
      borderRadius: "3px",
      border: "1px solid #ccc",
      flexShrink: "0",
    });

    this._colorDisplay = document.createElement("span");
    this._colorDisplay.className = "eyedropper-color-display";
    this._colorDisplay.id = "eyedropper-color-display";
    this._colorDisplay.textContent = "";

    this._preview.appendChild(this._previewColor);
    this._preview.appendChild(this._colorDisplay);
    this._container.appendChild(this._preview);

    this._lastPixel = null;

    this._onMouseMoveBound = this._throttledMouseMove.bind(this);
    this._onMouseLeaveBound = this._onMouseLeave.bind(this);
    this._onMouseEnterBound = this._onMouseEnter.bind(this);
    this._onClickBound = this._onClick.bind(this);
    this._canvas.addEventListener("mousemove", this._onMouseMoveBound, {
      passive: true,
    });
    this._canvas.addEventListener("mouseleave", this._onMouseLeaveBound, {
      passive: true,
    });
    this._canvas.addEventListener("mouseenter", this._onMouseEnterBound, {
      passive: true,
    });
    this._canvas.addEventListener("click", this._onClickBound);
  }

  _throttledMouseMove(event: MouseEvent): void {
    if (!this._mouseThrottle) {
      this._mouseThrottle = true;
      requestAnimationFrame(() => {
        this._onMouseMove(event);
        this._mouseThrottle = false;
      });
    }
  }

  _onMouseEnter(): void {
    if (!this._canvas || !this._magnifier) return;
    this._canvas.style.cursor = "none";
    this._magnifier.style.display = "block";
  }

  _onMouseMove(event: MouseEvent): void {
    if (
      !this._canvas ||
      !this._canvasCache ||
      !this._previewColor ||
      !this._colorDisplay ||
      !this._preview
    ) {
      return;
    }

    const rect = this._canvas.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(
        this._canvasCache.width - 1,
        Math.floor((event.clientX - rect.left) * this._canvasCache.scaleX),
      ),
    );
    const y = Math.max(
      0,
      Math.min(
        this._canvasCache.height - 1,
        Math.floor((event.clientY - rect.top) * this._canvasCache.scaleY),
      ),
    );

    const imageData = this._canvasCache.ctx.getImageData(x, y, 1, 1);
    const [r = 0, g = 0, b = 0] = imageData.data;

    const hexColor = this._rgbToHex(r, g, b);
    this._previewColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    this._colorDisplay.textContent = hexColor;
    this._preview.style.display = "flex";
    this._updateMagnifier(x, y, event, [r, g, b], hexColor);
  }

  _updateMagnifier(
    x: number,
    y: number,
    event: MouseEvent,
    rgb: RgbTuple,
    hex: string,
  ): void {
    if (!this._magnifier || !this._canvasCache || !this._preview) return;
    this._magnifier.style.left = `${event.clientX - this._canvasCache.magW / 2}px`;
    this._magnifier.style.top = `${event.clientY - this._canvasCache.magH / 2}px`;
    this._drawMagnifier(x, y);

    const previewRect = {
      w: this._preview.offsetWidth,
      h: this._preview.offsetHeight,
    };
    const px = event.clientX - this._canvasCache.magW / 2;
    const py = event.clientY + this._canvasCache.magH / 2 + 8;
    this._preview.style.left = `${px + this._canvasCache.magW / 2 - previewRect.w / 2}px`;
    this._preview.style.top = `${py}px`;

    this._lastPixel = {
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      hex,
      rgb,
    };
  }

  _onMouseLeave(): void {
    if (
      !this._canvas ||
      !this._magnifier ||
      !this._preview ||
      !this._canvasCache
    )
      return;

    if (
      this._lastPixel &&
      this._canvasCache &&
      this._lastPixel.hex &&
      this._lastPixel.rgb
    ) {
      this._magnifier.style.left = `${this._lastPixel.clientX - this._canvasCache.magW / 2}px`;
      this._magnifier.style.top = `${this._lastPixel.clientY - this._canvasCache.magH / 2}px`;
      this._drawMagnifier(this._lastPixel.x, this._lastPixel.y);

      if (typeof this.options.renderPreview === "function") {
        this._preview.innerHTML = this.options.renderPreview(this._lastPixel);
      } else {
        if (!this._previewColor || !this._colorDisplay) return;
        this._previewColor.style.backgroundColor = `rgb(${this._lastPixel.rgb[0]}, ${this._lastPixel.rgb[1]}, ${this._lastPixel.rgb[2]})`;
        this._colorDisplay.textContent = this._lastPixel.hex;
        this._preview.style.display = "flex";
      }

      const previewRect = {
        w: this._preview.offsetWidth,
        h: this._preview.offsetHeight,
      };
      const px = this._lastPixel.clientX - this._canvasCache.magW / 2;
      const py = this._lastPixel.clientY + this._canvasCache.magH / 2 + 8;
      this._preview.style.left = `${px + this._canvasCache.magW / 2 - previewRect.w / 2}px`;
      this._preview.style.top = `${py}px`;
    } else {
      this._canvas.style.cursor = "default";
      this._magnifier.style.display = "none";
      this._preview.style.display = "none";
    }
  }

  _onClick(event: MouseEvent): void {
    if (!this._canvas || !this._canvasCache) return;

    if (this._lastPixel) {
      const { hex, rgb, x, y } = this._lastPixel;
      if (typeof this.options.onPick === "function") {
        this.options.onPick({ hex, rgb, x, y, event });
      }
      this._resolve?.({ hex, rgb });
    } else {
      const position =
        this._currentPosition ||
        (() => {
          if (!this._canvas || !this._canvasCache) return { x: 0, y: 0 };
          const rect = this._canvas.getBoundingClientRect();
          return {
            x: Math.floor(
              (event.clientX - rect.left) *
                (this._canvasCache?.scaleX || this._canvas.width / rect.width),
            ),
            y: Math.floor(
              (event.clientY - rect.top) *
                (this._canvasCache?.scaleY ||
                  this._canvas.height / rect.height),
            ),
          };
        })();

      const imageData = this._canvasCache.ctx.getImageData(
        position.x,
        position.y,
        1,
        1,
      );
      const [r = 0, g = 0, b = 0] = imageData.data;
      const hex = this._rgbToHex(r, g, b);
      const rgb: RgbTuple = [r, g, b];

      if (typeof this.options.onPick === "function") {
        this.options.onPick({ hex, rgb, x: position.x, y: position.y, event });
      }
      this._resolve?.({ hex, rgb });
    }
    this._removeUI();
  }

  _drawMagnifier(x: number, y: number): void {
    if (!this._canvas || !this._magnifier || !this._crosshair) return;

    if (!this._magnifierCache) {
      this._magnifierCache = {
        size: (this.options.magnifier && this.options.magnifier.size) || 20,
        zoom: (this.options.magnifier && this.options.magnifier.zoom) || 4,
      };
    }

    const { size, zoom } = this._magnifierCache;

    if (!this._magCanvas) {
      this._magCanvas = document.createElement("canvas");
      this._magCanvas.className = "eyedropper-magnifier-canvas";
      this._magCanvas.id = "eyedropper-magnifier-canvas";
      this._magnifier.insertBefore(this._magCanvas, this._crosshair);
    }

    const newWidth = size * zoom;
    const newHeight = size * zoom;
    if (
      this._magCanvas.width !== newWidth ||
      this._magCanvas.height !== newHeight
    ) {
      this._magCanvas.width = newWidth;
      this._magCanvas.height = newHeight;
    }

    if (!this._magCtx) {
      this._magCtx = this._magCanvas.getContext("2d");
      if (!this._magCtx) return;
      this._magCtx.imageSmoothingEnabled = false;
    }

    this._magCtx.drawImage(
      this._canvas,
      x - size / 2,
      y - size / 2,
      size,
      size,
      0,
      0,
      newWidth,
      newHeight,
    );
  }

  _rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  _removeUI(): void {
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    if (this._canvas) {
      this._canvas.style.cursor = "default";
      if (this._onMouseMoveBound)
        this._canvas.removeEventListener("mousemove", this._onMouseMoveBound);
      if (this._onMouseLeaveBound)
        this._canvas.removeEventListener("mouseleave", this._onMouseLeaveBound);
      if (this._onMouseEnterBound)
        this._canvas.removeEventListener("mouseenter", this._onMouseEnterBound);
      if (this._onClickBound)
        this._canvas.removeEventListener("click", this._onClickBound);
    }
    this._container = null;
    this._canvas = null;
    this._magnifier = null;
    this._crosshair = null;
    this._preview = null;
    this._previewColor = null;
    this._colorDisplay = null;
    this._lastPixel = null;
    this._currentPosition = null;
    this._canvasCache = null;
    this._magnifierCache = null;
    this._magCanvas = null;
    this._magCtx = null;
    this._mouseThrottle = false;
    this._onMouseMoveBound = undefined;
    this._onMouseLeaveBound = undefined;
    this._onMouseEnterBound = undefined;
    this._onClickBound = undefined;
  }
}

export function removeClEyeDropperUi(): void {
  const overlay = document.getElementById("eyedropper-overlay");
  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay);
}

function getScaledCanvasPosition(
  instance: CLEyeDropper,
  event: MouseEvent,
): { x: number; y: number; rect: DOMRect | null } {
  if (!instance?._canvas) return { x: 0, y: 0, rect: null };
  const rect = instance._canvas.getBoundingClientRect();
  const width = instance._canvas.width || 1;
  const height = instance._canvas.height || 1;
  const scaleX =
    instance._canvasCache?.scaleX || width / Math.max(1, rect.width);
  const scaleY =
    instance._canvasCache?.scaleY || height / Math.max(1, rect.height);
  const x = Math.max(
    0,
    Math.min(width - 1, Math.floor((event.clientX - rect.left) * scaleX)),
  );
  const y = Math.max(
    0,
    Math.min(height - 1, Math.floor((event.clientY - rect.top) * scaleY)),
  );
  return { x, y, rect };
}

export function installClEyeDropperScalingPatch(log: EyeDropperLog): void {
  const patchedClass = CLEyeDropper as typeof CLEyeDropper & {
    __canvaScalingPatchInstalled?: boolean;
  };
  if (patchedClass.__canvaScalingPatchInstalled) return;
  patchedClass.__canvaScalingPatchInstalled = true;

  const proto = CLEyeDropper.prototype;

  proto._onMouseMove = function onMouseMovePatched(
    this: CLEyeDropper,
    event: MouseEvent,
  ): void {
    if (
      !this?._canvas ||
      !this?._canvasCache?.ctx ||
      !this?._previewColor ||
      !this?._colorDisplay ||
      !this?._preview
    ) {
      return;
    }

    const { x, y } = getScaledCanvasPosition(this, event);
    const imageData = this._canvasCache.ctx.getImageData(x, y, 1, 1);
    const [r = 0, g = 0, b = 0] = imageData.data;
    const hexColor = this._rgbToHex(r, g, b).toLowerCase();

    this._previewColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    this._colorDisplay.textContent = hexColor;
    this._preview.style.display = "flex";
    this._currentPosition = { x, y };
    this._lastPixel = {
      x,
      y,
      clientX: event.clientX,
      clientY: event.clientY,
      hex: hexColor,
      rgb: [r, g, b],
    };
    this._updateMagnifier(x, y, event, [r, g, b], hexColor);
  };

  proto._onClick = function onClickPatched(
    this: CLEyeDropper,
    event: MouseEvent,
  ): void {
    if (!this?._canvas || !this?._canvasCache?.ctx) {
      return;
    }

    let picked = this._lastPixel;
    if (!picked || !Array.isArray(picked.rgb)) {
      const { x, y } = getScaledCanvasPosition(this, event);
      const imageData = this._canvasCache.ctx.getImageData(x, y, 1, 1);
      const [r = 0, g = 0, b = 0] = imageData.data;
      picked = {
        hex: this._rgbToHex(r, g, b).toLowerCase(),
        rgb: [r, g, b],
        x,
        y,
        clientX: event.clientX,
        clientY: event.clientY,
      };
    }

    this._currentPosition = { x: picked.x, y: picked.y };
    if (typeof this.options?.onPick === "function") {
      this.options.onPick({ ...picked, event });
    }
    log(
      "eyedropper:library",
      "picked",
      picked.hex,
      picked.x,
      picked.y,
      JSON.stringify(picked.rgb),
    );
    if (typeof this._resolve === "function") {
      this._resolve({ hex: picked.hex, rgb: picked.rgb });
    }
    if (typeof this._removeUI === "function") {
      this._removeUI();
    } else {
      removeClEyeDropperUi();
    }
  };
}
