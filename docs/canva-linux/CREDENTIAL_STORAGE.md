# Canva Linux Credential Storage

Persistent login requires a secure Linux Secret Service backend and available safe storage encryption. If Electron reports `basic_text`, Canva Linux uses ephemeral session mode and must not use the `persist:canva` partition.

Credential material, cookies, tokens, passwords, and sudo input must never be logged.
