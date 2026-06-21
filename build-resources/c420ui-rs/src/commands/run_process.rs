use crate::exit_codes;
use crate::host::line_reader::spawn_line_reader;
use crate::host::process::{spawn_process, validate_process_input};
use crate::input::{CancelInput, RunProcessInput};
use serde::Serialize;
use std::io::BufRead;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[derive(Serialize)]
#[serde(tag = "event")]
enum ProcessEvent {
    #[serde(rename = "started")]
    Started { pid: u32 },
    #[serde(rename = "exit")]
    Exit { code: i32 },
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "canceled")]
    Canceled { message: String },
}

fn emit(event: ProcessEvent) {
    match serde_json::to_string(&event) {
        Ok(json) => {
            println!("{}", json);
            let _ = std::io::Write::flush(&mut std::io::stdout());
        }
        Err(error) => {
            let err_json = serde_json::json!({"event":"error","message":format!("Failed to serialize event: {}", error)});
            println!("{}", err_json);
            let _ = std::io::Write::flush(&mut std::io::stdout());
        }
    }
}

fn spawn_cancel_reader() -> mpsc::Receiver<()> {
    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let stdin = std::io::stdin();
        let reader = std::io::BufReader::new(stdin.lock());
        for line in reader.lines() {
            let Ok(line) = line else {
                break;
            };
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(cancel) = serde_json::from_str::<CancelInput>(&line) {
                if cancel.event == "cancel" {
                    let _ = sender.send(());
                    break;
                }
            }
        }
    });
    receiver
}

pub fn execute() -> i32 {
    let stdin = std::io::stdin();
    let mut first_line = String::new();
    if let Err(error) = stdin.read_line(&mut first_line) {
        emit(ProcessEvent::Error {
            message: format!("Invalid input: {}", error),
        });
        return exit_codes::INVALID_USAGE;
    }
    if first_line.trim().is_empty() {
        emit(ProcessEvent::Error {
            message: "Invalid input: expected process configuration JSON".to_string(),
        });
        return exit_codes::INVALID_USAGE;
    }

    let input: RunProcessInput = match serde_json::from_str(&first_line) {
        Ok(input) => input,
        Err(error) => {
            emit(ProcessEvent::Error {
                message: format!("Invalid JSON input: {}", error),
            });
            return exit_codes::INVALID_USAGE;
        }
    };

    if let Err(message) = validate_process_input(&input) {
        emit(ProcessEvent::Error { message });
        return exit_codes::INVALID_USAGE;
    }

    let cancel_receiver = spawn_cancel_reader();
    let mut child = match spawn_process(&input) {
        Ok(child) => child,
        Err(message) => {
            emit(ProcessEvent::Error { message });
            return exit_codes::OPERATIONAL_ERROR;
        }
    };

    emit(ProcessEvent::Started { pid: child.id() });

    let stdout_handle = child
        .stdout
        .take()
        .map(|stdout| spawn_line_reader(stdout, "stdout"));
    let stderr_handle = child
        .stderr
        .take()
        .map(|stderr| spawn_line_reader(stderr, "stderr"));

    loop {
        if cancel_receiver.try_recv().is_ok() {
            let _ = child.kill();
            let _ = child.wait();
            emit(ProcessEvent::Canceled {
                message: "Action canceled.".to_string(),
            });
            return exit_codes::CANCELED;
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                if let Some(handle) = stdout_handle {
                    let _ = handle.join();
                }
                if let Some(handle) = stderr_handle {
                    let _ = handle.join();
                }
                let code = status.code().unwrap_or(exit_codes::OPERATIONAL_ERROR);
                emit(ProcessEvent::Exit { code });
                return code;
            }
            Ok(None) => thread::sleep(Duration::from_millis(10)),
            Err(error) => {
                emit(ProcessEvent::Error {
                    message: format!("Failed to wait for process: {}", error),
                });
                return exit_codes::OPERATIONAL_ERROR;
            }
        }
    }
}
