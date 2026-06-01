import fs from "node:fs";

export function buildDesktopFileContent(
  execPath: string,
  iconName: string,
): string {
  return `[Desktop Entry]
Type=Application
Name=Canva
Comment=A community opensource desktop wrapper for use with Canva
Exec=${execPath}
Icon=${iconName}
Terminal=false
Categories=Graphics;
StartupWMClass=io.github.coletivo420.canva-linux
`;
}

export function writeDesktopFile(
  targetPath: string,
  execPath: string,
  iconName: string,
): void {
  const content = buildDesktopFileContent(execPath, iconName);
  fs.writeFileSync(targetPath, content, "utf8");
}
