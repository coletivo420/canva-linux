use crate::input::InputCommand;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct CommandDependencyInfo {
    pub id: String,
    pub label: String,
    pub command: String,
    #[serde(rename = "requiredFor")]
    pub required_for: Vec<String>,
}

pub enum CommandCheckResult {
    Available,
    Missing { info: CommandDependencyInfo },
}

pub fn check_command(cmd: &InputCommand, path_env: &str) -> CommandCheckResult {
    let required = cmd.required.unwrap_or(false);
    if !required {
        return CommandCheckResult::Available;
    }

    let is_available =
        crate::host::path_lookup::find_command_in_path(&cmd.command, path_env).is_some();

    if is_available {
        CommandCheckResult::Available
    } else {
        CommandCheckResult::Missing {
            info: CommandDependencyInfo {
                id: cmd.id.clone(),
                label: cmd.id.clone(),
                command: cmd.command.clone(),
                required_for: cmd.required_for.clone().unwrap_or_default(),
            },
        }
    }
}
