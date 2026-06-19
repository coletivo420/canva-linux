use super::events::{progress_from_protocol, TuiRuntimeInputEvent, TuiRuntimeOutputEvent};
use super::input::{spawn_tty_input_thread, TuiInputEvent};
use super::renderer;
use super::state::TuiRuntimeState;
use crossterm::{
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::backend::CrosstermBackend;
use ratatui::Terminal;
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
        enable_raw_mode().map_err(|e| e.to_string())?;
        let mut stdout = io::stderr();
        execute!(stdout, EnterAlternateScreen).map_err(|e| e.to_string())?;

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

    let backend = CrosstermBackend::new(io::stderr());
    let mut terminal = Terminal::new(backend).map_err(|e| e.to_string())?;

    let result = run_loop(&mut terminal, receiver, headless_test);

    if !headless_test {
        disable_raw_mode().map_err(|e| e.to_string())?;
        execute!(io::stderr(), LeaveAlternateScreen).map_err(|e| e.to_string())?;
        terminal.show_cursor().map_err(|e| e.to_string())?;
    }

    result
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

fn run_loop<B: ratatui::backend::Backend>(
    terminal: &mut Terminal<B>,
    receiver: Receiver<RuntimeEvent>,
    headless_test: bool,
) -> Result<(), String> {
    let mut state: Option<TuiRuntimeState> = None;

    while let Ok(event) = receiver.recv() {
        match event {
            RuntimeEvent::Protocol(protocol) => match *protocol {
                TuiRuntimeInputEvent::Init { state: render }
                | TuiRuntimeInputEvent::State { state: render } => {
                    state = Some(TuiRuntimeState::new(render));
                    write_event(&TuiRuntimeOutputEvent::Ready)?;
                    if let Some(state) = &state {
                        if !headless_test {
                            renderer::render(terminal, state).map_err(|e| e.to_string())?;
                        }
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
                }
                TuiRuntimeInputEvent::Progress {
                    state: progress_state,
                    label,
                    percent,
                } => {
                    if let Some(state) = state.as_mut() {
                        state.set_progress(progress_from_protocol(progress_state, label, percent));
                        if !headless_test {
                            renderer::render(terminal, state).map_err(|e| e.to_string())?;
                        }
                    }
                }
                protocol => {
                    handle_non_state_protocol(protocol, state.as_mut())?;
                    if let Some(state) = &state {
                        if !headless_test {
                            renderer::render(terminal, state).map_err(|e| e.to_string())?;
                        }
                    }
                }
            },
            RuntimeEvent::Input(input) => {
                if let Some(state) = state.as_mut() {
                    if state.render.modal.is_some() {
                        match input {
                            TuiInputEvent::Char(c) => state.push_char(c),
                            TuiInputEvent::Backspace => state.pop_char(),
                            TuiInputEvent::Select => {
                                if let Some(request) = state.take_pending_root_request() {
                                    let typed_input = if state.modal_input.is_empty() {
                                        None
                                    } else {
                                        Some(state.modal_input.clone())
                                    };
                                    state.modal_input.clear();
                                    write_event(&TuiRuntimeOutputEvent::RootRequestResponse {
                                        request_id: request.request_id,
                                        accepted: true,
                                        input: typed_input,
                                    })?;
                                }
                            }
                            TuiInputEvent::Cancel => {
                                if let Some(request) = state.take_pending_root_request() {
                                    state.modal_input.clear();
                                    write_event(&TuiRuntimeOutputEvent::RootRequestResponse {
                                        request_id: request.request_id,
                                        accepted: false,
                                        input: None,
                                    })?;
                                }
                            }
                            _ => {}
                        }
                    } else {
                        match input {
                            TuiInputEvent::Next => state.select_next(),
                            TuiInputEvent::Previous => state.select_previous(),
                            TuiInputEvent::FocusNext => state.next_focus(),
                            TuiInputEvent::FocusPrevious => state.previous_focus(),
                            TuiInputEvent::Char('j') => state.select_next(),
                            TuiInputEvent::Char('k') => state.select_previous(),
                            TuiInputEvent::Char('q') => {
                                write_event(&TuiRuntimeOutputEvent::Quit)?;
                                return Ok(());
                            }
                            TuiInputEvent::Select | TuiInputEvent::Char('y') => {
                                let old_view = state.render.view.clone();
                                if let Some(action_id) = state.enter_selected() {
                                    write_event(&TuiRuntimeOutputEvent::ActionSelected {
                                        action_id,
                                    })?;
                                } else if state.render.view != old_view {
                                    write_event(&TuiRuntimeOutputEvent::ViewChanged {
                                        view: state.render.view.clone(),
                                    })?;
                                }
                            }
                            TuiInputEvent::Backspace
                            | TuiInputEvent::Cancel
                            | TuiInputEvent::Char('n') => {
                                if state.render.view != crate::tui::contracts::TuiView::Main {
                                    state.go_back();
                                } else {
                                    write_event(&TuiRuntimeOutputEvent::Cancel)?;
                                    return Ok(());
                                }
                            }
                            _ => {}
                        }
                    }
                    if !headless_test {
                        renderer::render(terminal, state).map_err(|e| e.to_string())?;
                    }
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
                state
                    .render
                    .panels
                    .logs
                    .lines
                    .push(super::contracts::TuiLogLine {
                        source,
                        line,
                        level: None,
                    });
            }
        }
        TuiRuntimeInputEvent::ActionStart { action_id } => {
            if let Some(state) = state {
                state.set_status(format!("Running {}", action_id));
            }
        }
        TuiRuntimeInputEvent::ActionFinish {
            action_id,
            status,
            code,
        } => {
            if let Some(state) = state {
                state.set_status(format!("Finished {}: {} ({})", action_id, status, code));
            }
        }
        TuiRuntimeInputEvent::RootRequest {
            request_id,
            action_id,
            reason,
        } => {
            if let Some(state) = state {
                state.set_pending_root_request(request_id, action_id, reason);
            }
        }
        TuiRuntimeInputEvent::Error { message } => {
            if let Some(state) = state {
                state.set_status(format!("Error: {}", message));
            }
        }
        _ => {}
    }
    Ok(())
}

fn write_event(event: &TuiRuntimeOutputEvent) -> Result<(), String> {
    let mut stdout = io::stdout();
    serde_json::to_writer(&mut stdout, event).map_err(|e| e.to_string())?;
    stdout.write_all(b"\n").map_err(|e| e.to_string())?;
    stdout.flush().map_err(|e| e.to_string())
}
