# Versioning


## 0.1.4-15.Dev.8

- Source package version: `0.1.4-15.Dev.8`.
- Display version: `0.1.4-15.Dev`.
- Phase: `0.1.4-15.Dev.8`.
- Dev.8 starts the internal tab-strip redesign. The pinned home tab remains part of the tab model.
  It must be rendered by a dedicated pinned-home renderer and must never be rendered as a regular tab item.
- The pinned home tab belongs to the tab strip, not the window titlebar.
  Do not change BrowserWindow title logic for this feature. Do not render the home tab twice.

