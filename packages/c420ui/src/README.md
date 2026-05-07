# C420UI package source placeholder

This directory is the source placeholder for the future private C420UI package.
It exists to establish package boundaries before moving runtime logic out of
Canva Linux tooling.

Current rules:

- the package is private and must not be published yet;
- the package stays CommonJS-compatible during this phase;
- do not import Canva Linux project metadata from here;
- do not import `scripts/project-ui.json` from here;
- do not import `scripts/actions.json` from here;
- move pure C420UI contracts and primitives first, adapter wiring later.
