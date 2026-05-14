# Canva Linux Packaging

Canva Linux supports Native, Flatpak, AppImage, linux-unpacked tarball, and checksum release workflows. `.deb`, `.rpm`, and AUR workflow entries are declared as planned package targets.

Packaging recipes must preserve generated architecture strings and generated artifact names. Do not normalize `x86_64` or `X86_64` to `x64`.
