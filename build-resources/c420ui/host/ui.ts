export function info(message: string): void { console.log(`[info] ${message}`); }
export function ok(message: string): void { console.log(`[ok] ${message}`); }
export function warn(message: string): void { console.warn(`[warn] ${message}`); }
export function error(message: string): void { console.error(`[error] ${message}`); }
export function section(title: string): void {
  console.log("");
  console.log(`=== ${title} ===`);
}
export function subsection(title: string): void {
  console.log("");
  console.log(`--- ${title} ---`);
}
export function cmd(command: string): void {
  console.log(`  $ ${command}`);
}
