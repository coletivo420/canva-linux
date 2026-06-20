use crate::action::contracts::ActionDefinition;
use crate::project::validation::{validate_identifier, ProjectDiagnostic};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectActionDefinition {
    pub id: String,
    pub label: String,
    pub description: Option<String>,
    pub group: Option<String>,
    pub kind: Option<String>,
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default, alias = "cli")]
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

pub fn normalize_actions(
    actions: Vec<ProjectActionDefinition>,
    diagnostics: &mut Vec<ProjectDiagnostic>,
) -> Vec<ActionDefinition> {
    let mut ids = HashSet::new();
    let mut flags = HashSet::new();
    let mut normalized = Vec::new();

    for action in actions {
        if !validate_identifier(&action.id) {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-action-id",
                "Action id is required and must be identifier-like.",
            ));
        } else if !ids.insert(action.id.clone()) {
            diagnostics.push(ProjectDiagnostic::error(
                "duplicate-action-id",
                format!("Duplicate action id: {}", action.id),
            ));
        }

        if action.label.trim().is_empty() {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-action-label",
                format!("Action label is required: {}", action.id),
            ));
        }

        let is_command = action.kind.as_deref().unwrap_or("command") == "command";
        let planned = action.planned || action.kind.as_deref() == Some("planned");
        if is_command && !planned && action.command.as_deref().unwrap_or("").trim().is_empty() {
            diagnostics.push(ProjectDiagnostic::error(
                "invalid-action-command",
                format!("Command action requires command: {}", action.id),
            ));
        }

        for flag in &action.cli_flags {
            if flag.trim().is_empty() || !flag.starts_with("--") {
                diagnostics.push(ProjectDiagnostic::error(
                    "invalid-action-cli-flag",
                    format!("Invalid cli flag on action {}.", action.id),
                ));
            } else if !flags.insert(flag.clone()) {
                diagnostics.push(ProjectDiagnostic::error(
                    "duplicate-action-cli-flag",
                    format!("Duplicate action cli flag: {}", flag),
                ));
            }
        }

        normalized.push(ActionDefinition {
            id: action.id,
            label: action.label,
            description: action.description,
            group: action.group,
            command: action.command,
            args: action.args,
            cli_flags: action.cli_flags,
            dangerous: action.dangerous,
            planned,
            requires_confirmation: action.requires_confirmation,
            requires_root: action.requires_root,
            env: action.env,
        });
    }

    normalized
}
