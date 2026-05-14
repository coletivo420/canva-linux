# c420ui Action Engine

The Action Engine is the single policy layer for c420ui actions. It resolves action metadata, applies confirmation, dry-run, planned-action and root requirements, then delegates concrete command execution through the Command Runner.

Dependent projects must not duplicate this policy. Project adapters declare actions and provide command details; c420ui decides whether an action may run and how it is reported.

Canva Linux direct CLI and terminal actions share this engine so both surfaces use the same TypeScript action contract.
