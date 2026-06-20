use crate::host::path_lookup::find_command_in_path;
use std::collections::HashMap;
use std::io::Write;
use std::process::{Command, Stdio};

pub struct ClipboardWriteResult {
    pub ok: bool,
    pub backend: Option<&'static str>,
    pub message: String,
}

const NO_BACKEND_MESSAGE: &str =
    "No clipboard tool found. Install wl-clipboard, KDE qdbus support, GPaste, xclip or xsel.";

pub fn write_clipboard(
    text: &str,
    env: &HashMap<String, String>,
    preferred_backends: &[String],
) -> ClipboardWriteResult {
    if text.trim().is_empty() {
        return ClipboardWriteResult {
            ok: false,
            backend: None,
            message: "No logs to copy.".to_string(),
        };
    }

    let backends = if preferred_backends.is_empty() {
        vec!["wayland", "kde", "gnome", "x11"]
    } else {
        preferred_backends.iter().map(String::as_str).collect()
    };

    for backend in backends {
        match backend {
            "wayland" => {
                if env_contains(env, "WAYLAND_DISPLAY")
                    && command_exists("wl-copy", env)
                    && run_with_stdin("wl-copy", &[], text, env)
                {
                    return ClipboardWriteResult {
                        ok: true,
                        backend: Some("wl-copy"),
                        message: "Logs copied to clipboard via wl-copy.".to_string(),
                    };
                }
            }
            "kde" => {
                if desktop_contains(env, "kde") {
                    for command in ["qdbus6", "qdbus"] {
                        if command_exists(command, env)
                            && run_with_arg(
                                command,
                                &[
                                    "org.kde.klipper".to_string(),
                                    "/klipper".to_string(),
                                    "setClipboardContents".to_string(),
                                    text.to_string(),
                                ],
                                env,
                            )
                        {
                            return ClipboardWriteResult {
                                ok: true,
                                backend: Some(command),
                                message: format!(
                                    "Logs copied to clipboard via KDE Klipper ({}).",
                                    command
                                ),
                            };
                        }
                    }
                }
            }
            "gnome" => {
                if desktop_contains(env, "gnome") {
                    for command in ["gpaste-client", "gpaste"] {
                        if command_exists(command, env)
                            && run_with_stdin(command, &["add"], text, env)
                        {
                            return ClipboardWriteResult {
                                ok: true,
                                backend: Some(command),
                                message: "Logs copied to clipboard via GPaste.".to_string(),
                            };
                        }
                    }
                }
            }
            "x11" => {
                if command_exists("xclip", env)
                    && run_with_stdin("xclip", &["-selection", "clipboard"], text, env)
                {
                    return ClipboardWriteResult {
                        ok: true,
                        backend: Some("xclip"),
                        message: "Logs copied to clipboard via xclip.".to_string(),
                    };
                }
                if command_exists("xsel", env)
                    && run_with_stdin("xsel", &["--clipboard", "--input"], text, env)
                {
                    return ClipboardWriteResult {
                        ok: true,
                        backend: Some("xsel"),
                        message: "Logs copied to clipboard via xsel.".to_string(),
                    };
                }
            }
            _ => {}
        }
    }

    ClipboardWriteResult {
        ok: false,
        backend: None,
        message: NO_BACKEND_MESSAGE.to_string(),
    }
}

pub fn command_exists(command: &str, env: &HashMap<String, String>) -> bool {
    path_env(env)
        .and_then(|path| find_command_in_path(command, &path))
        .is_some()
}

pub fn run_with_stdin(
    command: &str,
    args: &[&str],
    input: &str,
    env: &HashMap<String, String>,
) -> bool {
    let Some(command_path) = path_env(env).and_then(|path| find_command_in_path(command, &path))
    else {
        return false;
    };
    let mut child = match Command::new(command_path)
        .args(args)
        .envs(env.iter())
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(_) => return false,
    };
    if let Some(stdin) = child.stdin.as_mut() {
        if stdin.write_all(input.as_bytes()).is_err() {
            let _ = child.kill();
            let _ = child.wait();
            return false;
        }
    }
    match child.wait() {
        Ok(status) => status.success(),
        Err(_) => false,
    }
}

pub fn run_with_arg(command: &str, args: &[String], env: &HashMap<String, String>) -> bool {
    let Some(command_path) = path_env(env).and_then(|path| find_command_in_path(command, &path))
    else {
        return false;
    };
    Command::new(command_path)
        .args(args)
        .envs(env.iter())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn path_env(env: &HashMap<String, String>) -> Option<String> {
    env.get("PATH")
        .cloned()
        .or_else(|| std::env::var("PATH").ok())
}

fn env_contains(env: &HashMap<String, String>, key: &str) -> bool {
    env.get(key)
        .map(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            std::env::var(key)
                .map(|value| !value.trim().is_empty())
                .unwrap_or(false)
        })
}

fn desktop_contains(env: &HashMap<String, String>, needle: &str) -> bool {
    env.get("XDG_CURRENT_DESKTOP")
        .cloned()
        .or_else(|| std::env::var("XDG_CURRENT_DESKTOP").ok())
        .map(|desktop| desktop.to_lowercase().contains(needle))
        .unwrap_or(false)
}
