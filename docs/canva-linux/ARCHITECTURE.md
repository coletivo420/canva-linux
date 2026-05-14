# Canva Linux Architecture

Canva Linux is the dependent desktop-wrapper project that consumes c420ui. It owns Electron runtime code, Canva-specific integration, project configuration, packaging recipes, desktop metadata, and release notes.

Project-specific data lives under `config/canva-linux/` and `scripts/c420ui-adapter/`. Generic c420ui engines remain under `packages/c420ui/`.
