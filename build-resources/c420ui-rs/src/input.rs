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
