export function buildDesktopFileContent(
  options: {
    execPath: string;
    iconName: string;
    name: string;
    comment: string;
    categories: string;
    startupWMClass: string;
  },
): string {
  return `[Desktop Entry]
Type=Application
Name=${options.name}
Comment=${options.comment}
Exec=${options.execPath}
Icon=${options.iconName}
Terminal=false
Categories=${options.categories}
StartupWMClass=${options.startupWMClass}
`;
}
