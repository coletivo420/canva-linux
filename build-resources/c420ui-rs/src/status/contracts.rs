use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusPanelsRequest {
    pub root_dir: String,
    pub project_config_root: String,
    pub overview_status: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusPanelsResponse {
    pub ok: bool,
    pub command: &'static str,
    pub panels: StatusPanels,
    pub diagnostics: Vec<StatusDiagnostic>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusPanels {
    pub detected_installations: StatusPanel,
    pub generated_artifacts: StatusPanel,
    pub linux_artifacts: StatusPanel,
    pub content: StatusPanel,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusPanel {
    pub label: String,
    pub lines: Vec<StatusPanelLine>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StatusPanelLine {
    pub label: Option<String>,
    pub value: String,
    pub state: Option<String>,
    pub hash: Option<String>,
    pub wrap: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct StatusDiagnostic {
    pub level: &'static str,
    pub code: &'static str,
    pub message: String,
}

impl StatusPanel {
    pub fn new(label: &str, lines: Vec<StatusPanelLine>) -> Self {
        Self {
            label: label.to_string(),
            lines,
        }
    }
}

impl StatusPanelLine {
    pub fn new(label: impl Into<String>, value: impl Into<String>, state: &str) -> Self {
        Self {
            label: Some(label.into()),
            value: value.into(),
            state: Some(state.to_string()),
            hash: None,
            wrap: Some(true),
        }
    }

    pub fn with_hash(mut self, hash: Option<String>) -> Self {
        self.hash = hash;
        self
    }
}
