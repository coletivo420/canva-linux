use crate::settings::contracts::{SettingsRequest, SettingsResponse, ToolSettings};
use std::fs;
use std::path::PathBuf;

pub fn get_settings(request: SettingsRequest) -> Result<SettingsResponse, String> {
    let path = settings_path(&request)?;
    let settings = if path.is_file() {
        let text = fs::read_to_string(&path)
            .map_err(|error| format!("Failed to read settings {}: {}", path.display(), error))?;
        serde_json::from_str(&text)
            .map_err(|error| format!("Invalid settings JSON {}: {}", path.display(), error))?
    } else {
        ToolSettings::default()
    };
    Ok(SettingsResponse {
        ok: true,
        command: "settings-get",
        settings,
        path: path.to_string_lossy().to_string(),
        diagnostics: vec![],
    })
}

pub fn set_settings(request: SettingsRequest) -> Result<SettingsResponse, String> {
    let path = settings_path(&request)?;
    let settings = request.settings.unwrap_or_default();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create settings directory: {}", error))?;
    }
    fs::write(
        &path,
        format!("{}\n", serde_json::to_string_pretty(&settings).unwrap()),
    )
    .map_err(|error| format!("Failed to write settings {}: {}", path.display(), error))?;
    Ok(SettingsResponse {
        ok: true,
        command: "settings-set",
        settings,
        path: path.to_string_lossy().to_string(),
        diagnostics: vec![],
    })
}

fn settings_path(request: &SettingsRequest) -> Result<PathBuf, String> {
    if let Some(path) = request
        .settings_path
        .as_ref()
        .filter(|path| !path.trim().is_empty())
    {
        return Ok(PathBuf::from(path));
    }
    if let Some(root) = request
        .root_dir
        .as_ref()
        .filter(|root| !root.trim().is_empty())
    {
        return Ok(PathBuf::from(root)
            .join(".tmp")
            .join("c420ui")
            .join("tool-settings.json"));
    }
    let home = std::env::var("HOME")
        .map_err(|_| "HOME is required for default settings path".to_string())?;
    Ok(PathBuf::from(home)
        .join(".config")
        .join("c420ui")
        .join("tool-settings.json"))
}
