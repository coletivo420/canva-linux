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

DEV21 made CL-EyeDropper the default Canva Linux picker implementation while keeping the previous picker path available for temporary diagnostics.

## DEV23 legacy removal

`0.1.4-dev.23` removes the LTCode-backed EyeDropper implementation and the temporary implementation selector.

From this phase onward, CL-EyeDropper is the only supported Canva Linux EyeDropper implementation.

Removed:

- `electron/preload/ltcode-eyedropper.js`
- `electron/preload/eyedropper-implementation.ts`
- `CANVA_EYEDROPPER_IMPL`
- `--canva-eyedropper-impl`
- `legacy` and `ltcode` picker modes

The result contract remains:

```ts
{ sRGBHex: "#rrggbb" }
```

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
- DEV23: remove the LTCode fallback and implementation selector.
- DEV24: stabilization and release-candidate readiness.

DEV19 creates contracts only. It must not replace the active LTCode-backed EyeDropper flow.

DEV20 implements CL-EyeDropper, but it must not replace the active LTCode-backed EyeDropper flow.

DEV23 makes CL-EyeDropper the only supported Canva Linux EyeDropper implementation.
