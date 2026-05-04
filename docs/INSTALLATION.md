# Installation

## Instalação Nativa

### system scope (default)

```bash
./canva-linux.sh --install-native
```

Installs to `/opt/canva-linux`, `/usr/local/bin/canva-linux`, and `/usr/local/share/applications`.

### user scope

```bash
CANVA_NATIVE_SCOPE=user ./canva-linux.sh --install-native
```

Installs to `~/.local/opt/canva-linux`, `~/.local/bin/canva-linux`, and `~/.local/share/applications`.

Security note: Instalação Nativa runs outside the Flatpak sandbox.

## Instalação Flatpak

```bash
./canva-linux.sh --install-flatpak
```

## Packaging

```bash
./canva-linux.sh --bundle-flatpak
```

Planned: AppImage, .deb, .rpm, AUR / PKGBUILD.
