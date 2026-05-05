# CLI Commands

Direct commands are resolved through the shared Action Registry (`scripts/actions.json`).

| Command | Description |
| --- | --- |
| `--tui` | Force Blessed TUI assistant. |
| `--no-tui` | Deprecated compatibility flag. It prevents automatic TUI startup and requires a direct action flag; it never opens an interactive shell menu. |
| `--install-native` | Run Native Install. |
| `--install-flatpak` | Build and install Flatpak locally. |
| `--bundle-flatpak` | Create distributable `.flatpak`. |
| `--bundle-appimage` | Create AppImage package. |
| `--prepare-aur` | Planned for `0.1.4.12-dev.1`. |
| `--bundle-deb` | Planned after AUR stabilization. |
| `--bundle-rpm` | Planned after AUR stabilization. |
| `--build-runtime` | Build compiled Electron runtime. |
| `--build-dir` | Build `dist/linux-unpacked`. |
| `--validate` | Run project validation. |
| `--validate-appimage` | Validate AppImage artifacts. |
| `--validate-appimage-extract` | Validate AppImage + extraction checks. |
| `--doctor` | Check host tools. |
| `--clean` | Remove generated artifacts. |
| `--uninstall` | Detect and uninstall variants. |
| `--uninstall-native` | Uninstall Native variant (scope chosen in prompt: system/user). |
| `--uninstall-flatpak` | Uninstall Flatpak variant (scope chosen in prompt: system/user). |
| `--reset-user-data` | Remove user data only. |
| `--purge` | Uninstall + remove user data. |
