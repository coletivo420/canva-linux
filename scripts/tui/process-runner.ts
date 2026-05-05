import { spawn, type ChildProcess } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';

export type StreamSource = 'stdout' | 'stderr';

export function runAction(
  command: string,
  args: string[],
  onData: (text: string, source: StreamSource) => void,
  onClose: (code: number | null) => void,
): ChildProcess {
  const child = spawn(command, args, { cwd: process.cwd(), env: process.env, shell: false });
  const stdoutDecoder = new StringDecoder('utf8');
  const stderrDecoder = new StringDecoder('utf8');

  child.stdout?.on('data', (chunk: Buffer) => onData(stdoutDecoder.write(chunk), 'stdout'));
  child.stderr?.on('data', (chunk: Buffer) => onData(stderrDecoder.write(chunk), 'stderr'));

  child.stdout?.on('end', () => {
    const remaining = stdoutDecoder.end();
    if (remaining) onData(remaining, 'stdout');
  });

  child.stderr?.on('end', () => {
    const remaining = stderrDecoder.end();
    if (remaining) onData(remaining, 'stderr');
  });

  child.on('close', (code) => onClose(code));
  child.on('error', (err) => onData(`[error] ${String(err)}\n`, 'stderr'));

  return child;
}
