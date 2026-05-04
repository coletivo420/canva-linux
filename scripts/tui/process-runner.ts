import { spawn } from 'node:child_process';

export function runAction(command: string, args: string[], onData: (line: string) => void, onClose: (code: number|null) => void) {
  const child = spawn(command, args, { cwd: process.cwd(), env: process.env, shell: false });
  child.stdout.on('data', (chunk) => onData(chunk.toString()));
  child.stderr.on('data', (chunk) => onData(chunk.toString()));
  child.on('close', (code) => onClose(code));
  child.on('error', (err) => onData(`[error] ${String(err)}\n`));
  return child;
}
