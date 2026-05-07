#!/usr/bin/env node
import { runCanvaLinuxC420UICli } from "./c420ui-canva-linux/cli";

runCanvaLinuxC420UICli(process.argv.slice(2))
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
