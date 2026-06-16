import { runBuildAppImage } from "../operations/packaging/appimage.js";
await runBuildAppImage(process.argv.slice(2));
