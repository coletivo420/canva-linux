import { copyTextToClipboardWithRust } from "../rust-clipboard.js";

export function copyTextToClipboard(text: string): Promise<{
  ok: boolean;
  message: string;
}> {
  return copyTextToClipboardWithRust({
    text,
    rootDir: process.cwd(),
    env: process.env,
  });
}
