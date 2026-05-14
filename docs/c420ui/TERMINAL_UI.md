# c420ui Terminal UI

The terminal UI is the generic c420ui workspace. It owns the c420ui header, focus zones, panels, logs, progress state, root-auth popup, manual text selection mode, and keyboard help.

The c420ui header and dependent-project header remain separate fixed components. Wide terminals prefer a side-by-side header layout; narrow terminals may stack headers. The workspace starts below the tallest header row.
