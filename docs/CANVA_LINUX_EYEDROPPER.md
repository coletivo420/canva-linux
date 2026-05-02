# CL-EyeDropper

Canva Linux uses CL-EyeDropper as its custom color picker implementation.

## Purpose

CL-EyeDropper provides Canva-compatible color picking inside the Electron/Flatpak runtime.

## Runtime flow

1. Canva calls `EyeDropper.open()`.
2. The preload wrapper intercepts the call.
3. The main process captures a scoped snapshot through `wrapper:eyedropper-snapshot`.
4. The preload creates a temporary canvas from the snapshot.
5. CL-EyeDropper samples the selected pixel.
6. Canva receives:

```ts
{ sRGBHex: "#rrggbb" }
```

## Files

- `electron/preload/cl-eyedropper/cl-eyedropper.ts`
- `electron/preload/cl-eyedropper/index.ts`
- `electron/preload/custom-eyedropper-flow.ts`
- `electron/preload/native-eyedropper-wrapper.ts`
- `electron/main/eyedropper-bridge.ts`

## Notes

- CL-EyeDropper is the only supported implementation.
- The picker must preserve Canva's expected `{ sRGBHex }` result contract.
- The preload bundle uses explicit module paths; avoid directory-style requires in bundled preload code.
