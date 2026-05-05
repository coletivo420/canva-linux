export type TuiActionGroup = 'install' | 'development' | 'maintenance' | 'help';

export type TuiActionKind = 'command' | 'submenu' | 'planned' | 'internal';

export type TuiAction = {
  id: string;
  label: string;
  group: TuiActionGroup;
  kind: TuiActionKind;
  command?: string;
  args?: string[];
  longRunning?: boolean;
  dangerous?: boolean;
  planned?: boolean;
  description?: string;
};

export const tuiActions: TuiAction[] = [
  { id: 'install-native', label: 'Native Install', group: 'install', kind: 'command', command: 'bash', args: ['scripts/install-native.sh'], longRunning: true },
  { id: 'install-flatpak', label: 'Flatpak Install', group: 'install', kind: 'command', command: 'bash', args: ['scripts/install-flatpak-local.sh'], longRunning: true },
  { id: 'bundle-flatpak', label: '[Package] Create .flatpak package', group: 'development', kind: 'command', command: 'bash', args: ['scripts/build-flatpak-bundle.sh'], longRunning: true },
  { id: 'bundle-appimage', label: '[Package] Create AppImage', group: 'development', kind: 'command', command: 'bash', args: ['scripts/build-appimage.sh'], longRunning: true },
  { id: 'prepare-aur', label: '[Package] Prepare AUR/PKGBUILD [planned]', group: 'development', kind: 'planned', planned: true },
  { id: 'bundle-deb', label: '[Package] Create .deb package [planned]', group: 'development', kind: 'planned', planned: true },
  { id: 'bundle-rpm', label: '[Package] Create .rpm package [planned]', group: 'development', kind: 'planned', planned: true },
  { id: 'build-runtime', label: '[Build] Build runtime', group: 'development', kind: 'command', command: 'bash', args: ['scripts/build-runtime.sh'], longRunning: true },
  { id: 'build-dir', label: '[Build] Build Electron linux-unpacked dir', group: 'development', kind: 'command', command: 'bash', args: ['scripts/build-electron-dir.sh'], longRunning: true },
  { id: 'validate-project', label: '[Validation] Validate project', group: 'development', kind: 'command', command: 'bash', args: ['scripts/validate-project.sh'], longRunning: true },
  { id: 'validate-appimage', label: '[Validation] Validate AppImage artifacts', group: 'development', kind: 'command', command: 'bash', args: ['scripts/validate-appimage.sh'] },
  { id: 'validate-appimage-extract', label: '[Validation] Validate AppImage extraction [optional]', group: 'development', kind: 'command', command: 'bash', args: ['scripts/validate-appimage.sh', '--extract-check'], longRunning: true },
  { id: 'doctor', label: '[Validation] Doctor / check host tools', group: 'development', kind: 'command', command: 'bash', args: ['scripts/doctor.sh'] },
  { id: 'clean', label: 'Clean generated artifacts', group: 'maintenance', kind: 'command', command: 'bash', args: ['scripts/clean-artifacts.sh'], dangerous: false },
  { id: 'show-detected', label: 'Show detected installs/artifacts', group: 'maintenance', kind: 'command', command: 'bash', args: ['-lc', 'source scripts/app-identity-common.sh && source scripts/ui-common.sh && source scripts/install-detection-common.sh && ui_init && detect_installations && print_detected_installations'] },
  { id: 'version-info', label: 'Show package/version information', group: 'maintenance', kind: 'command', command: 'bash', args: ['-lc', 'source scripts/app-identity-common.sh && node -p "\"Package SemVer: \" + require(\"./package.json\").version" && printf "Project phase:\\n  %s\\nAppID:\\n  %s\\nExecutable:\\n  %s\\n" "$PROJECT_PHASE" "$APP_ID" "$APP_EXECUTABLE"'] },
  { id: 'reset-user-data', label: 'Reset user data [confirmation required]', group: 'maintenance', kind: 'planned', dangerous: true, description: 'Use ./canva-linux.sh --reset-user-data for now.' },
  { id: 'uninstall-native', label: 'Uninstall Native Install [confirmation required]', group: 'maintenance', kind: 'planned', dangerous: true, description: 'Use ./canva-linux.sh --uninstall-native for now.' },
  { id: 'uninstall-flatpak', label: 'Uninstall Flatpak Install [confirmation required]', group: 'maintenance', kind: 'planned', dangerous: true, description: 'Destructive TUI confirmation dialogs are planned for the next phase. Use ./canva-linux.sh --uninstall-flatpak for now.' },
  { id: 'uninstall-detected', label: 'Uninstall detected installations [confirmation required]', group: 'maintenance', kind: 'planned', dangerous: true, description: 'Use ./canva-linux.sh --uninstall for now.' },
  { id: 'purge', label: 'Uninstall detected installations and remove user data [confirmation required]', group: 'maintenance', kind: 'planned', dangerous: true, description: 'Use ./canva-linux.sh --purge for now.' },
];

export function getActionsByGroup(group: TuiActionGroup): TuiAction[] {
  return tuiActions.filter((action) => action.group === group);
}

export function getActionById(id: string): TuiAction | undefined {
  return tuiActions.find((action) => action.id === id);
}
