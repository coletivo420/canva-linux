use crate::commands::check_command::{check_command, CommandCheckResult, CommandDependencyInfo};
use crate::commands::check_node::{check_node, NodeCheckResult};
use crate::input::CheckInput;
use crate::json::CommandEnvelope;
use serde::Serialize;

#[derive(Serialize)]
pub struct CheckHostDependenciesData {
    pub status: &'static str,
    pub message: String,
    pub dependencies: Vec<CommandDependencyInfo>,
}

pub fn execute() -> Result<(), String> {
    let input: CheckInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;

    let path_env = input
        .env
        .as_ref()
        .and_then(|m| m.get("PATH").cloned())
        .or_else(|| std::env::var("PATH").ok())
        .unwrap_or_default();

    // 1. Check Node
    if let Some(node_config) = &input.node {
        match check_node(node_config) {
            NodeCheckResult::Failed { message } => {
                let data = CheckHostDependenciesData {
                    status: "failed",
                    message,
                    dependencies: vec![],
                };
                let envelope = CommandEnvelope {
                    ok: false,
                    command: "check-host-dependencies",
                    version: "0.1.0",
                    data,
                };
                println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
                return Ok(());
            }
            NodeCheckResult::Success => {}
        }
    }

    // 2. Check Commands
    let mut missing_cmds: Vec<CommandDependencyInfo> = vec![];
    if let Some(commands) = &input.commands {
        for cmd in commands {
            match check_command(cmd, &path_env) {
                CommandCheckResult::Missing { info } => {
                    missing_cmds.push(info);
                }
                CommandCheckResult::Available => {}
            }
        }
    }

    if !missing_cmds.is_empty() {
        let missing_names: Vec<String> = missing_cmds.iter().map(|c| c.command.clone()).collect();
        let message = format!(
            "Missing required command dependencies: {}.",
            missing_names.join(", ")
        );
        let data = CheckHostDependenciesData {
            status: "missing",
            message,
            dependencies: missing_cmds,
        };
        let envelope = CommandEnvelope {
            ok: false,
            command: "check-host-dependencies",
            version: "0.1.0",
            data,
        };
        println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
        return Ok(());
    }

    // 3. Available
    let data = CheckHostDependenciesData {
        status: "available",
        message: "Host dependencies are available.".to_string(),
        dependencies: vec![],
    };
    let envelope = CommandEnvelope {
        ok: true,
        command: "check-host-dependencies",
        version: "0.1.0",
        data,
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
