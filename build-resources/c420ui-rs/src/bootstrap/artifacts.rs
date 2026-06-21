use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub const ARTIFACTS: [&str; 3] = ["run-c420ui.mjs", "run-c420ui-cli.mjs", "c420ui-builder.mjs"];

pub fn artifact_hashes(dir: &Path) -> Result<BTreeMap<String, String>, String> {
    let mut output = BTreeMap::new();
    for artifact in ARTIFACTS {
        output.insert(artifact.to_string(), sha256_file(&dir.join(artifact))?);
    }
    Ok(output)
}

pub fn sha256_file(path: &Path) -> Result<String, String> {
    let output = Command::new("sha256sum")
        .arg(path)
        .output()
        .map_err(|error| format!("Failed to run sha256sum: {}", error))?;
    if !output.status.success() {
        return Err(format!("sha256sum failed for {}", path.display()));
    }
    let stdout = String::from_utf8(output.stdout).map_err(|error| error.to_string())?;
    let hash = stdout
        .split_whitespace()
        .next()
        .ok_or_else(|| format!("sha256sum produced no hash for {}", path.display()))?;
    Ok(format!("sha256:{}", hash))
}

pub fn require_artifacts(dir: &Path) -> Result<(), String> {
    for artifact in ARTIFACTS {
        let path = dir.join(artifact);
        let metadata = fs::metadata(&path)
            .map_err(|error| format!("Missing bootstrap artifact {}: {}", path.display(), error))?;
        if !metadata.is_file() || metadata.len() == 0 {
            return Err(format!(
                "Bootstrap artifact must be a non-empty file: {}",
                path.display()
            ));
        }
    }
    Ok(())
}

pub fn artifact_path(root: &Path, artifact: &str) -> PathBuf {
    root.join("build-resources/c420ui/bootstrap/generated")
        .join(artifact)
}
