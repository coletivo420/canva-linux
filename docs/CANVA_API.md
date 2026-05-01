# Canva API Architecture Notes (`1.4.11.devX`)

## Purpose

Document a safe, phased approach for Canva API integration in Canva Linux
without destabilizing the desktop wrapper runtime.

## API tracks evaluated

### Canva Apps SDK

- Intended for apps that run inside Canva editor iframes.
- Uses APIs injected by Canva in that embedded execution context.
- Relevant when building embedded Canva apps, not as the primary model for this
  Electron wrapper.

### Canva Connect API

- REST API intended for external integrations.
- Better fit for a desktop wrapper integrating with Canva services from outside
  editor iframe runtime.
- Provides OpenAPI descriptions that can be used for typed client generation.

## Direction for this repository

For Canva Linux, the current architecture direction is:

1. keep Apps SDK notes as reference context only;
2. prioritize Connect API for external integration capabilities;
3. stage OAuth and token handling behind opt-in configuration;
4. avoid embedding client secrets in distributed desktop builds.

## Security principles for planned OAuth work

- Use OAuth 2.0 Authorization Code Flow with PKCE (S256).
- Require explicit `state` validation and configured redirect URI.
- Keep secrets out of the shipped app; public builds should run without embedded
  client secret.
- Document backend requirement for flows that need confidential client handling.

## Planned sequence (high-level)

- `dev8`: finalize architecture and documentation.
- `dev9`: generate typed schema from Connect API OpenAPI.
- `dev10`: implement isolated OAuth/PKCE helper layer.
- `dev11`: ship first non-destructive read-only integration.
