use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionLogRequest {
    pub text: Option<String>,
    #[serde(default)]
    pub append: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionLogResponse {
    pub ok: bool,
    pub command: &'static str,
    pub path: String,
    pub text: Option<String>,
    pub diagnostics: Vec<SessionLogDiagnostic>,
}

#[derive(Debug, Serialize)]
pub struct SessionLogDiagnostic {
    pub level: &'static str,
    pub code: &'static str,
    pub message: String,
}
