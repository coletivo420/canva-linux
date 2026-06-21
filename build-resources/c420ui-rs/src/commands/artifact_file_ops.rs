use crate::input::ArtifactFileOpsInput;
use crate::json::CommandEnvelope;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CleanedFile {
    path: String,
    status: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ArtifactFileOpsData {
    cleaned: Vec<CleanedFile>,
    selected: Option<String>,
    size: Option<u64>,
}

fn validate_suffix(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty() {
        return Err(format!("{} must not be empty", label));
    }
    if value.contains('/') || value.contains('\\') || value.contains("..") {
        return Err(format!("{} must be a filename fragment", label));
    }
    Ok(())
}

pub fn execute() -> Result<(), String> {
    let input: ArtifactFileOpsInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    let dist_dir = PathBuf::from(input.dist_dir.trim());
    if !dist_dir.is_absolute() {
        return Err("distDir must be absolute".to_string());
    }
    if let Some(find) = &input.find {
        if find.expect != "one" {
            return Err("artifact find expect must be 'one'".to_string());
        }
        validate_suffix(&find.starts_with, "find.startsWith")?;
        validate_suffix(&find.ends_with, "find.endsWith")?;
    }
    for suffix in &input.cleanup {
        validate_suffix(suffix, "cleanup suffix")?;
    }

    if !input.dry_run {
        fs::create_dir_all(&dist_dir)
            .map_err(|e| format!("failed to create distDir {}: {}", dist_dir.display(), e))?;
    }

    let mut cleaned = Vec::new();
    if dist_dir.exists() {
        for entry in fs::read_dir(&dist_dir)
            .map_err(|e| format!("failed to read distDir {}: {}", dist_dir.display(), e))?
        {
            let entry = entry.map_err(|e| format!("failed to read distDir entry: {}", e))?;
            let file_name = entry.file_name().to_string_lossy().to_string();
            let should_clean = input
                .cleanup
                .iter()
                .any(|suffix| file_name.ends_with(suffix));
            if !should_clean {
                continue;
            }
            let path = entry.path();
            if input.dry_run {
                cleaned.push(CleanedFile {
                    path: path.to_string_lossy().to_string(),
                    status: "planned",
                });
            } else {
                let metadata = fs::symlink_metadata(&path)
                    .map_err(|e| format!("failed to inspect {}: {}", path.display(), e))?;
                if metadata.is_dir() && !metadata.file_type().is_symlink() {
                    fs::remove_dir_all(&path)
                        .map_err(|e| format!("failed to remove {}: {}", path.display(), e))?;
                } else {
                    fs::remove_file(&path)
                        .map_err(|e| format!("failed to remove {}: {}", path.display(), e))?;
                }
                cleaned.push(CleanedFile {
                    path: path.to_string_lossy().to_string(),
                    status: "removed",
                });
            }
        }
    }

    let mut matches = Vec::new();
    if let Some(find) = &input.find {
        if dist_dir.exists() {
            for entry in fs::read_dir(&dist_dir)
                .map_err(|e| format!("failed to read distDir {}: {}", dist_dir.display(), e))?
            {
                let entry = entry.map_err(|e| format!("failed to read distDir entry: {}", e))?;
                let file_name = entry.file_name().to_string_lossy().to_string();
                if file_name.starts_with(&find.starts_with) && file_name.ends_with(&find.ends_with)
                {
                    matches.push(entry.path());
                }
            }
        }
    }
    matches.sort();

    let (selected, size) = if matches.is_empty() {
        (None, None)
    } else if matches.len() == 1 {
        let selected = matches.remove(0);
        let size = fs::metadata(&selected)
            .map_err(|e| {
                format!(
                    "failed to stat selected artifact {}: {}",
                    selected.display(),
                    e
                )
            })?
            .len();
        if size == 0 {
            return Err(format!(
                "selected artifact is empty: {}",
                selected.display()
            ));
        }
        (Some(selected.to_string_lossy().to_string()), Some(size))
    } else {
        return Err(format!(
            "expected exactly one artifact, found {}",
            matches.len()
        ));
    };

    let envelope = CommandEnvelope {
        ok: true,
        command: "artifact-file-ops",
        version: "0.1.0",
        data: ArtifactFileOpsData {
            cleaned,
            selected,
            size,
        },
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
