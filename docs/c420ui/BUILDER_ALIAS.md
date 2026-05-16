# c420ui Builder Alias Policy

`c420ui-builder` is the internal builder entrypoint and bootstrap artifact.

`canva-linux-c420ui-builder` is the Canva Linux public alias for that internal builder.

`Canva Linux Builder powered by c420ui` is the user-facing title.

`canva-linux` remains the compiled Electron runtime app.

`canva-linux.sh` was removed and must not be restored as a compatibility launcher.

## Builder options

The public alias forwards builder globals to the internal entrypoint:

- `-y, --yes` skips confirmation prompts for dangerous actions.
- `--force` is an alias for `--yes`.
- `-h, --help` shows builder help.
- `--dry-run` resolves direct action metadata without executing command scripts.
