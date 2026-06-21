use crate::session_log::contracts::{SessionLogRequest, SessionLogResponse};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

pub fn read_session_log() -> Result<SessionLogResponse, String> {
    let path = session_log_path()?;
    let text = fs::read_to_string(&path).unwrap_or_default();
    Ok(response("session-log-read", path, Some(text)))
}

pub fn write_session_log(request: SessionLogRequest) -> Result<SessionLogResponse, String> {
    let path = session_log_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create session log directory: {}", error))?;
    }
    let text = request.text.unwrap_or_default();
    if request.append {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .map_err(|error| format!("Failed to open session log {}: {}", path.display(), error))?;
        file.write_all(text.as_bytes())
            .map_err(|error| format!("Failed to append session log: {}", error))?;
    } else {
        fs::write(&path, &text).map_err(|error| {
            format!("Failed to write session log {}: {}", path.display(), error)
        })?;
    }
    Ok(response("session-log-write", path, None))
}

pub fn clear_session_log() -> Result<SessionLogResponse, String> {
    let path = session_log_path()?;
    fs::remove_file(&path).ok();
    Ok(response("session-log-clear", path, None))
}

pub fn session_log_path() -> Result<PathBuf, String> {
    let primary = PathBuf::from("/tmp")
        .join("c420ui")
        .join("tool-session.log");
    if let Some(parent) = primary.parent() {
        if fs::create_dir_all(parent).is_ok() {
            return Ok(primary);
        }
    }
    let home = std::env::var("HOME")
        .map_err(|_| "HOME is required for session log fallback".to_string())?;
    Ok(PathBuf::from(home)
        .join(".tmp")
        .join("c420ui")
        .join("tool-session.log"))
}

fn response(command: &'static str, path: PathBuf, text: Option<String>) -> SessionLogResponse {
    SessionLogResponse {
        ok: true,
        command,
        path: path.to_string_lossy().to_string(),
        text,
        diagnostics: vec![],
    }
}
