use crate::host::env::process_env;
use crate::input::RunProcessInput;
use std::path::Path;
use std::process::{Child, Command, Stdio};

pub fn validate_process_input(input: &RunProcessInput) -> Result<(), String> {
    if input.command.trim().is_empty() {
        return Err("command must not be empty".to_string());
    }
    if input.command.contains([' ', '\t', '\n', '\r']) {
        return Err(
            "command must be an executable name or path, not a shell command string".to_string(),
        );
    }
    if input.cwd.trim().is_empty() {
        return Err("cwd must not be empty".to_string());
    }
    if !Path::new(&input.cwd).is_dir() {
        return Err(format!(
            "cwd does not exist or is not a directory: {}",
            input.cwd
        ));
    }
    Ok(())
}

pub fn spawn_process(input: &RunProcessInput) -> Result<Child, String> {
    let mut command = Command::new(&input.command);
    command
        .args(&input.args)
        .current_dir(&input.cwd)
        .env_clear()
        .envs(process_env(&input.env))
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    command
        .spawn()
        .map_err(|error| format!("Failed to start process: {}", error))
}
