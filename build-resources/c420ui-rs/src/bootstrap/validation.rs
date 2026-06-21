use std::fs;
use std::path::{Path, PathBuf};

pub fn resolve_root(root_dir: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(root_dir);
    if !root.is_absolute() || !root.is_dir() {
        return Err("rootDir must be an existing absolute directory.".to_string());
    }
    Ok(root)
}

pub fn resolve_output_dir(root: &Path, bootstrap_out_dir: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(bootstrap_out_dir);
    let resolved = if candidate.is_absolute() {
        candidate
    } else {
        root.join(candidate)
    };
    if !resolved.starts_with(root) {
        return Err("bootstrapOutDir must stay within rootDir.".to_string());
    }
    let required = root.join("build-resources/c420ui/bootstrap/generated");
    if resolved != required {
        return Err(
            "bootstrapOutDir must be build-resources/c420ui/bootstrap/generated.".to_string(),
        );
    }
    Ok(resolved)
}

pub fn prepare_output_dir(dir: &Path) -> Result<(), String> {
    fs::remove_dir_all(dir).ok();
    fs::create_dir_all(dir)
        .map_err(|error| format!("Failed to create {}: {}", dir.display(), error))
}
