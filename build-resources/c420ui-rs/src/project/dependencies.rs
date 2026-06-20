use crate::host::path_lookup::find_command_in_path;
use crate::input::InputNode;
use crate::project::validation::{validate_identifier, ProjectDiagnostic};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProjectHostDependencyConfig {
    pub node: Option<InputNode>,
    #[serde(default)]
    pub commands: Vec<ProjectCommandDependency>,
    pub npm: Option<serde_json::Value>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectCommandDependency {
    pub id: String,
    #[serde(alias = "name")]
    pub command: String,
    #[serde(default = "default_required")]
    pub required: bool,
    #[serde(default)]
    pub optional: bool,
    #[serde(default)]
    pub required_for: Vec<String>,
    #[serde(default, alias = "installHint")]
    pub guidance: Option<String>,
    pub scope: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedHostDependency {
    pub id: String,
    pub commands: Vec<String>,
    pub required: bool,
    pub available: bool,
    pub guidance: Option<String>,
    pub scope: Option<String>,
}

fn default_required() -> bool {
    true
}

pub fn resolve_host_dependencies(
    config: ProjectHostDependencyConfig,
    diagnostics: &mut Vec<ProjectDiagnostic>,
) -> Vec<ResolvedHostDependency> {
    let path_env = config
        .env
        .get("PATH")
        .cloned()
        .or_else(|| std::env::var("PATH").ok())
        .unwrap_or_default();

    let mut output = Vec::new();
    for command in config.commands {
        if !validate_identifier(&command.id) {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-host-dependency-id",
                "Host dependency id is required.",
            ));
        }
        if command.command.trim().is_empty() {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-host-dependency-command",
                format!("Host dependency command is required: {}", command.id),
            ));
        }
        let available = find_command_in_path(&command.command, &path_env).is_some();
        if command.required && !command.optional && !available {
            diagnostics.push(ProjectDiagnostic::warning(
                "missing-host-dependency",
                format!("Host dependency is not available: {}", command.id),
            ));
        }
        output.push(ResolvedHostDependency {
            id: command.id,
            commands: vec![command.command],
            required: command.required && !command.optional,
            available,
            guidance: command.guidance,
            scope: command.scope,
        });
    }
    output
}
