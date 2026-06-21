use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsRequest {
    pub root_dir: Option<String>,
    pub settings_path: Option<String>,
    pub settings: Option<ToolSettings>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolSettings {
    pub general_logs_enabled: bool,
    pub terminal_text_selection_mode: bool,
}

impl Default for ToolSettings {
    fn default() -> Self {
        Self {
            general_logs_enabled: true,
            terminal_text_selection_mode: false,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsResponse {
    pub ok: bool,
    pub command: &'static str,
    pub settings: ToolSettings,
    pub path: String,
    pub diagnostics: Vec<SettingsDiagnostic>,
}

#[derive(Debug, Serialize)]
pub struct SettingsDiagnostic {
    pub level: &'static str,
    pub code: &'static str,
    pub message: String,
}
