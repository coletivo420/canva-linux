# c420ui Root Provider

c420ui owns generic root-authentication flow and Linux sudo-helper integration. System-wide actions must use `packages/c420ui/host/linux/sudo-helper.sh`; raw sudo calls are forbidden outside that helper.

Dependent projects provide project-specific root policy, such as which actions are user-scope or system-scope. User-scope actions must never invoke sudo.
