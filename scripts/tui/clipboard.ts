import { spawnSync } from 'node:child_process';

function has(cmd: string) { return spawnSync('bash', ['-lc', `command -v ${cmd}`]).status === 0; }
function run(cmd: string, args: string[], input?: string) { const r = spawnSync(cmd, args, { input, encoding: 'utf8' }); return r.status === 0; }

export function copyTextToClipboard(text: string): { ok: boolean; message: string } {
  if (!text.trim()) return { ok: false, message: 'No logs to copy.' };
  const desktop = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase();
  const wayland = Boolean(process.env.WAYLAND_DISPLAY);
  const candidates: Array<() => { ok: boolean; message: string } | null> = [
    () => (wayland && has('wl-copy') && run('wl-copy', [], text) ? { ok: true, message: 'Logs copied to clipboard via wl-copy.' } : null),
    () => (desktop.includes('kde') && has('qdbus6') && run('qdbus6', ['org.kde.klipper', '/klipper', 'setClipboardContents', text]) ? { ok: true, message: 'Logs copied to clipboard via KDE Klipper (qdbus6).' } : null),
    () => (desktop.includes('kde') && has('qdbus') && run('qdbus', ['org.kde.klipper', '/klipper', 'setClipboardContents', text]) ? { ok: true, message: 'Logs copied to clipboard via KDE Klipper (qdbus).' } : null),
    () => (desktop.includes('gnome') && has('gpaste-client') && run('gpaste-client', ['add', text]) ? { ok: true, message: 'Logs copied to clipboard via GPaste.' } : null),
    () => (desktop.includes('gnome') && has('gpaste') && run('gpaste', ['add', text]) ? { ok: true, message: 'Logs copied to clipboard via GPaste.' } : null),
    () => (has('xclip') && run('xclip', ['-selection', 'clipboard'], text) ? { ok: true, message: 'Logs copied to clipboard via xclip.' } : null),
    () => (has('xsel') && run('xsel', ['--clipboard', '--input'], text) ? { ok: true, message: 'Logs copied to clipboard via xsel.' } : null),
  ];
  for (const c of candidates) { const r = c(); if (r?.ok) return r; }
  return { ok: false, message: 'No clipboard tool found. Install wl-clipboard, KDE qdbus support, GPaste, xclip or xsel.' };
}
