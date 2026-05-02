# Canva Linux 0.1.6.devX Roadmap

The `0.1.6.devX` line turns the repository into the base of a package factory while implementing only one new complementary package format: AppImage.

Flatpak remains the primary supported distribution format.

## Strategic goal

```text
0.1.6.devX = AppImage + package-factory foundation
```

The line must prepare future packaging work without adding every package format at once.

## Distribution policy

Supported in `0.1.6.devX`:

- Flatpak as the primary format;
- AppImage as the only new complementary artifact;
- release checksums and a simple release manifest.

Out of scope for `0.1.6.devX`:

- DEB;
- RPM;
- AUR/PKGBUILD;
- PackageKit/pkgkit;
- Snap;
- `.run` installers;
- pacman binary packages.

Future lines may add DEB, RPM and AUR using the structure introduced here.

## Package factory concept

The repository should gradually become a package factory:

```text
validated source
  -> runtime build
  -> Electron distribution output
  -> release artifact staging
  -> Flatpak + AppImage artifacts
  -> checksums + release manifest
```

Packaging scripts must consume validated build outputs. They must not change runtime behavior.

## 0.1.6.dev1 — packaging strategy

Define the packaging policy for the line.

Deliverables:

- document Flatpak as the primary format;
- document AppImage as the only new package artifact;
- explicitly defer DEB, RPM and AUR;
- explicitly exclude PackageKit/pkgkit from the line;
- update README links to this roadmap.

## 0.1.6.dev2 — package-factory base

Create the basic package-factory structure.

Suggested structure:

```text
packaging/
  README.md
  release-targets.json
  appimage/
    README.md
  future/
    deb.md
    rpm.md
    aur.md
```

No DEB/RPM/AUR build scripts should be created in this line.

## 0.1.6.dev3 — release target manifest

Create `packaging/release-targets.json` with Flatpak and AppImage active and future formats disabled.

Expected policy:

```json
{
  "formats": {
    "flatpak": {
      "enabled": true,
      "primary": true,
      "status": "supported"
    },
    "appimage": {
      "enabled": true,
      "primary": false,
      "status": "supported"
    },
    "deb": {
      "enabled": false,
      "status": "future"
    },
    "rpm": {
      "enabled": false,
      "status": "future"
    },
    "aur": {
      "enabled": false,
      "status": "future"
    }
  }
}
```

## 0.1.6.dev4 — AppImage target

Add the AppImage target to the Electron Builder configuration without breaking the Flatpak workflow.

Deliverables:

- keep Flatpak workflows unchanged;
- add AppImage as a release artifact target;
- keep runtime build output under `.build/electron/`;
- do not change app-id, Flatpak permissions, OAuth, GPU, logging or EyeDropper behavior.

## 0.1.6.dev5 — AppImage build command

Add a dedicated AppImage build command.

Possible commands:

```bash
npm run package:appimage
```

or:

```bash
./scripts/build-appimage.sh
```

The command must run the existing runtime build first and then generate the AppImage artifact.

## 0.1.6.dev6 — release output layout

Stage AppImage artifacts under:

```text
dist/release/
```

Expected artifact pattern:

```text
Canva-Linux-0.1.6-x86_64.AppImage
```

The exact version suffix must be derived from `package.json`.

## 0.1.6.dev7 — AppImage checksums

Generate checksums for AppImage release artifacts.

Deliverables:

```text
dist/release/checksums.txt
```

Checksums must be generated from the staged release artifact, not from intermediate files.

## 0.1.6.dev8 — AppImage validation

Add validation for the AppImage artifact.

Validation should check:

- artifact exists;
- artifact is executable;
- artifact name contains the package version;
- checksum file exists;
- release manifest references the artifact;
- generated files are not accidentally committed unless explicitly intended for release.

## 0.1.6.dev9 — user documentation

Document AppImage use.

Minimum user commands:

```bash
chmod +x Canva-Linux-0.1.6-x86_64.AppImage
./Canva-Linux-0.1.6-x86_64.AppImage
```

Explain that AppImage:

- does not install Canva Linux into the system;
- does not require root to run;
- does not create Flatpak user/system scopes;
- is a portable complementary format, not the primary package format.

## 0.1.6.dev10 — packaging guardrails

Add AI and validation guardrails for packaging.

Rules:

- packaging patches must not alter runtime behavior;
- packaging patches must not alter OAuth, GPU, logging, debug levels, EyeDropper, preload, Flatpak permissions, app-id or session behavior;
- DEB/RPM/AUR must remain future targets in this line;
- PackageKit/pkgkit must remain out of scope.

## 0.1.6.dev11 — release process documentation

Document a manual GitHub Release workflow for the AppImage artifact.

Minimum release checklist:

- validate source;
- build runtime;
- build Flatpak if needed;
- build AppImage;
- generate checksums;
- generate release manifest;
- attach AppImage and checksums to GitHub Release.

## 0.1.6.dev12 — stabilization

Close the line after validating:

- Flatpak workflows still pass;
- AppImage artifact is generated;
- AppImage artifact is executable;
- checksums exist;
- release manifest exists;
- docs are current;
- guardrails prevent packaging changes from mutating runtime behavior.

## 0.1.6 final criteria

The line can close when:

- Flatpak remains the primary supported format;
- AppImage is available as a complementary portable artifact;
- `packaging/` documents the package-factory direction;
- DEB/RPM/AUR are clearly marked as future targets;
- PackageKit/pkgkit is excluded from the line;
- validation and documentation are aligned.
