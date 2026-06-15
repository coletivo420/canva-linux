use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
pub struct InputNode {
    pub required: Option<bool>,
    #[serde(rename = "minimumMajor")]
    pub minimum_major: Option<u32>,
    pub version: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[allow(dead_code)]
pub struct InputCommand {
    pub id: String,
    pub command: String,
    pub required: Option<bool>,
    #[serde(rename = "requiredFor")]
    pub required_for: Option<Vec<String>>,
    #[serde(rename = "installHint")]
    pub install_hint: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CheckInput {
    pub node: Option<InputNode>,
    pub commands: Option<Vec<InputCommand>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Deserialize, Debug)]
pub struct RunProcessInput {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub cwd: String,
    pub env: Option<HashMap<String, String>>,
    #[allow(dead_code)]
    pub label: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CancelInput {
    pub event: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemovePathsInput {
    pub root_dir: String,
    #[serde(default)]
    pub targets: Vec<String>,
    #[serde(default)]
    pub dry_run: bool,
    #[serde(default)]
    pub allow_sudo: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FixPermissionsInput {
    pub root_dir: String,
    #[serde(default)]
    pub targets: Vec<String>,
    pub user: String,
    pub group: Option<String>,
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SudoValidateInput {
    pub root_dir: String,
    #[serde(default)]
    pub non_interactive: bool,
    pub timeout_seconds: Option<u64>,
    #[serde(default)]
    pub refuse_user_scope: bool,
    pub action_scope: Option<String>,
}
