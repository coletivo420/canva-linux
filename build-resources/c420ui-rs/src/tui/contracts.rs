use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiRenderInput {
    pub brand: TuiBrand,
    pub project: TuiProject,
    pub view: TuiView,
    pub focus_zone: TuiFocusZone,
    pub menu: TuiMenu,
    pub panels: TuiPanels,
    pub footer: TuiFooter,
    pub progress: Option<TuiProgress>,
    pub modal: Option<TuiModal>,
    pub theme: TuiTheme,
    pub layout: Option<TuiLayoutHints>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TuiView {
    Main,
    Install,
    Development,
    Maintenance,
    Settings,
    Help,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TuiFocusZone {
    Menu,
    Diagnostics,
    Content,
    Logs,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiMenu {
    pub label: String,
    pub items: Vec<TuiMenuItem>,
    pub selected: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiMenuItem {
    pub id: String,
    pub label: String,
    pub view: Option<TuiView>,
    pub action_id: Option<String>,
    pub description: Option<String>,
    pub warning: Option<String>,
    pub dangerous: Option<bool>,
    pub planned: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiPanels {
    pub detected_installations: TuiPanel,
    pub generated_artifacts: TuiPanel,
    pub linux_artifacts: TuiPanel,
    pub content: TuiPanel,
    pub logs: TuiLogPanel,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiPanel {
    pub label: String,
    pub lines: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiLogPanel {
    pub label: String,
    pub lines: Vec<TuiLogLine>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiFooter {
    pub text_selection_mode: bool,
    pub items: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiModal {
    pub kind: TuiModalKind,
    pub title: String,
    pub message: String,
    pub dangerous: Option<bool>,
    pub secret: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TuiModalKind {
    Confirm,
    Input,
    Message,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiTheme {
    pub supports_true_color: bool,
    pub colors: TuiColors,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiColors {
    pub light_blue: String,
    pub blue: String,
    pub purple: String,
    pub success: String,
    pub warning: String,
    pub error: String,
    pub text: String,
    pub muted: String,
    pub background: String,
    pub surface: String,
    pub surface_alt: String,
    pub menu_selected_bg: String,
    pub menu_selected_fg: String,
    pub menu_inactive_selected_bg: String,
    pub menu_inactive_selected_fg: String,
    pub footer_bg: String,
    pub footer_fg: String,
    pub active_border: String,
    pub inactive_border: String,
    pub active_label: String,
    pub inactive_label: String,
    pub active_cell_bg: String,
    pub active_cell_fg: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiBrand {
    pub name: String,
    pub version: String,
    pub hash: Option<String>,
    pub logo_lines: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiProject {
    pub name: String,
    pub subtitle: Option<String>,
    pub version: String,
    pub display_version: String,
    pub phase: Option<String>,
    pub hash: Option<String>,
    pub logo_lines: Vec<String>,
    pub release_notes: String,
    pub app_id: String,
    pub executable_name: String,
    pub repository_url: String,
    pub launcher_command: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuiAction {
    pub id: String,
    pub label: String,
    pub group: String,
    pub description: Option<String>,
    pub warning: Option<String>,
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
