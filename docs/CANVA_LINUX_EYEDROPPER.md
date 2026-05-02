# CanvaLinux EyeDropper

This document tracks the first-party Canva Linux eyedropper implementation.

## Identity

- Public/documentation name: CanvaLinux EyeDropper
- Technical module name: `cl-eyedropper`
- API/documentation name: CL-EyeDropper
- TypeScript class name: `CLEyeDropper`
- Log prefix: `cl-eyedropper:`

## Structure

```text
electron/preload/cl-eyedropper/
  index.ts
  cl-eyedropper.ts
  types.ts
```

## Contract

```ts
export class CLEyeDropper {
  open(
    canvasOrContext: HTMLCanvasElement | CanvasRenderingContext2D,
    options?: EyeDropperOpenOptions
  ): Promise<{ hex: string; rgb: [number, number, number] }>;
}
```

## DEV20 parity phase

DEV20 creates CL-EyeDropper as a TypeScript parity implementation of the current LTCode-backed picker.

The goal is behavior parity, not feature improvement.

CL-EyeDropper must preserve:

- canvas/context input;
- overlay creation;
- magnifier;
- crosshair;
- preview;
- mousemove/mouseleave/click flow;
- last valid pixel behavior;
- CSS/native scaling patch behavior;
- `{ hex, rgb }` internal result;
- final `{ sRGBHex }` conversion remaining in `custom-eyedropper-flow.ts`.

The active Canva runtime path still uses LTCode in DEV20.

## DEV21 default phase

DEV21 makes CL-EyeDropper the default Canva Linux picker implementation.

The LTCode-backed implementation remains available as a temporary fallback:

```bash
CANVA_EYEDROPPER_IMPL=legacy
```

Default behavior uses CL-EyeDropper:

```bash
CANVA_EYEDROPPER_IMPL=cl
```

The same default applies when `CANVA_EYEDROPPER_IMPL` is not set.

The main process reads `CANVA_EYEDROPPER_IMPL` and forwards the selected value to Canva preload tabs with `webPreferences.additionalArguments`. The preload must read the forwarded renderer argument, not `process.env`.

DEV21 must not remove LTCode. Removal is deferred until post-validation cleanup.

## Protected Requirements

The CL-EyeDropper implementation must:

- accept a canvas or `CanvasRenderingContext2D`;
- create a temporary DOM overlay;
- create a magnifier;
- create a color preview;
- preserve the CSS/native scaling patch behavior;
- clamp coordinates inside the canvas;
- read pixels with `getImageData()`;
- convert RGB values to HEX;
- preserve the last valid sampled pixel;
- resolve internally with `{ hex, rgb }`;
- remove overlays and listeners on completion;
- restore the cursor;
- keep final `{ sRGBHex }` conversion in `custom-eyedropper-flow.ts`.

## Implementation Sequence

- DEV19: convert preload source modules and introduce CL-EyeDropper contracts.
- DEV20: convert LTCode behavior to CL-EyeDropper TypeScript parity without activating it.
- DEV21: make CL-EyeDropper the default while keeping LTCode as temporary fallback.
- DEV22: validate full TypeScript conversion and CL-EyeDropper behavior on Wayland, X11 and Flatpak.
- DEV23: remove LTCode legacy fallback if validated.
- DEV24: stabilization and release-candidate readiness.

DEV19 creates contracts only. It must not replace the active LTCode-backed EyeDropper flow.

DEV20 implements CL-EyeDropper, but it must not replace the active LTCode-backed EyeDropper flow.

DEV21 activates CL-EyeDropper by default and keeps the LTCode-backed implementation available through `CANVA_EYEDROPPER_IMPL=legacy`.
