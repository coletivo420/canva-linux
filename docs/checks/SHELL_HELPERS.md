# Shell Boundary Classification

Dev11 closes shell ownership. The only remaining shell files are documented
runtime/bootstrap boundaries:

- `canva-linux-c420ui-builder`: stage-0 c420ui bootstrap launcher.
- `run.sh`: Flatpak/POSIX runtime launcher.

They are not migration debt. Any additional shell file is a regression unless
explicitly documented as an external runtime boundary.

All maintained build, validation, packaging, root-provider, and repository
logic must live in TypeScript. Generated Node/tooling output must be ESM
`.mjs`.
