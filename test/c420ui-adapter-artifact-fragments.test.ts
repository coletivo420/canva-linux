import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCanvaLinuxArtifactFragments } from "../scripts/c420ui-adapter/detection/artifact-fragments";

function withProjectRoot(run: (rootDir: string) => void): void {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "canva-linux-artifact-fragments-"));
  try {
    fs.mkdirSync(path.join(rootDir, "config/canva-linux"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "dist"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "package.json"),
      `${JSON.stringify({ name: "canva-linux", version: "0.1.4-15.Dev.9" }, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(rootDir, "config/canva-linux/artifacts.json"),
      `${JSON.stringify({
        capabilities: {},
        workflows: [
          {
            id: "flatpak",
            kind: "flatpak",
            label: "Flatpak bundle",
            outputPattern: "dist/canva-linux-\${version}-*.flatpak",
          },
          {
            id: "appimage",
            kind: "appimage",
            label: "AppImage",
            outputPattern: "dist/canva-linux-\${version}-*.AppImage",
          },
          {
            id: "linux-unpacked",
            kind: "custom",
            label: "Linux unpacked",
            outputPattern: "dist/linux-unpacked",
          },
          {
            id: "release-tarball",
            kind: "tarball",
            label: "Release tarball",
            outputPattern: "dist/canva-linux-\${version}-linux-unpacked-*.tar.gz",
          },
          {
            id: "release-checksums",
            kind: "custom",
            label: "SHA256SUMS",
            outputPattern: "dist/SHA256SUMS",
          },
          { id: "deb", kind: "deb", label: "Debian package", planned: true },
        ],
      }, null, 2)}\n`,
    );
    run(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

function fragment(rootDir: string, id: string) {
  const found = buildCanvaLinuxArtifactFragments(rootDir).find((item) => item.id === id);
  assert.ok(found, `missing ${id}`);
  return found;
}

test("detects AppImage with sidecar and prefers fullVersion", () => {
  withProjectRoot((rootDir) => {
    const appImagePath = path.join(rootDir, "dist/canva-linux-0.1.4-15.Dev.9-x86_64.AppImage");
    fs.writeFileSync(appImagePath, "appimage");
    fs.writeFileSync(
      `${appImagePath}.build-metadata.json`,
      JSON.stringify({ baseVersion: "0.1.4-15.Dev.9", fullVersion: "0.1.4-15.Dev.9+gappimage" }),
    );

    const appImage = fragment(rootDir, "appimage");
    assert.equal(appImage.detected, true);
    assert.equal(appImage.version, "0.1.4-15.Dev.9");
    assert.equal(appImage.fullVersion, "0.1.4-15.Dev.9+gappimage");
  });
});

test("detects Flatpak bundle with sidecar and falls back to version", () => {
  withProjectRoot((rootDir) => {
    const flatpakPath = path.join(rootDir, "dist/canva-linux-0.1.4-15.Dev.9-x86_64.flatpak");
    fs.writeFileSync(flatpakPath, "flatpak");
    fs.writeFileSync(`${flatpakPath}.version.json`, JSON.stringify({ version: "0.1.4-15.Dev.9+gflatpak" }));

    const flatpak = fragment(rootDir, "flatpak");
    assert.equal(flatpak.detected, true);
    assert.equal(flatpak.version, "0.1.4-15.Dev.9+gflatpak");
    assert.equal(flatpak.fullVersion, "0.1.4-15.Dev.9+gflatpak");
  });
});

test("detects linux-unpacked with internal metadata", () => {
  withProjectRoot((rootDir) => {
    const metadataPath = path.join(rootDir, "dist/linux-unpacked/resources/config/canva-linux/build-metadata.json");
    fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
    fs.writeFileSync(
      metadataPath,
      JSON.stringify({ baseVersion: "0.1.4-15.Dev.9", fullVersion: "0.1.4-15.Dev.9+gunpacked" }),
    );

    const unpacked = fragment(rootDir, "linux-unpacked");
    assert.equal(unpacked.detected, true);
    assert.equal(unpacked.kind, "linux-unpacked");
    assert.equal(unpacked.fullVersion, "0.1.4-15.Dev.9+gunpacked");
  });
});


test("linux-unpacked prefers fullVersion from root build metadata fallback", () => {
  withProjectRoot((rootDir) => {
    fs.mkdirSync(path.join(rootDir, "dist/linux-unpacked"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "config/canva-linux/build-metadata.json"),
      JSON.stringify({ version: "0.1.4-15.Dev.9", fullVersion: "0.1.4-15.Dev.9+grootmeta" }),
    );

    const unpacked = fragment(rootDir, "linux-unpacked");
    assert.equal(unpacked.detected, true);
    assert.equal(unpacked.version, "0.1.4-15.Dev.9");
    assert.equal(unpacked.fullVersion, "0.1.4-15.Dev.9+grootmeta");
  });
});

test("linux-unpacked falls back safely to version unknown without metadata", () => {
  withProjectRoot((rootDir) => {
    fs.mkdirSync(path.join(rootDir, "dist/linux-unpacked"), { recursive: true });
    fs.rmSync(path.join(rootDir, "config/canva-linux/build-metadata.json"), { force: true });

    const unpacked = fragment(rootDir, "linux-unpacked");
    assert.equal(unpacked.detected, true);
    assert.equal(unpacked.version, undefined);
    assert.equal(unpacked.fullVersion, undefined);
  });
});

test("detects SHA256SUMS", () => {
  withProjectRoot((rootDir) => {
    fs.writeFileSync(path.join(rootDir, "dist/SHA256SUMS"), "abc  artifact\n");

    const checksums = fragment(rootDir, "release-checksums");
    assert.equal(checksums.detected, true);
    assert.equal(checksums.label, "SHA256SUMS");
  });
});

test("keeps absent registered artifacts not detected and includes planned artifacts without outputs", () => {
  withProjectRoot((rootDir) => {
    const fragments = buildCanvaLinuxArtifactFragments(rootDir);

    assert.equal(fragments.find((item) => item.id === "release-tarball")?.detected, false);
    assert.deepEqual(fragments.find((item) => item.id === "deb"), {
      id: "deb",
      kind: "deb",
      label: "Debian package",
      detected: false,
    });
  });
});

test("does not limit artifact fragments to AppImage", () => {
  withProjectRoot((rootDir) => {
    const ids = buildCanvaLinuxArtifactFragments(rootDir).map((item) => item.id);

    assert.deepEqual(ids, [
      "flatpak",
      "appimage",
      "linux-unpacked",
      "release-tarball",
      "release-checksums",
      "deb",
    ]);
  });
});

test("Dev.10 artifact is selected after Dev.9 with numeric-aware sorting", () => {
  withProjectRoot((rootDir) => {
    fs.writeFileSync(
      path.join(rootDir, "config/canva-linux/artifacts.json"),
      `${JSON.stringify({
        workflows: [
          {
            id: "appimage",
            kind: "appimage",
            label: "AppImage",
            outputPattern: "dist/canva-linux-*-x86_64.AppImage",
          },
        ],
      }, null, 2)}\n`,
    );
    const dev9 = path.join(rootDir, "dist/canva-linux-0.1.4-15.Dev.9-x86_64.AppImage");
    const dev10 = path.join(rootDir, "dist/canva-linux-0.1.4-15.Dev.10-x86_64.AppImage");
    fs.writeFileSync(dev9, "appimage");
    fs.writeFileSync(dev10, "appimage");
    fs.writeFileSync(`${dev9}.version`, "0.1.4-15.Dev.9\n");
    fs.writeFileSync(`${dev10}.version`, "0.1.4-15.Dev.10\n");

    const appImage = fragment(rootDir, "appimage");
    assert.equal(appImage.path, "dist/canva-linux-0.1.4-15.Dev.10-x86_64.AppImage");
    assert.equal(appImage.version, "0.1.4-15.Dev.10");
  });
});

test("falls back to filename when metadata is absent", () => {
  withProjectRoot((rootDir) => {
    fs.writeFileSync(path.join(rootDir, "dist/canva-linux-0.1.4-15.Dev.9-x86_64.AppImage"), "appimage");

    const appImage = fragment(rootDir, "appimage");
    assert.equal(appImage.detected, true);
    assert.equal(appImage.version, "0.1.4-15.Dev.9");
    assert.equal(appImage.fullVersion, undefined);
  });
});
