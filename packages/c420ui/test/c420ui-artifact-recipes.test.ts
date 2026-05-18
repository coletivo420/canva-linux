import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  resolveC420UIArtifactOutputPattern,
  validateC420UIArtifactRecipeConfig,
  validateC420UIArtifactWorkflowsAgainstActions,
  type C420UIActionDescriptor,
  type c420uiArtifactRecipeConfig,
} from "../src";

const capabilities = {
  supportsArtifacts: true,
  supportsInstall: true,
  supportsUninstall: true,
  supportsPurge: true,
  supportsRelease: true,
  supportsRootActions: true,
  supportsDryRun: true,
  supportsPlannedActions: true,
};

function validConfig(
  overrides: Partial<c420uiArtifactRecipeConfig> = {},
): c420uiArtifactRecipeConfig {
  return {
    capabilities,
    workflows: [
      {
        id: "appimage",
        kind: "appimage",
        label: "AppImage",
        scope: "portable",
        buildActionId: "bundle-appimage",
        outputPattern: "dist/project-${version}-*.AppImage",
      },
    ],
    ...overrides,
  };
}

function action(
  id: string,
  overrides: Partial<C420UIActionDescriptor> = {},
): C420UIActionDescriptor {
  return {
    id,
    label: id,
    group: "package",
    section: "Artifacts",
    kind: "command",
    ...overrides,
  };
}

test("valid artifact recipe config passes", () => {
  assert.deepEqual(validateC420UIArtifactRecipeConfig(validConfig()), validConfig());
});

test("missing capabilities fails", () => {
  assert.throws(
    () => validateC420UIArtifactRecipeConfig({ workflows: [] }),
    /capabilities must be an object/,
  );
});

test("non-boolean capability fails", () => {
  assert.throws(
    () =>
      validateC420UIArtifactRecipeConfig({
        ...validConfig(),
        capabilities: { ...capabilities, supportsArtifacts: "yes" },
      }),
    /capabilities\.supportsArtifacts must be a boolean/,
  );
});

test("non-array workflows fails", () => {
  assert.throws(
    () => validateC420UIArtifactRecipeConfig({ ...validConfig(), workflows: {} }),
    /workflows must be an array/,
  );
});

test("workflow without required id, kind, label, or scope fails", () => {
  for (const field of ["id", "kind", "label", "scope"] as const) {
    const workflow = { ...validConfig().workflows[0], [field]: "" };
    assert.throws(
      () => validateC420UIArtifactRecipeConfig(validConfig({ workflows: [workflow] })),
      new RegExp(`${field} must be a non-empty string`),
    );
  }
});

test("recipe workflow requires scope", () => {
  const workflowWithoutScope: Record<string, unknown> = { ...validConfig().workflows[0] };
  delete workflowWithoutScope.scope;
  assert.throws(
    () => validateC420UIArtifactRecipeConfig(validConfig({ workflows: [workflowWithoutScope as never] })),
    /scope must be a non-empty string/,
  );
});

test("invalid kind fails", () => {
  assert.throws(
    () =>
      validateC420UIArtifactRecipeConfig(
        validConfig({ workflows: [{ ...validConfig().workflows[0], kind: "zip" as never }] }),
      ),
    /kind must be one of/,
  );
});

test("invalid scope fails", () => {
  assert.throws(
    () =>
      validateC420UIArtifactRecipeConfig(
        validConfig({ workflows: [{ ...validConfig().workflows[0], scope: "global" as never }] }),
      ),
    /scope must be one of/,
  );
});

test("duplicate workflow id fails", () => {
  const workflow = validConfig().workflows[0];
  assert.throws(
    () => validateC420UIArtifactRecipeConfig(validConfig({ workflows: [workflow, workflow] })),
    /duplicate workflow id appimage/,
  );
});

test("empty outputPattern fails", () => {
  assert.throws(
    () =>
      validateC420UIArtifactRecipeConfig(
        validConfig({ workflows: [{ ...validConfig().workflows[0], outputPattern: " " }] }),
      ),
    /outputPattern must be non-empty/,
  );
});

test("outputPattern containing x64 fails", () => {
  assert.throws(
    () =>
      validateC420UIArtifactRecipeConfig(
        validConfig({ workflows: [{ ...validConfig().workflows[0], outputPattern: "dist/project-x64.AppImage" }] }),
      ),
    /must not normalize architecture names to x64/,
  );
});

test("outputPattern containing arch token fails", () => {
  assert.throws(
    () =>
      validateC420UIArtifactRecipeConfig(
        validConfig({ workflows: [{ ...validConfig().workflows[0], outputPattern: "dist/project-${arch}.AppImage" }] }),
      ),
    /must preserve generated architecture globs/,
  );
});

test("planned workflow pointing to executable action fails", () => {
  const workflow = { ...validConfig().workflows[0], planned: true };
  assert.throws(
    () => validateC420UIArtifactWorkflowsAgainstActions([workflow], [action("bundle-appimage")]),
    /appimage is planned but buildActionId bundle-appimage is executable/,
  );
});

test("executable workflow pointing to planned action fails", () => {
  const workflow = validConfig().workflows[0];
  assert.throws(
    () =>
      validateC420UIArtifactWorkflowsAgainstActions(
        [workflow],
        [action("bundle-appimage", { kind: "planned", planned: true })],
      ),
    /appimage is executable but buildActionId bundle-appimage is planned/,
  );
});

test("requiresRoot=false contradicting action requiresRoot=true fails", () => {
  const workflow = {
    ...validConfig().workflows[0],
    buildActionId: undefined,
    installActionId: "install-system",
    requiresRoot: false,
  };
  assert.throws(
    () =>
      validateC420UIArtifactWorkflowsAgainstActions(
        [workflow],
        [action("install-system", { requiresRoot: true })],
      ),
    /appimage declares requiresRoot=false but installActionId install-system requires root/,
  );
});

test("requiresRoot=true with user-scoped action fails", () => {
  const workflow = { ...validConfig().workflows[0], requiresRoot: true };
  assert.throws(
    () =>
      validateC420UIArtifactWorkflowsAgainstActions(
        [workflow],
        [action("bundle-appimage", { scope: "user" })],
      ),
    /appimage requires root but buildActionId bundle-appimage is user-scoped/,
  );
});

test("system workflow with user-scoped action fails", () => {
  const workflow = {
    ...validConfig().workflows[0],
    buildActionId: undefined,
    scope: "system" as const,
    installActionId: "install-user",
  };
  assert.throws(
    () =>
      validateC420UIArtifactWorkflowsAgainstActions(
        [workflow],
        [action("install-user", { scope: "user" })],
      ),
    /appimage is system-scoped but installActionId install-user is user-scoped/,
  );
});

test("system workflow with non-root system action fails", () => {
  const workflow = {
    ...validConfig().workflows[0],
    buildActionId: undefined,
    scope: "system" as const,
    installActionId: "install-system",
  };
  assert.throws(
    () =>
      validateC420UIArtifactWorkflowsAgainstActions(
        [workflow],
        [action("install-system", { scope: "system", requiresRoot: false })],
      ),
    /appimage is system-scoped but installActionId install-system declares requiresRoot=false/,
  );
});

test("resolveC420UIArtifactOutputPattern expands version", () => {
  assert.equal(
    resolveC420UIArtifactOutputPattern("dist/project-${version}-*.AppImage", { version: "1.2.3" }),
    path.join("dist", "project-1.2.3-*.AppImage"),
  );
});
