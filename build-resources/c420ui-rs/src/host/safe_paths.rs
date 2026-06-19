use std::fs;
use std::path::{Component, Path, PathBuf};

pub fn validate_relative_target(target: &str) -> Result<(), String> {
    let trimmed = target.trim();
    if trimmed.is_empty() {
        return Err("target must not be empty".to_string());
    }
    let path = Path::new(trimmed);
    if path.is_absolute() {
        return Err(format!("target must be relative: {}", target));
    }
    for component in path.components() {
        match component {
            Component::ParentDir => return Err(format!("target must not contain ..: {}", target)),
            Component::RootDir | Component::Prefix(_) => {
                return Err(format!("target must be relative: {}", target));
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn resolve_safe_target(root_dir: &str, target: &str) -> Result<(PathBuf, PathBuf), String> {
    validate_relative_target(target)?;
    let root =
        fs::canonicalize(root_dir).map_err(|e| format!("failed to canonicalize rootDir: {}", e))?;
    let absolute = root.join(target);
    let parent = absolute
        .parent()
        .ok_or_else(|| format!("target has no parent: {}", target))?;

    if !parent.exists() {
        if !parent.starts_with(&root) {
            return Err(format!("target parent escapes rootDir: {}", target));
        }
        return Ok((root, absolute));
    }

    let canonical_parent = fs::canonicalize(parent)
        .map_err(|e| format!("failed to canonicalize target parent for {}: {}", target, e))?;
    if !canonical_parent.starts_with(&root) {
        return Err(format!("target escapes rootDir: {}", target));
    }
    if let Ok(metadata) = fs::symlink_metadata(&absolute) {
        if metadata.file_type().is_symlink() {
            return Err(format!("target must not be a symlink: {}", target));
        }
    }
    Ok((root, absolute))
}
