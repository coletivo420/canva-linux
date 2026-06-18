use super::events::{progress_from_protocol, TuiRuntimeInputEvent, TuiRuntimeOutputEvent};
use super::input::{spawn_tty_input_thread, TuiInputEvent};
use super::state::TuiRuntimeState;
use super::view::render_to_stderr;
use std::io::{self, BufRead, Write};
use std::sync::mpsc::{self, Receiver};
use std::thread;

enum RuntimeEvent {
    Protocol(Box<TuiRuntimeInputEvent>),
    Input(TuiInputEvent),
    Invalid(String),
    Eof,
}

pub fn run_json_lines(headless_test: bool) -> Result<(), String> {
    let (sender, receiver) = mpsc::channel::<RuntimeEvent>();
    spawn_protocol_thread(sender.clone());

    if !headless_test {
        let input_sender = sender.clone();
        let (tty_sender, tty_receiver) = mpsc::channel::<TuiInputEvent>();
        spawn_tty_input_thread(tty_sender);
        thread::spawn(move || {
            for event in tty_receiver {
                if input_sender.send(RuntimeEvent::Input(event)).is_err() {
                    break;
                }
            }
        });
    }

    run_loop(receiver, headless_test)
}

fn spawn_protocol_thread(sender: mpsc::Sender<RuntimeEvent>) {
    thread::spawn(move || {
        let stdin = io::stdin();
        for line in stdin.lock().lines() {
            match line {
                Ok(line) if line.trim().is_empty() => continue,
                Ok(line) => match serde_json::from_str::<TuiRuntimeInputEvent>(&line) {
                    Ok(event) => {
                        if sender
                            .send(RuntimeEvent::Protocol(Box::new(event)))
                            .is_err()
                        {
                            return;
                        }
                    }
                    Err(error) => {
                        let _ = sender.send(RuntimeEvent::Invalid(format!(
                            "Invalid JSONL input: {}",
                            error
                        )));
                        return;
                    }
                },
                Err(error) => {
                    let _ = sender.send(RuntimeEvent::Invalid(format!(
                        "Failed to read JSONL input: {}",
                        error
                    )));
                    return;
                }
            }
        }
        let _ = sender.send(RuntimeEvent::Eof);
    });
}

fn run_loop(receiver: Receiver<RuntimeEvent>, headless_test: bool) -> Result<(), String> {
    let mut state: Option<TuiRuntimeState> = None;

    while let Ok(event) = receiver.recv() {
        match event {
            RuntimeEvent::Protocol(protocol) => match *protocol {
                TuiRuntimeInputEvent::Init { state: render }
                | TuiRuntimeInputEvent::State { state: render } => {
                    state = Some(TuiRuntimeState::new(render));
                    write_event(&TuiRuntimeOutputEvent::Ready)?;
                    if let Some(state) = &state {
                        render_to_stderr(state).map_err(|e| e.to_string())?;
                    }
                    if headless_test {
                        if let Some(action_id) =
                            state.as_ref().and_then(|state| state.selected_action_id())
                        {
                            write_event(&TuiRuntimeOutputEvent::ActionSelected { action_id })?;
                        }
                        write_event(&TuiRuntimeOutputEvent::Quit)?;
                        return Ok(());
                    }
                    continue;
                }
                TuiRuntimeInputEvent::Progress {
                    state: progress_state,
                    label,
                } => {
                    if let Some(state) = state.as_mut() {
                        state.set_progress(progress_from_protocol(progress_state, label));
                        render_to_stderr(state).map_err(|e| e.to_string())?;
                    }
                    continue;
                }
                protocol => handle_non_state_protocol(protocol, state.as_mut())?,
            },
            RuntimeEvent::Input(input) => {
                if let Some(state) = state.as_mut() {
                    match input {
                        TuiInputEvent::Next => state.select_next(),
                        TuiInputEvent::Previous => state.select_previous(),
                        TuiInputEvent::Select => {
                            if let Some(request) = state.take_pending_root_request() {
                                write_event(&TuiRuntimeOutputEvent::RootRequestResponse {
                                    request_id: request.request_id,
                                    accepted: true,
                                })?;
                            } else if let Some(action_id) = state.selected_action_id() {
                                write_event(&TuiRuntimeOutputEvent::ActionSelected { action_id })?;
                            }
                        }
                        TuiInputEvent::Deny => {
                            if let Some(request) = state.take_pending_root_request() {
                                write_event(&TuiRuntimeOutputEvent::RootRequestResponse {
                                    request_id: request.request_id,
                                    accepted: false,
                                })?;
                            }
                        }
                        TuiInputEvent::Quit => {
                            write_event(&TuiRuntimeOutputEvent::Quit)?;
                            return Ok(());
                        }
                        TuiInputEvent::Cancel => {
                            if let Some(request) = state.take_pending_root_request() {
                                write_event(&TuiRuntimeOutputEvent::RootRequestResponse {
                                    request_id: request.request_id,
                                    accepted: false,
                                })?;
                            } else {
                                write_event(&TuiRuntimeOutputEvent::Cancel)?;
                                return Ok(());
                            }
                        }
                    }
                    render_to_stderr(state).map_err(|e| e.to_string())?;
                }
            }
            RuntimeEvent::Invalid(error) => return Err(error),
            RuntimeEvent::Eof => return Ok(()),
        }
    }

    Ok(())
}

fn handle_non_state_protocol(
    event: TuiRuntimeInputEvent,
    state: Option<&mut TuiRuntimeState>,
) -> Result<(), String> {
    match event {
        TuiRuntimeInputEvent::Log { source, line } => {
            if let Some(state) = state {
                state.render.logs.push(super::contracts::TuiLogLine {
                    source,
                    line,
                    level: None,
                });
                render_to_stderr(state).map_err(|e| e.to_string())?;
            }
        }
        TuiRuntimeInputEvent::ActionStart { action_id } => {
            if let Some(state) = state {
                state.set_status(format!("Running {}", action_id));
                render_to_stderr(state).map_err(|e| e.to_string())?;
            }
        }
        TuiRuntimeInputEvent::ActionFinish {
            action_id,
            status,
            code,
        } => {
            if let Some(state) = state {
                state.set_status(format!("Finished {}: {} ({})", action_id, status, code));
                render_to_stderr(state).map_err(|e| e.to_string())?;
            }
        }
        TuiRuntimeInputEvent::RootRequest {
            request_id,
            action_id,
            reason,
        } => {
            if let Some(state) = state {
                state.set_pending_root_request(request_id, action_id, reason);
                render_to_stderr(state).map_err(|e| e.to_string())?;
            }
        }
        TuiRuntimeInputEvent::Error { message } => {
            if let Some(state) = state {
                state.set_status(format!("Error: {}", message));
                render_to_stderr(state).map_err(|e| e.to_string())?;
            }
        }
        TuiRuntimeInputEvent::Init { .. }
        | TuiRuntimeInputEvent::State { .. }
        | TuiRuntimeInputEvent::Progress { .. } => {}
    }
    Ok(())
}

fn write_event(event: &TuiRuntimeOutputEvent) -> Result<(), String> {
    let mut stdout = io::stdout();
    serde_json::to_writer(&mut stdout, event).map_err(|e| e.to_string())?;
    stdout.write_all(b"\n").map_err(|e| e.to_string())?;
    stdout.flush().map_err(|e| e.to_string())
}
