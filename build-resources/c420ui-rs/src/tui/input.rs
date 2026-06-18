use std::fs::File;
use std::io::Read;
use std::sync::mpsc::Sender;
use std::thread;

#[derive(Debug)]
pub enum TuiInputEvent {
    Next,
    Previous,
    Select,
    Deny,
    Quit,
    Cancel,
}

pub fn spawn_tty_input_thread(sender: Sender<TuiInputEvent>) {
    thread::spawn(move || {
        let Ok(mut input) = File::open("/dev/tty") else {
            return;
        };
        let mut buffer = [0_u8; 1];
        loop {
            if input.read_exact(&mut buffer).is_err() {
                break;
            }
            let event = match buffer[0] {
                b'j' => Some(TuiInputEvent::Next),
                b'k' => Some(TuiInputEvent::Previous),
                b'y' => Some(TuiInputEvent::Select),
                b'n' => Some(TuiInputEvent::Deny),
                b'\n' | b'\r' => Some(TuiInputEvent::Select),
                b'q' => Some(TuiInputEvent::Quit),
                b'c' | 3 | 27 => Some(TuiInputEvent::Cancel),
                _ => None,
            };
            if let Some(event) = event {
                if sender.send(event).is_err() {
                    break;
                }
            }
        }
    });
}
