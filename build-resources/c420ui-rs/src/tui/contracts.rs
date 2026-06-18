use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiRenderInput {
    pub brand: TuiBrand,
    pub project: TuiProject,
    #[serde(default)]
    pub actions: Vec<TuiAction>,
    pub status: Option<TuiStatus>,
    #[serde(default)]
    pub logs: Vec<TuiLogLine>,
    pub progress: Option<TuiProgress>,
    pub layout: Option<TuiLayoutHints>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiBrand {
    pub name: String,
    pub version: String,
    pub hash: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiProject {
    pub name: String,
    pub subtitle: Option<String>,
    pub version: String,
    pub phase: Option<String>,
    pub hash: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiAction {
    pub id: String,
    pub label: String,
    pub group: String,
    #[serde(default)]
    pub dangerous: bool,
    #[serde(default)]
    pub planned: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiStatus {
    pub label: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiLogLine {
    pub source: String,
    pub line: String,
    pub level: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiProgress {
    pub state: String,
    pub label: Option<String>,
    pub percent: Option<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiLayoutHints {
    pub width: Option<u16>,
    pub height: Option<u16>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiRenderOutput {
    pub ok: bool,
    pub command: &'static str,
    pub version: &'static str,
    pub screen: TuiScreen,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiScreen {
    pub title: String,
    pub lines: Vec<String>,
}
