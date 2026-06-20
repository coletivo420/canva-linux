use crossterm::event::{self, Event, KeyCode, KeyModifiers};
use std::sync::mpsc::Sender;
use std::thread;
use std::time::Duration;

#[derive(Debug)]
pub enum TuiInputEvent {
    Char(char),
    Backspace,
    Next,
    Previous,
    PageUp,
    PageDown,
    Home,
    End,
    ScrollContentUp,
    ScrollContentDown,
    FocusNext,
    FocusPrevious,
    Select,
    Toggle,
    CopyLogs,
    Help,
    Quit,
    Cancel,
}

pub fn spawn_tty_input_thread(sender: Sender<TuiInputEvent>) {
    thread::spawn(move || loop {
        if event::poll(Duration::from_millis(100)).unwrap_or(false) {
            if let Ok(Event::Key(key)) = event::read() {
                let event = match key.code {
                    KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                        Some(TuiInputEvent::Cancel)
                    }
                    KeyCode::Char('?') => Some(TuiInputEvent::Help),
                    KeyCode::Char(' ') => Some(TuiInputEvent::Toggle),
                    KeyCode::Char(c) => Some(TuiInputEvent::Char(c)),
                    KeyCode::Backspace => Some(TuiInputEvent::Backspace),
                    KeyCode::Down if key.modifiers.contains(KeyModifiers::ALT) => {
                        Some(TuiInputEvent::ScrollContentDown)
                    }
                    KeyCode::Up if key.modifiers.contains(KeyModifiers::ALT) => {
                        Some(TuiInputEvent::ScrollContentUp)
                    }
                    KeyCode::Down => Some(TuiInputEvent::Next),
                    KeyCode::Up => Some(TuiInputEvent::Previous),
                    KeyCode::PageUp if key.modifiers.contains(KeyModifiers::SHIFT) => {
                        Some(TuiInputEvent::ScrollContentUp)
                    }
                    KeyCode::PageDown if key.modifiers.contains(KeyModifiers::SHIFT) => {
                        Some(TuiInputEvent::ScrollContentDown)
                    }
                    KeyCode::PageUp => Some(TuiInputEvent::PageUp),
                    KeyCode::PageDown => Some(TuiInputEvent::PageDown),
                    KeyCode::Home => Some(TuiInputEvent::Home),
                    KeyCode::End => Some(TuiInputEvent::End),
                    KeyCode::F(5) => Some(TuiInputEvent::CopyLogs),
                    KeyCode::Tab => {
                        if key.modifiers.contains(KeyModifiers::SHIFT) {
                            Some(TuiInputEvent::FocusPrevious)
                        } else {
                            Some(TuiInputEvent::FocusNext)
                        }
                    }
                    KeyCode::Enter => Some(TuiInputEvent::Select),
                    KeyCode::Esc => Some(TuiInputEvent::Cancel),
                    _ => None,
                };
                if let Some(event) = event {
                    if sender.send(event).is_err() {
                        break;
                    }
                }
            }
        }
    });
}
