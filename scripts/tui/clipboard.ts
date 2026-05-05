import { spawnSync } from 'node:child_process';

function has(command: string): boolean {
  return spawnSync('bash', ['-c', `command -v ${command}`]).status === 0;
}

function runWithInput(command: string, args: string[], input: string): boolean {
  const result = spawnSync(command, args, { input, encoding: 'utf8' });
  return result.status === 0;
}

export function copyTextToClipboard(text: string): { ok: boolean; message: string } {
  if (!text.trim()) return { ok: false, message: 'No logs to copy.' };

  if (process.env.WAYLAND_DISPLAY && has('wl-copy') && runWithInput('wl-copy', [], text)) {
    return { ok: true, message: 'Logs copied to clipboard via wl-copy.' };
  }

  if ((process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('kde')) {
    if (has('qdbus6') && runWithInput('bash', ['-lc', 'input=$(cat); qdbus6 org.kde.klipper /klipper setClipboardContents "$input"'], text)) {
      return { ok: true, message: 'Logs copied to clipboard via KDE Klipper (qdbus6).' };
    }
    if (has('qdbus') && runWithInput('bash', ['-lc', 'input=$(cat); qdbus org.kde.klipper /klipper setClipboardContents "$input"'], text)) {
      return { ok: true, message: 'Logs copied to clipboard via KDE Klipper (qdbus).' };
    }
  }

  if ((process.env.XDG_CURRENT_DESKTOP || '').toLowerCase().includes('gnome')) {
    if (has('gpaste-client') && runWithInput('gpaste-client', ['add'], text)) return { ok: true, message: 'Logs copied to clipboard via GPaste.' };
    if (has('gpaste') && runWithInput('gpaste', ['add'], text)) return { ok: true, message: 'Logs copied to clipboard via GPaste.' };
  }

  if (has('xclip') && runWithInput('xclip', ['-selection', 'clipboard'], text)) return { ok: true, message: 'Logs copied to clipboard via xclip.' };
  if (has('xsel') && runWithInput('xsel', ['--clipboard', '--input'], text)) return { ok: true, message: 'Logs copied to clipboard via xsel.' };

  return { ok: false, message: 'No clipboard tool found. Install wl-clipboard, KDE qdbus support, GPaste, xclip or xsel.' };
}
