# c420ui Artifact Workflows

c420ui owns generic artifact workflow contracts and workflow execution. The artifact runner handles workflow kinds, planned workflow reporting, execution routing, and validation hooks.

Dependent projects own package recipes and output patterns. Canva Linux keeps AppImage, Flatpak, tarball, checksum, and planned package declarations in `config/canva-linux/artifacts.json`.

Artifact names must preserve the architecture strings emitted by upstream tools, such as `x86_64` or `X86_64`.
