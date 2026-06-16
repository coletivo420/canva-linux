use crate::input::EnsureLinuxUnpackedInput;
use crate::json::CommandEnvelope;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnsureLinuxUnpackedData {
    selected: String,
    canonical: String,
    created_symlink: bool,
    dry_run: bool,
}

fn validate_name(name: &str, label: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err(format!("{} must not be empty", label));
    }
    let path = Path::new(name);
    if path.is_absolute() || path.components().count() != 1 {
        return Err(format!("{} must be a single directory name", label));
    }
    Ok(())
}

#[cfg(unix)]
fn symlink_dir(target: &str, link: &Path) -> Result<(), String> {
    std::os::unix::fs::symlink(target, link)
        .map_err(|e| format!("failed to create symlink {}: {}", link.display(), e))
}

#[cfg(not(unix))]
fn symlink_dir(_target: &str, _link: &Path) -> Result<(), String> {
    Err("symlink operation is only supported on Unix hosts".to_string())
}

pub fn execute() -> Result<(), String> {
    let input: EnsureLinuxUnpackedInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    validate_name(&input.canonical_name, "canonicalName")?;
    if input.candidate_contains.trim().is_empty() {
        return Err("candidateContains must not be empty".to_string());
    }
    let dist_dir = PathBuf::from(input.dist_dir.trim());
    if !dist_dir.is_absolute() {
        return Err("distDir must be absolute".to_string());
    }
    let dist_dir = fs::canonicalize(&dist_dir)
        .map_err(|e| format!("failed to canonicalize distDir: {}", e))?;

    let mut candidates = Vec::new();
    for entry in fs::read_dir(&dist_dir)
        .map_err(|e| format!("failed to read distDir {}: {}", dist_dir.display(), e))?
    {
        let entry = entry.map_err(|e| format!("failed to read distDir entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.contains(&input.candidate_contains) {
            candidates.push(file_name);
        }
    }
    candidates.sort();
    let selected = candidates
        .into_iter()
        .find(|name| name == &input.canonical_name)
        .or_else(|| {
            fs::read_dir(&dist_dir)
                .ok()?
                .filter_map(Result::ok)
                .map(|entry| entry.file_name().to_string_lossy().to_string())
                .filter(|name| name.contains(&input.candidate_contains))
                .min()
        })
        .ok_or_else(|| {
            format!(
                "Folder matching '{}' was not found in {}",
                input.candidate_contains,
                dist_dir.display()
            )
        })?;

    let selected_path = dist_dir.join(&selected);
    if !selected_path.exists() {
        return Err(format!("selected output does not exist: {}", selected));
    }

    let mut created_symlink = false;
    if selected != input.canonical_name {
        let canonical_path = dist_dir.join(&input.canonical_name);
        if input.dry_run {
            created_symlink = true;
        } else {
            if canonical_path.exists() || fs::symlink_metadata(&canonical_path).is_ok() {
                let metadata = fs::symlink_metadata(&canonical_path)
                    .map_err(|e| format!("failed to inspect canonical path: {}", e))?;
                if metadata.is_dir() && !metadata.file_type().is_symlink() {
                    fs::remove_dir_all(&canonical_path).map_err(|e| {
                        format!("failed to remove {}: {}", canonical_path.display(), e)
                    })?;
                } else {
                    fs::remove_file(&canonical_path).map_err(|e| {
                        format!("failed to remove {}: {}", canonical_path.display(), e)
                    })?;
                }
            }
            symlink_dir(&selected, &canonical_path)?;
            created_symlink = true;
        }
    }

    let envelope = CommandEnvelope {
        ok: true,
        command: "ensure-linux-unpacked",
        version: "0.1.0",
        data: EnsureLinuxUnpackedData {
            selected,
            canonical: input.canonical_name,
            created_symlink,
            dry_run: input.dry_run,
        },
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
