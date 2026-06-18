import { loadCanvaLinuxAppImageArtifactPattern } from "../../canva-linux/c420ui-adapter/packaging.js";
import { projectRoot } from "../host/paths.js";
import { runBuildAppImage } from "../operations/packaging/appimage.js";

const rootDir = projectRoot();
await runBuildAppImage(process.argv.slice(2), {
  artifactPattern: loadCanvaLinuxAppImageArtifactPattern(rootDir),
});
