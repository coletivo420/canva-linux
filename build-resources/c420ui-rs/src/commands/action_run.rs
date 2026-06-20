use crate::action::contracts::{ActionControllerEvent, ActionRunRequest};
use crate::action::engine::run_action;
use crate::action::events::{emit, ActionEvent};
use crate::exit_codes;
use std::io::BufRead;
use std::sync::mpsc;
use std::thread;

pub fn execute() -> i32 {
    let stdin = std::io::stdin();
    let mut first_line = String::new();
    if let Err(error) = stdin.read_line(&mut first_line) {
        emit(ActionEvent::Error {
            message: format!("Invalid input: {}", error),
        });
        return exit_codes::INVALID_USAGE;
    }
    if first_line.trim().is_empty() {
        emit(ActionEvent::Error {
            message: "Invalid input: expected action-run JSON".to_string(),
        });
        return exit_codes::INVALID_USAGE;
    }
    let request: ActionRunRequest = match serde_json::from_str(&first_line) {
        Ok(input) => input,
        Err(error) => {
            emit(ActionEvent::Error {
                message: format!("Invalid JSON input: {}", error),
            });
            return exit_codes::INVALID_USAGE;
        }
    };

    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || {
        let stdin = std::io::stdin();
        let reader = std::io::BufReader::new(stdin.lock());
        for line in reader.lines().map_while(Result::ok) {
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(event) = serde_json::from_str::<ActionControllerEvent>(&line) {
                let should_stop = matches!(event, ActionControllerEvent::Cancel);
                let _ = sender.send(event);
                if should_stop {
                    break;
                }
            }
        }
    });

    run_action(request, receiver)
}
