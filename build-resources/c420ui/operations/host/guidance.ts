import { info, ok, section, subsection, cmd } from "../../host/ui.js";

export function printDebugGuidanceForCommand(runCmd: string): void {
  section("Run");
  cmd(runCmd);
  console.log("");
  subsection("Internal Canva Linux logs");
  cmd(`${runCmd} --canva-debug=1`);
  info(
    "Shows all internal Canva Linux diagnostics, including startup, session, tabs, toolbar, permissions, uploads, OAuth, drag-and-drop, eyedropper, preload and GPU acceleration monitoring.",
  );
  cmd(`${runCmd} --canva-debug=2`);
  info(
    "Shows all internal Canva Linux diagnostics plus verbose Chromium/Electron stderr logs.",
  );
  console.log("");
  printDisplayBackendGuidance(runCmd);
  console.log("");
  printGpuBackendGuidance(runCmd);
}

export function printNativePostInstallGuidance(): void {
  ok("Native Install completed.");
  console.log("");
  printDebugGuidanceForCommand("canva-linux");
}

export function printFlatpakPostInstallGuidance(): void {
  printDebugGuidanceForCommand("flatpak run io.github.coletivo420.canva-linux");
}

export function printDisplayBackendGuidance(runCmd: string): void {
  subsection("Display backend checks");
  cmd(`${runCmd} --force-wayland`);
  cmd(`${runCmd} --force-x11`);
}

export function printGpuBackendGuidance(runCmd: string): void {
  subsection("GPU backend checks");
  cmd(`${runCmd} --gpu-backend=auto`);
  cmd(`${runCmd} --gpu-backend=opengl`);
  cmd(`${runCmd} --gpu-backend=vulkan`);
  cmd(`${runCmd} --gpu-backend=software`);
}

export function printAppImageGuidance(appimage: string): void {
  section("AppImage notes");
  info("AppImage is not sandboxed by Flatpak.");
  info("AppImage execution may require FUSE support.");
  info("See docs/APPIMAGE_FUSE.md.");
  console.log("");
  printDebugGuidanceForCommand(appimage);
}

export function printFlatpakBundleNotice(): void {
  section("Long-running package generation");
  info(".flatpak package generation may take several minutes depending on your system.");
  info("The process may need to build the Electron runtime.");
  info(
    "It also prepares Flatpak metadata, updates the local repository, compresses the bundle, and validates outputs.",
  );
  info("Release artifact names preserve the architecture string emitted by Flatpak.");
  info("Please be patient and keep this terminal open until the process finishes.");
  console.log("");
}

export function printAppImageBundleNotice(): void {
  section("Long-running package generation");
  info("AppImage package generation may take several minutes depending on your system.");
  info("The process may need to build the Electron runtime and run electron-builder.");
  info("It also compresses the artifact, generates checksums, and validates outputs.");
  info(
    "Release artifact names preserve the architecture string emitted by the packaging tool.",
  );
  info("Please be patient and keep this terminal open until the process finishes.");
  console.log("");
}
