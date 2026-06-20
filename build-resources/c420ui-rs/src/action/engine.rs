use crate::action::contracts::{ActionControllerEvent, ActionDefinition, ActionRunRequest};
use crate::action::events::{data, emit, emit_finish, emit_log, merge_env, ActionEvent};
use crate::action::registry::ActionRegistry;
use crate::exit_codes;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

enum ChildOutput {
    Stdout(String),
    Stderr(String),
}

pub fn run_action(request: ActionRunRequest, input: mpsc::Receiver<ActionControllerEvent>) -> i32 {
    let registry = match ActionRegistry::new(request.actions.clone()) {
        Ok(registry) => registry,
        Err(message) => {
            emit(ActionEvent::Error { message });
            return exit_codes::INVALID_USAGE;
        }
    };

    let action = request
        .cli_flag
        .as_deref()
        .and_then(|flag| registry.resolve_by_cli_flag(flag))
        .or_else(|| registry.resolve_by_id(&request.action_id));
    let Some(action) = action else {
        emit(ActionEvent::Error {
            message: format!("Unknown action: {}", request.action_id),
        });
        emit_finish(
            &request.action_id,
            "failed",
            exit_codes::ACTION_INVALID_USAGE,
        );
        return exit_codes::ACTION_INVALID_USAGE;
    };

    run_resolved_action(action, &request, input)
}

fn run_resolved_action(
    action: &ActionDefinition,
    request: &ActionRunRequest,
    input: mpsc::Receiver<ActionControllerEvent>,
) -> i32 {
    emit(ActionEvent::ActionStart {
        action_id: &action.id,
        message: &action.label,
        data: data(request.dry_run),
    });

    if request.dry_run {
        emit_finish(&action.id, "success", exit_codes::SUCCESS);
        return exit_codes::SUCCESS;
    }

    if action.planned {
        emit(ActionEvent::Log {
            source: "system",
            line: action
                .description
                .clone()
                .unwrap_or_else(|| "Action is planned and not executable yet.".to_string()),
            level: Some("warning"),
        });
        emit_finish(&action.id, "planned", exit_codes::PLANNED_ACTION);
        return exit_codes::PLANNED_ACTION;
    }

    if (action.dangerous || action.requires_confirmation) && !request.yes {
        emit(ActionEvent::Error {
            message: format!("Action requires confirmation: {}", action.label),
        });
        emit_finish(&action.id, "failed", exit_codes::OPERATIONAL_ERROR);
        return exit_codes::OPERATIONAL_ERROR;
    }

    let mut env = merge_env(&request.env, &action.env);
    if action.requires_root
        || request
            .root_policy
            .as_ref()
            .map(|policy| policy.requires_root)
            .unwrap_or(false)
    {
        let reason = request
            .root_policy
            .as_ref()
            .and_then(|policy| policy.reason.as_deref())
            .unwrap_or("Action requires root access.");
        let request_id = format!("root-{}-{}", action.id, std::process::id());
        emit(ActionEvent::RootRequest {
            request_id: &request_id,
            action_id: &action.id,
            reason,
        });
        match wait_for_root_response(&input, &request_id) {
            RootDecision::Accepted(root_env) => {
                if let Some(policy) = &request.root_policy {
                    env.extend(policy.action_env.clone());
                }
                env.extend(root_env);
            }
            RootDecision::Canceled => {
                emit_finish(&action.id, "canceled", exit_codes::CANCELED);
                return exit_codes::CANCELED;
            }
        }
    }

    let Some(command) = action.command.as_deref() else {
        emit(ActionEvent::Error {
            message: "Action requires project adapter execution and must be migrated to declarative command before Rust execution.".to_string(),
        });
        emit_finish(&action.id, "failed", exit_codes::ACTION_INVALID_USAGE);
        return exit_codes::ACTION_INVALID_USAGE;
    };

    run_command_action(action, command, &env, &request.root_dir, input)
}

enum RootDecision {
    Accepted(HashMap<String, String>),
    Canceled,
}

fn wait_for_root_response(
    input: &mpsc::Receiver<ActionControllerEvent>,
    request_id: &str,
) -> RootDecision {
    loop {
        match input.recv() {
            Ok(ActionControllerEvent::RootResponse {
                request_id: candidate,
                accepted,
                env,
            }) if candidate == request_id => {
                return if accepted {
                    RootDecision::Accepted(env)
                } else {
                    RootDecision::Canceled
                };
            }
            Ok(ActionControllerEvent::Cancel) | Err(_) => return RootDecision::Canceled,
            _ => {}
        }
    }
}

fn run_command_action(
    action: &ActionDefinition,
    command: &str,
    env: &HashMap<String, String>,
    root_dir: &str,
    input: mpsc::Receiver<ActionControllerEvent>,
) -> i32 {
    let root = Path::new(root_dir);
    let mut child = match Command::new(command)
        .args(&action.args)
        .current_dir(root)
        .envs(env.iter())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            emit(ActionEvent::Error {
                message: format!("Failed to start {}: {}", action.label, error),
            });
            emit_finish(&action.id, "failed", exit_codes::OPERATIONAL_ERROR);
            return exit_codes::OPERATIONAL_ERROR;
        }
    };

    emit(ActionEvent::Progress {
        state: "running",
        label: Some(&action.label),
        percent: None,
    });

    let (sender, output) = mpsc::channel();
    if let Some(stdout) = child.stdout.take() {
        spawn_line_forwarder(stdout, sender.clone(), false);
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_line_forwarder(stderr, sender, true);
    }

    loop {
        while let Ok(event) = output.try_recv() {
            match event {
                ChildOutput::Stdout(line) => emit_log("stdout", line, None),
                ChildOutput::Stderr(line) => emit_log("stderr", line, Some("error")),
            }
        }

        if matches!(input.try_recv(), Ok(ActionControllerEvent::Cancel)) {
            let _ = child.kill();
            let _ = child.wait();
            emit(ActionEvent::Progress {
                state: "canceled",
                label: Some(&action.label),
                percent: Some(0),
            });
            emit_finish(&action.id, "canceled", exit_codes::CANCELED);
            return exit_codes::CANCELED;
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                while let Ok(event) = output.try_recv() {
                    match event {
                        ChildOutput::Stdout(line) => emit_log("stdout", line, None),
                        ChildOutput::Stderr(line) => emit_log("stderr", line, Some("error")),
                    }
                }
                let code = status.code().unwrap_or(exit_codes::OPERATIONAL_ERROR);
                if code == 0 {
                    emit(ActionEvent::Progress {
                        state: "success",
                        label: Some(&action.label),
                        percent: Some(100),
                    });
                    emit_finish(&action.id, "success", code);
                } else {
                    emit(ActionEvent::Progress {
                        state: "failed",
                        label: Some(&action.label),
                        percent: None,
                    });
                    emit_finish(&action.id, "failed", code);
                }
                return code;
            }
            Ok(None) => thread::sleep(Duration::from_millis(10)),
            Err(error) => {
                emit(ActionEvent::Error {
                    message: format!("Failed to wait for {}: {}", action.label, error),
                });
                emit_finish(&action.id, "failed", exit_codes::OPERATIONAL_ERROR);
                return exit_codes::OPERATIONAL_ERROR;
            }
        }
    }
}

fn spawn_line_forwarder<R: Read + Send + 'static>(
    reader: R,
    sender: mpsc::Sender<ChildOutput>,
    stderr: bool,
) {
    thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines().map_while(Result::ok) {
            let event = if stderr {
                ChildOutput::Stderr(line)
            } else {
                ChildOutput::Stdout(line)
            };
            let _ = sender.send(event);
        }
    });
}
