import { runCanvaLinuxC420UI } from "../c420ui-canva-linux/run";

try {
  runCanvaLinuxC420UI(process.cwd());
} catch (error) {
  console.error(error);
  process.exit(1);
}
