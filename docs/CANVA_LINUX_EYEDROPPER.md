# CanvaLinux EyeDropper

This document tracks the planned first-party Canva Linux eyedropper implementation.

## Identity

- Public/documentation name: CanvaLinux EyeDropper
- Technical module name: `cl-eyedropper`
- API/documentation name: CL-EyeDropper
- TypeScript class name: `CLEyeDropper`
- Log prefix: `cl-eyedropper:`

## Planned Structure

```text
electron/preload/cl-eyedropper/
  index.ts
  cl-eyedropper.ts
  types.ts
  color.ts
  canvas-sampler.ts
  overlay.ts
  magnifier.ts
  picker-controller.ts
  errors.ts
  cleanup.ts
```

## Contract

```ts
export class CLEyeDropper {
  open(
    canvasOrContext: HTMLCanvasElement | CanvasRenderingContext2D,
    options?: EyeDropperOpenOptions
  ): Promise<EyeDropperResult>;
}
```

## Protected Requirements

The future CL-EyeDropper must:

- accept a canvas or `CanvasRenderingContext2D`;
- create a temporary DOM overlay;
- create a magnifier;
- create a color preview;
- correct CSS-pixel versus native-pixel scaling;
- clamp coordinates inside the canvas;
- read pixels with `getImageData()`;
- convert RGB values to HEX;
- preserve the last valid sampled pixel;
- resolve with `{ sRGBHex: "#rrggbb" }`;
- remove overlays and listeners on completion;
- restore the cursor;
- support `AbortSignal`;
- raise `AbortError` on abort;
- raise `OperationError` on failure;
- emit `cl-eyedropper:` logs.

## Planned Logs

- `cl-eyedropper:open`
- `cl-eyedropper:overlay`
- `cl-eyedropper:sampler`
- `cl-eyedropper:magnifier`
- `cl-eyedropper:preview`
- `cl-eyedropper:pick`
- `cl-eyedropper:cleanup`
- `cl-eyedropper:abort`
- `cl-eyedropper:error`

## Implementation Sequence

- DEV18: convert preload source modules and introduce CL-EyeDropper contracts.
- DEV19: implement the first-party CanvaLinux EyeDropper in TypeScript.
- DEV20: make CL-EyeDropper the default while keeping LTCode as temporary fallback.
- DEV21: validate full TypeScript conversion and CL-EyeDropper behavior.
- DEV22: remove LTCode legacy fallback and obsolete compatibility code.

Starting in DEV20, the expected default is:

```bash
CANVA_EYEDROPPER_IMPL=cl
```

Temporary diagnostic fallback:

```bash
CANVA_EYEDROPPER_IMPL=legacy
```

`cl` is the default implementation. `legacy` exists only as temporary diagnostics during the transition.
