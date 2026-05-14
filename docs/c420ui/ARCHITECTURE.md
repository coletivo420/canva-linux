# c420ui Architecture

c420ui is the generic terminal interface and action execution package used by Canva Linux. It owns terminal layout, focus handling, action execution policy, root-provider orchestration, command execution, host dependency checks, artifact workflow execution, and provider interfaces.

The package remains generic:

- project metadata is provided by adapters and configuration;
- project actions are loaded from the dependent project registry;
- concrete package recipes remain in the dependent project;
- terminal UI components do not hardcode Canva Linux app ids, action ids, package names, or shell scripts.

Canva Linux consumes c420ui through `scripts/c420ui-adapter/`, `config/canva-linux/*.json`, and the launcher bridge.
