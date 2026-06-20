use crate::project::validation::{validate_relative_path, ProjectDiagnostic};
use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMaintenanceConfig {
    #[serde(flatten)]
    pub data: serde_json::Value,
}

pub fn normalize_maintenance(
    value: serde_json::Value,
    diagnostics: &mut Vec<ProjectDiagnostic>,
) -> ProjectMaintenanceConfig {
    for key in [
        "cleanupTargets",
        "permissionTargets",
        "purgeTargets",
        "resetTargets",
    ] {
        if let Some(targets) = value.get(key).and_then(|item| item.as_array()) {
            for target in targets {
                if let Some(path) = target.as_str() {
                    if !validate_relative_path(path) || is_dangerous_target(path) {
                        diagnostics.push(ProjectDiagnostic::error(
                            "invalid-maintenance-target",
                            format!("Maintenance target is unsafe: {}", path),
                        ));
                    }
                }
            }
        }
    }
    ProjectMaintenanceConfig { data: value }
}

fn is_dangerous_target(value: &str) -> bool {
    matches!(value.trim(), "" | "." | "/" | "~")
}
