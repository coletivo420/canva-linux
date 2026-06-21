use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ActionRunRequest {
    pub root_dir: String,
    pub action_id: String,
    #[serde(default)]
    pub project_config_root: Option<String>,
    #[serde(default)]
    pub cli_flag: Option<String>,
    #[serde(default)]
    pub dry_run: bool,
    #[serde(default)]
    pub yes: bool,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub actions: Vec<ActionDefinition>,
    #[serde(default)]
    pub root_policy: Option<RootPolicyInput>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActionDefinition {
    pub id: String,
    pub label: String,
    pub description: Option<String>,
    pub group: Option<String>,
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub cli_flags: Vec<String>,
    #[serde(default)]
    pub dangerous: bool,
    #[serde(default)]
    pub planned: bool,
    #[serde(default)]
    pub requires_confirmation: bool,
    #[serde(default)]
    pub requires_root: bool,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RootPolicyInput {
    #[serde(default)]
    pub requires_root: bool,
    pub reason: Option<String>,
    #[serde(default)]
    pub action_env: HashMap<String, String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase", tag = "event")]
pub enum ActionControllerEvent {
    #[serde(rename = "root-response")]
    RootResponse {
        request_id: String,
        accepted: bool,
        #[serde(default)]
        env: HashMap<String, String>,
    },
    #[serde(rename = "cancel")]
    Cancel,
}
