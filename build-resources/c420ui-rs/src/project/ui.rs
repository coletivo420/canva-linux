use crate::project::validation::ProjectDiagnostic;
use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUiConfig {
    #[serde(flatten)]
    pub data: serde_json::Value,
}

pub fn normalize_ui(
    value: serde_json::Value,
    diagnostics: &mut Vec<ProjectDiagnostic>,
) -> ProjectUiConfig {
    for key in ["projectName", "projectSubtitle", "c420uiTitle"] {
        if value
            .get(key)
            .and_then(|item| item.as_str())
            .unwrap_or("")
            .trim()
            .is_empty()
        {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-project-ui-label",
                format!("project-ui field is required: {}", key),
            ));
        }
    }
    if let Some(lines) = value.get("logoLines").and_then(|item| item.as_array()) {
        if lines.iter().any(|item| !item.is_string()) {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-project-ui-logo",
                "logoLines must contain only strings.",
            ));
        }
    }
    ProjectUiConfig { data: value }
}
