import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

type PackageJson = {
  build?: {
    directories?: {
      buildResources?: string;
    };
    linux?: {
      icon?: string;
    };
  };
};

const rootDir = process.cwd();
const appId = "io.github.coletivo420.canva-linux";
const canonicalIconBasename = `${appId}.png`;

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function collectFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(rootDir, relativeDir);
  const files: string[] = [];

  const visit = (absolutePath: string): void => {
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile()) {
        files.push(path.relative(rootDir, child).split(path.sep).join(path.posix.sep));
      }
    }
  };

  if (fs.existsSync(absoluteDir)) {
    visit(absoluteDir);
  }

  return files;
}

test("package.json points Electron Builder at the canonical asset tree", () => {
  const packageJson = JSON.parse(readText("package.json")) as PackageJson;

  assert.equal(packageJson.build?.directories?.buildResources, "packages/canva-linux-assets");
  assert.equal(packageJson.build?.linux?.icon, "icons/io.github.coletivo420.canva-linux");
});

test("flatpak and native packaging consume canonical asset paths", () => {
  for (const [relativePath, fragment] of [
    [
      "packaging/flathub/manifest.yml",
      "packages/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop",
    ],
    [
      "packaging/flathub/manifest.yml",
      "packages/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
    ],
    [
      "scripts/validate-flatpak.sh",
      "packages/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop",
    ],
    [
      "scripts/validate-flatpak.sh",
      "packages/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
    ],
    [
      "scripts/validate-flathub-submission.sh",
      "packages/canva-linux-assets/desktop/io.github.coletivo420.canva-linux.desktop",
    ],
    [
      "scripts/validate-flathub-submission.sh",
      "packages/canva-linux-assets/metainfo/io.github.coletivo420.canva-linux.metainfo.xml",
    ],
    [
      "packages/c420ui/scripts/install-native.sh",
      "packages/canva-linux-assets/icons/hicolor",
    ],
  ] as const) {
    assert.match(readText(relativePath), new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("asset basenames follow the Flatpak app id and avoid generic icon names", () => {
  assert.equal(
    fs.existsSync(path.join(rootDir, "packages/canva-linux-assets/icons", canonicalIconBasename)),
    true,
  );

  for (const filePath of collectFiles("packages/canva-linux-assets/icons")) {
    assert.notEqual(
      ["icon.png", "app.png", "logo.png", "canva-linux.png"].includes(path.basename(filePath)),
      true,
      `${filePath} must not use a generic icon basename`,
    );
  }
});
