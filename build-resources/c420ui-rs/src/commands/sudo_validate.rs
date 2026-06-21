use crate::host::sudo::validate_sudo;
use crate::input::SudoValidateInput;
use crate::json::CommandEnvelope;
use serde::Serialize;
use std::fs;
use std::time::Duration;

#[derive(Serialize)]
struct SudoValidateData {
    available: bool,
}

pub fn execute() -> Result<(), String> {
    let input: SudoValidateInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;

    if input.refuse_user_scope && input.action_scope.as_deref() == Some("user") {
        let envelope = CommandEnvelope {
            ok: false,
            command: "sudo-validate",
            version: "0.1.0",
            data: SudoValidateData { available: false },
        };
        println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
        return Ok(());
    }

    let root = fs::canonicalize(&input.root_dir)
        .map_err(|e| format!("failed to canonicalize rootDir: {}", e))?;
    let timeout = Duration::from_secs(input.timeout_seconds.unwrap_or(30).max(1));
    let available = validate_sudo(&root, input.non_interactive, timeout)?;
    let envelope = CommandEnvelope {
        ok: available,
        command: "sudo-validate",
        version: "0.1.0",
        data: SudoValidateData { available },
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
