# AppImage FUSE Requirements

Canva Linux AppImage packages are portable artifacts and run outside the Flatpak sandbox.

Some AppImage runtimes require FUSE support from the host system. If FUSE is missing or not configured, running the AppImage may fail with an error similar to:

```text
AppImages require FUSE to run.
```

## Quick check

```bash
command -v fusermount3 || command -v fusermount || true
```

You can also try running the generated artifact from the terminal:

```bash
./dist/<artifact>.AppImage
```

## Debian / Ubuntu

### Ubuntu 24.04+ / Debian 13+

```bash
sudo apt update
sudo apt install libfuse2t64
```

### Ubuntu 22.04 / Debian and derivatives

```bash
sudo apt update
sudo apt install libfuse2
```

### Older Ubuntu/Debian systems

```bash
sudo apt update
sudo apt install fuse libfuse2
sudo modprobe -v fuse
```

Some older systems may also require group/session setup:

```bash
sudo addgroup fuse
sudo adduser "$USER" fuse
```

Log out and log in again after changing groups.

## Fedora

```bash
sudo dnf install fuse fuse-libs
```

## openSUSE

```bash
sudo zypper install fuse libfuse2
```

If AppImage execution still fails with permission issues, check whether your user must be in a trusted/FUSE-related group according to your openSUSE security profile.

## Arch Linux

```bash
sudo pacman -S fuse2
```

If you see a fusermount: mount failed: Operation not permitted error, check the [AppImage FUSE troubleshooting notes](https://github.com/AppImage/AppImageKit/wiki/FUSE) and local fusermount permissions.

## Fallback without FUSE

If FUSE cannot be configured, try extracting the AppImage:

```bash
./dist/<artifact>.AppImage --appimage-extract
```

Then run the extracted application from the generated `squashfs-root/` directory.

Some AppImages may also support:

```bash
./dist/<artifact>.AppImage --appimage-extract-and-run
```

Use this fallback only when normal AppImage execution is not possible.

## Canva Linux commands

```bash
./canva-linux.sh --bundle-appimage
./canva-linux.sh --validate-appimage
```

AppImage packaging and AppImage execution are separate concerns:

- `./canva-linux.sh --bundle-appimage` generates the artifact.
- `./canva-linux.sh --validate-appimage` validates generated files.
- Running the AppImage may require host FUSE support.

## Runtime diagnostics

```bash
CANVA_DEBUG=1 ./dist/<artifact>.AppImage
CANVA_DEBUG=2 ./dist/<artifact>.AppImage
CANVA_FORCE_WAYLAND=1 ./dist/<artifact>.AppImage
CANVA_FORCE_X11=1 ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=auto ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=opengl ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=vulkan ./dist/<artifact>.AppImage
CANVA_GPU_BACKEND=software ./dist/<artifact>.AppImage
```


## Validation

Basic validation:

```bash
./canva-linux.sh --validate-appimage
```

Optional extraction check:

```bash
./canva-linux.sh --validate-appimage-extract
```

The extraction check does not replace a runtime test with FUSE. It only verifies that the AppImage can be unpacked with the AppImage runtime.
