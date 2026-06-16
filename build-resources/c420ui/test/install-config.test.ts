import test from "node:test";
import assert from "node:assert/strict";
import { validateC420UINativeInstallConfig } from "../src/install-config.js";

const fixture = {
  appId: "example.app",
  executable: "example-app",
  desktopName: "example.app.desktop",
  system: {
    prefix: "/opt/example-app",
    bin: "/usr/local/bin/example-app",
    desktop: "/usr/local/share/applications/example.app.desktop",
    iconRoot: "/usr/local/share/icons/hicolor",
  },
  user: {
    prefix: ".local/opt/example-app",
    bin: ".local/bin/example-app",
    desktop: ".local/share/applications/example.app.desktop",
    iconRoot: ".local/share/icons/hicolor",
  },
};

test("native install config accepts declared system and user paths", () => {
  const config = validateC420UINativeInstallConfig(fixture);
  assert.equal(config.appId, "example.app");
  assert.equal(config.user.prefix, ".local/opt/example-app");
});

test("native install config rejects absolute user paths", () => {
  assert.throws(
    () =>
      validateC420UINativeInstallConfig({
        ...fixture,
        user: { ...fixture.user, prefix: "/home/user/.local/opt/example-app" },
      }),
    /user\.prefix must be relative/,
  );
});

test("native install config rejects traversal in executable", () => {
  assert.throws(
    () =>
      validateC420UINativeInstallConfig({
        ...fixture,
        executable: "../example-app",
      }),
    /executable must be relative/,
  );
});
