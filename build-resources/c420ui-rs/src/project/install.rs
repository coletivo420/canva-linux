use crate::project::validation::{validate_relative_path, ProjectDiagnostic};
use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInstallConfig {
    #[serde(flatten)]
    pub data: serde_json::Value,
}

pub fn normalize_install(
    value: serde_json::Value,
    diagnostics: &mut Vec<ProjectDiagnostic>,
) -> ProjectInstallConfig {
    if let Some(executable) = value.get("executable").and_then(|item| item.as_str()) {
        if executable.contains('/') || executable.trim().is_empty() {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-install-executable",
                "Install executable must be a command name without slash.",
            ));
        }
    }

    if let Some(desktop_name) = value.get("desktopName").and_then(|item| item.as_str()) {
        if !desktop_name.ends_with(".desktop") {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-install-desktop-name",
                "Install desktopName must end with .desktop.",
            ));
        }
    }

    for section in ["system", "user"] {
        if let Some(paths) = value.get(section).and_then(|item| item.as_object()) {
            for (key, item) in paths {
                if let Some(path) = item.as_str() {
                    if !validate_relative_path(path) {
                        diagnostics.push(ProjectDiagnostic::error(
                            "invalid-install-path",
                            format!("Install path must not traverse upward: {}.{}", section, key),
                        ));
                    }
                }
            }
        }
    }

    if let Some(path) = value
        .get("buildMetadataTarget")
        .and_then(|item| item.as_str())
    {
        if !validate_relative_path(path) {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-install-path",
                "buildMetadataTarget must not traverse upward.",
            ));
        }
    }

    ProjectInstallConfig { data: value }
}
