use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;

pub fn sudo_args(non_interactive: bool, command: &str, args: &[String]) -> Vec<String> {
    let mut sudo_args = Vec::new();
    if non_interactive {
        sudo_args.push("-n".to_string());
    }
    sudo_args.push(command.to_string());
    sudo_args.extend(args.iter().cloned());
    sudo_args
}

pub fn run_sudo(
    root_dir: &Path,
    non_interactive: bool,
    command: &str,
    args: &[String],
) -> Result<i32, String> {
    let status = Command::new("sudo")
        .args(sudo_args(non_interactive, command, args))
        .current_dir(root_dir)
        .stdin(Stdio::null())
        .status()
        .map_err(|e| format!("failed to start sudo: {}", e))?;
    Ok(status.code().unwrap_or(1))
}

pub fn validate_sudo(
    root_dir: &Path,
    non_interactive: bool,
    _timeout: Duration,
) -> Result<bool, String> {
    let args = if non_interactive {
        vec!["-n", "-v"]
    } else {
        vec!["-v"]
    };
    let status = Command::new("sudo")
        .args(args)
        .current_dir(root_dir)
        .stdin(Stdio::null())
        .status()
        .map_err(|e| format!("failed to validate sudo: {}", e))?;
    Ok(status.success())
}
