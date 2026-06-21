use serde::Serialize;
use std::io::{BufRead, BufReader, Read};
use std::thread;

#[derive(Serialize)]
struct LineEvent<'a> {
    event: &'a str,
    line: String,
}

pub fn spawn_line_reader<R>(reader: R, event: &'static str) -> thread::JoinHandle<()>
where
    R: Read + Send + 'static,
{
    thread::spawn(move || {
        let mut reader = BufReader::new(reader);
        let mut line = String::new();
        loop {
            line.clear();
            let bytes = match reader.read_line(&mut line) {
                Ok(bytes) => bytes,
                Err(_) => break,
            };
            if bytes == 0 {
                break;
            }
            let trimmed = line.trim_end_matches(['\r', '\n']).to_string();
            let payload = LineEvent {
                event,
                line: trimmed,
            };
            if let Ok(json) = serde_json::to_string(&payload) {
                println!("{}", json);
                let _ = std::io::Write::flush(&mut std::io::stdout());
            }
        }
    })
}
