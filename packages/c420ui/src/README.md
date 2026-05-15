# c420ui package source

This directory is the generic c420ui contract layer for terminal workflows.
The package owns reusable primitives only:

- action registration contracts;
- artifact workflow contracts;
- project adapter bridge contracts;
- execution lifecycle, dry-run and planned-action semantics;
- event, progress, log and exit-code primitives;
- capability declarations;
- sudo/root provider interfaces.

Project-specific metadata and recipes must live in adapters outside this
package. The core must not import project registries, application metadata,
release recipes or shell scripts directly.
