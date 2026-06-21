use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};

fn host_bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_c420ui-host"))
}

fn temp_root(name: &str) -> PathBuf {
    let path =
        std::env::temp_dir().join(format!("c420ui-clipboard-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&path);
    fs::create_dir_all(&path).unwrap();
    path
}

fn make_fake_command(dir: &Path, name: &str, body: &str) {
    let path = dir.join(name);
    fs::write(&path, format!("#!/bin/sh\n{}\n", body)).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&path, permissions).unwrap();
    }
}

fn run_clipboard(input: serde_json::Value) -> Output {
    let mut child = Command::new(host_bin())
        .args(["clipboard-write", "--json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(input.to_string().as_bytes())
        .unwrap();
    child.wait_with_output().unwrap()
}

#[test]
fn clipboard_write_requires_json_flag() {
    let output = Command::new(host_bin())
        .arg("clipboard-write")
        .output()
        .unwrap();

    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8(output.stderr)
        .unwrap()
        .contains("clipboard-write command requires --json"));
}

#[test]
fn clipboard_write_rejects_invalid_json() {
    let mut child = Command::new(host_bin())
        .args(["clipboard-write", "--json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.as_mut().unwrap().write_all(b"{bad").unwrap();
    let output = child.wait_with_output().unwrap();

    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8(output.stderr)
        .unwrap()
        .contains("Invalid JSON input"));
}

#[test]
fn clipboard_write_rejects_empty_text() {
    let output = run_clipboard(json!({
        "text": "   ",
        "env": {"PATH": ""},
        "preferredBackends": ["x11"]
    }));
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], false);
    assert_eq!(json["backend"], serde_json::Value::Null);
    assert_eq!(json["message"], "No logs to copy.");
}

#[test]
fn clipboard_write_reports_missing_backend_without_leaking_text() {
    let output = run_clipboard(json!({
        "text": "secret log contents",
        "env": {"PATH": ""},
        "preferredBackends": ["x11"]
    }));
    let stdout = String::from_utf8(output.stdout).unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], false);
    assert_eq!(json["command"], "clipboard-write");
    assert_eq!(json["backend"], serde_json::Value::Null);
    assert!(json["message"]
        .as_str()
        .unwrap()
        .contains("No clipboard tool found"));
    assert!(!stdout.contains("secret log contents"));
    assert!(!stderr.contains("secret log contents"));
}

#[test]
fn clipboard_write_uses_fake_wl_copy() {
    let root = temp_root("wl-copy");
    make_fake_command(&root, "wl-copy", "exit 0");
    let output = run_clipboard(json!({
        "text": "copy me",
        "env": {"PATH": root.display().to_string(), "WAYLAND_DISPLAY": "wayland-0"},
        "preferredBackends": ["wayland"]
    }));
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], true);
    assert_eq!(json["backend"], "wl-copy");
}

#[test]
fn clipboard_write_uses_fake_xclip() {
    let root = temp_root("xclip");
    make_fake_command(&root, "xclip", "exit 0");
    let output = run_clipboard(json!({
        "text": "copy me",
        "env": {"PATH": root.display().to_string()},
        "preferredBackends": ["x11"]
    }));
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], true);
    assert_eq!(json["backend"], "xclip");
}

#[test]
fn clipboard_write_uses_fake_xsel() {
    let root = temp_root("xsel");
    make_fake_command(&root, "xclip", "exit 1");
    make_fake_command(&root, "xsel", "exit 0");
    let output = run_clipboard(json!({
        "text": "copy me",
        "env": {"PATH": root.display().to_string()},
        "preferredBackends": ["x11"]
    }));
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], true);
    assert_eq!(json["backend"], "xsel");
}

#[test]
fn clipboard_write_uses_fake_gpaste() {
    let root = temp_root("gpaste");
    make_fake_command(&root, "gpaste-client", "exit 0");
    let output = run_clipboard(json!({
        "text": "copy me",
        "env": {
            "PATH": root.display().to_string(),
            "XDG_CURRENT_DESKTOP": "GNOME"
        },
        "preferredBackends": ["gnome"]
    }));
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], true);
    assert_eq!(json["backend"], "gpaste-client");
}
