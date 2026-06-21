use crate::bootstrap::artifacts::sha256_file;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn calculate_source_hash(root: &Path, scope: &str) -> Result<String, String> {
    let files = collect_scope_files(root, scope)?;
    let mut lines = String::new();
    for file in files {
        let hash = sha256_file(&root.join(&file))?;
        lines.push_str(&hash);
        lines.push(' ');
        lines.push_str(&file);
        lines.push('\n');
    }
    hash_bytes(lines.as_bytes())
}

pub fn collect_scope_files(root: &Path, scope: &str) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    match scope {
        "c420ui" => collect_dir(root, root.join("build-resources/c420ui"), &mut files)?,
        "dependent-project" => collect_dependent_project(root, &mut files)?,
        "combined" => {
            collect_dir(root, root.join("build-resources/c420ui"), &mut files)?;
            collect_dependent_project(root, &mut files)?;
        }
        other => return Err(format!("Unsupported source hash scope: {}", other)),
    }
    files.sort();
    Ok(files)
}

fn collect_dependent_project(root: &Path, files: &mut Vec<String>) -> Result<(), String> {
    let build_resources = root.join("build-resources");
    if !build_resources.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(&build_resources).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name == "c420ui" || name == "c420ui-rs" {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            collect_dir(root, path, files)?;
        }
    }
    Ok(())
}

fn collect_dir(root: &Path, dir: PathBuf, files: &mut Vec<String>) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(&dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name == "generated" || name == "node_modules" || name == ".build" {
            continue;
        }
        if path.is_dir() {
            collect_dir(root, path, files)?;
        } else if path.is_file() {
            if matches!(
                path.extension().and_then(|item| item.to_str()),
                Some("ts" | "json" | "md")
            ) {
                files.push(
                    path.strip_prefix(root)
                        .map_err(|error| error.to_string())?
                        .to_string_lossy()
                        .replace('\\', "/"),
                );
            }
        }
    }
    Ok(())
}

fn hash_bytes(bytes: &[u8]) -> Result<String, String> {
    let mut child = Command::new("sha256sum")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to run sha256sum: {}", error))?;
    use std::io::Write;
    child
        .stdin
        .as_mut()
        .ok_or_else(|| "Failed to open sha256sum stdin".to_string())?
        .write_all(bytes)
        .map_err(|error| error.to_string())?;
    let output = child
        .wait_with_output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err("sha256sum failed".to_string());
    }
    let stdout = String::from_utf8(output.stdout).map_err(|error| error.to_string())?;
    let hash = stdout
        .split_whitespace()
        .next()
        .ok_or_else(|| "sha256sum produced no hash".to_string())?;
    Ok(format!("sha256:{}", hash))
}
