import { runNativeUninstall } from "../operations/uninstall/native.js";
await runNativeUninstall(process.argv.slice(2));
