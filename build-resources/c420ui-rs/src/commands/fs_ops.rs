use crate::host::sudo::run_sudo;
use crate::input::{FsOperationInput, FsOpsInput};
use crate::json::CommandEnvelope;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
struct FsOpResult {
    kind: &'static str,
    path: String,
    status: &'static str,
}

#[derive(Serialize)]
struct FsOpsData {
    results: Vec<FsOpResult>,
}

fn validate_absolute_path(value: &str) -> Result<PathBuf, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("path must not be empty".to_string());
    }
    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err(format!("path must be absolute: {}", value));
    }
    if path.parent().is_none() {
        return Err(format!("path must not target filesystem root: {}", value));
    }
    Ok(path)
}

fn validate_source_path(value: &str) -> Result<PathBuf, String> {
    let path = validate_absolute_path(value)?;
    if !path.exists() {
        return Err(format!("source path does not exist: {}", value));
    }
    Ok(path)
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("path has no parent: {}", path.display()))?;
    fs::create_dir_all(parent)
        .map_err(|e| format!("failed to create parent {}: {}", parent.display(), e))
}

#[cfg(unix)]
fn apply_mode(path: &Path, mode: Option<u32>) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    if let Some(mode) = mode {
        let permissions = fs::Permissions::from_mode(mode);
        fs::set_permissions(path, permissions)
            .map_err(|e| format!("failed to chmod {}: {}", path.display(), e))?;
    }
    Ok(())
}

#[cfg(not(unix))]
fn apply_mode(_path: &Path, _mode: Option<u32>) -> Result<(), String> {
    Ok(())
}

#[cfg(unix)]
fn chmod_path(path: &Path, mode: &str) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let parsed = u32::from_str_radix(mode.trim_start_matches("0o"), 8)
        .map_err(|e| format!("invalid chmod mode {}: {}", mode, e))?;
    fs::set_permissions(path, fs::Permissions::from_mode(parsed))
        .map_err(|e| format!("failed to chmod {}: {}", path.display(), e))
}

#[cfg(not(unix))]
fn chmod_path(_path: &Path, _mode: &str) -> Result<(), String> {
    Ok(())
}

fn copy_tree(from: &Path, to: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(from)
        .map_err(|e| format!("failed to inspect {}: {}", from.display(), e))?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "copy-tree source must not be a symlink: {}",
            from.display()
        ));
    }
    if !metadata.is_dir() {
        return Err(format!(
            "copy-tree source must be a directory: {}",
            from.display()
        ));
    }
    fs::create_dir_all(to).map_err(|e| format!("failed to create {}: {}", to.display(), e))?;
    for entry in
        fs::read_dir(from).map_err(|e| format!("failed to read {}: {}", from.display(), e))?
    {
        let entry = entry.map_err(|e| format!("failed to read directory entry: {}", e))?;
        let source = entry.path();
        let target = to.join(entry.file_name());
        let source_metadata = fs::symlink_metadata(&source)
            .map_err(|e| format!("failed to inspect {}: {}", source.display(), e))?;
        if source_metadata.file_type().is_symlink() {
            let link_target = fs::read_link(&source)
                .map_err(|e| format!("failed to read symlink {}: {}", source.display(), e))?;
            ensure_parent(&target)?;
            create_symlink(&link_target, &target)?;
        } else if source_metadata.is_dir() {
            copy_tree(&source, &target)?;
        } else {
            ensure_parent(&target)?;
            fs::copy(&source, &target).map_err(|e| {
                format!(
                    "failed to copy {} to {}: {}",
                    source.display(),
                    target.display(),
                    e
                )
            })?;
        }
    }
    Ok(())
}

fn sudo_install_file(
    root: &Path,
    source: &Path,
    target: &Path,
    mode: Option<u32>,
) -> Result<(), String> {
    let mode = format!("{:o}", mode.unwrap_or(0o644));
    let args = vec![
        "-D".to_string(),
        "-m".to_string(),
        mode,
        source.to_string_lossy().to_string(),
        target.to_string_lossy().to_string(),
    ];
    let status = run_sudo(root, false, "install", &args)?;
    if status != 0 {
        return Err(format!(
            "sudo install failed for {} with status {}",
            target.display(),
            status
        ));
    }
    Ok(())
}

#[cfg(unix)]
fn create_symlink(from: &Path, to: &Path) -> Result<(), String> {
    std::os::unix::fs::symlink(from, to).map_err(|e| {
        format!(
            "failed to symlink {} to {}: {}",
            to.display(),
            from.display(),
            e
        )
    })
}

#[cfg(not(unix))]
fn create_symlink(_from: &Path, _to: &Path) -> Result<(), String> {
    Err("symlink operation is only supported on Unix hosts".to_string())
}

fn remove_existing(path: &Path, recursive: bool, force: bool) -> Result<&'static str, String> {
    if !path.exists() && path.symlink_metadata().is_err() {
        if force {
            return Ok("missing");
        }
        return Err(format!("path does not exist: {}", path.display()));
    }
    let metadata = fs::symlink_metadata(path)
        .map_err(|e| format!("failed to inspect {}: {}", path.display(), e))?;
    if metadata.is_dir() && !metadata.file_type().is_symlink() {
        if !recursive {
            return Err(format!(
                "recursive remove required for directory: {}",
                path.display()
            ));
        }
        fs::remove_dir_all(path)
            .map_err(|e| format!("failed to remove directory {}: {}", path.display(), e))?;
    } else {
        fs::remove_file(path)
            .map_err(|e| format!("failed to remove file {}: {}", path.display(), e))?;
    }
    Ok("done")
}

pub fn execute() -> Result<(), String> {
    let input: FsOpsInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    let root = fs::canonicalize(&input.root_dir)
        .map_err(|e| format!("failed to canonicalize rootDir: {}", e))?;
    let mut results = Vec::new();

    for operation in input.operations {
        match operation {
            FsOperationInput::EnsureDir { path } => {
                let target = validate_absolute_path(&path)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "ensure-dir",
                        path,
                        status: "planned",
                    });
                    continue;
                }
                fs::create_dir_all(&target)
                    .map_err(|e| format!("failed to create {}: {}", target.display(), e))?;
                results.push(FsOpResult {
                    kind: "ensure-dir",
                    path,
                    status: "done",
                });
            }
            FsOperationInput::CopyTree { from, to } => {
                let source = validate_source_path(&from)?;
                let target = validate_absolute_path(&to)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "copy-tree",
                        path: to,
                        status: "planned",
                    });
                    continue;
                }
                if target.exists() {
                    remove_existing(&target, true, true)?;
                }
                copy_tree(&source, &target)?;
                results.push(FsOpResult {
                    kind: "copy-tree",
                    path: to,
                    status: "done",
                });
            }
            FsOperationInput::CopyFile { from, to, mode } => {
                let source = validate_source_path(&from)?;
                let target = validate_absolute_path(&to)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "copy-file",
                        path: to,
                        status: "planned",
                    });
                    continue;
                }
                if input.allow_sudo {
                    sudo_install_file(&root, &source, &target, mode)?;
                    results.push(FsOpResult {
                        kind: "copy-file",
                        path: to,
                        status: "done",
                    });
                    continue;
                }
                ensure_parent(&target)?;
                fs::copy(&source, &target).map_err(|e| {
                    format!(
                        "failed to copy {} to {}: {}",
                        source.display(),
                        target.display(),
                        e
                    )
                })?;
                apply_mode(&target, mode)?;
                results.push(FsOpResult {
                    kind: "copy-file",
                    path: to,
                    status: "done",
                });
            }
            FsOperationInput::InstallFile { from, to, mode } => {
                let source = validate_source_path(&from)?;
                let target = validate_absolute_path(&to)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "install-file",
                        path: to,
                        status: "planned",
                    });
                    continue;
                }
                if input.allow_sudo {
                    sudo_install_file(&root, &source, &target, mode)?;
                    results.push(FsOpResult {
                        kind: "install-file",
                        path: to,
                        status: "done",
                    });
                    continue;
                }
                ensure_parent(&target)?;
                fs::copy(&source, &target).map_err(|e| {
                    format!(
                        "failed to install {} to {}: {}",
                        source.display(),
                        target.display(),
                        e
                    )
                })?;
                apply_mode(&target, mode)?;
                results.push(FsOpResult {
                    kind: "install-file",
                    path: to,
                    status: "done",
                });
            }
            FsOperationInput::WriteFile {
                path,
                content,
                mode,
            } => {
                let target = validate_absolute_path(&path)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "write-file",
                        path,
                        status: "planned",
                    });
                    continue;
                }
                ensure_parent(&target)?;
                fs::write(&target, content)
                    .map_err(|e| format!("failed to write {}: {}", target.display(), e))?;
                apply_mode(&target, mode)?;
                results.push(FsOpResult {
                    kind: "write-file",
                    path,
                    status: "done",
                });
            }
            FsOperationInput::Remove {
                path,
                recursive,
                force,
            } => {
                let target = validate_absolute_path(&path)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "remove",
                        path,
                        status: "planned",
                    });
                    continue;
                }
                let status = remove_existing(&target, recursive, force)?;
                results.push(FsOpResult {
                    kind: "remove",
                    path,
                    status,
                });
            }
            FsOperationInput::Symlink { from, to, force } => {
                let source = validate_absolute_path(&from)?;
                let target = validate_absolute_path(&to)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "symlink",
                        path: to,
                        status: "planned",
                    });
                    continue;
                }
                ensure_parent(&target)?;
                if target.exists() || fs::symlink_metadata(&target).is_ok() {
                    if !force {
                        return Err(format!(
                            "symlink target already exists: {}",
                            target.display()
                        ));
                    }
                    remove_existing(&target, true, true)?;
                }
                create_symlink(&source, &target)?;
                results.push(FsOpResult {
                    kind: "symlink",
                    path: to,
                    status: "done",
                });
            }
            FsOperationInput::Chmod {
                path,
                mode,
                recursive: _,
            } => {
                let target = validate_absolute_path(&path)?;
                if input.dry_run {
                    results.push(FsOpResult {
                        kind: "chmod",
                        path,
                        status: "planned",
                    });
                    continue;
                }
                chmod_path(&target, &mode)?;
                results.push(FsOpResult {
                    kind: "chmod",
                    path,
                    status: "done",
                });
            }
        }
    }

    let envelope = CommandEnvelope {
        ok: true,
        command: "fs-ops",
        version: "0.1.0",
        data: FsOpsData { results },
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
