# c420ui Command Runner

The Command Runner executes concrete commands after the Action Engine has accepted an action. It owns command lifecycle reporting, process output handling, and operational log integration for c420ui-managed actions.

Dependent projects provide command recipes and environment values. They must not bypass the Action Engine by calling adapter execution methods directly for user-facing actions.
