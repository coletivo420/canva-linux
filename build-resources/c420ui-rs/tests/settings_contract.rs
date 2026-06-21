use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn host_bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_c420ui-host"))
}

fn run(command: &str, input: serde_json::Value) -> serde_json::Value {
    let mut child = Command::new(host_bin())
        .args([command, "--json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{}\n", input).as_bytes())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(output.status.success());
    serde_json::from_slice(&output.stdout).unwrap()
}

#[test]
fn settings_get_applies_defaults_and_settings_set_persists() {
    let path = std::env::temp_dir().join(format!("c420ui-settings-{}.json", std::process::id()));
    let _ = fs::remove_file(&path);
    let defaults = run(
        "settings-get",
        json!({"settingsPath": path.display().to_string()}),
    );
    assert_eq!(defaults["settings"]["generalLogsEnabled"], true);
    assert_eq!(defaults["settings"]["terminalTextSelectionMode"], false);

    let written = run(
        "settings-set",
        json!({
            "settingsPath": path.display().to_string(),
            "settings": {"generalLogsEnabled": false, "terminalTextSelectionMode": true}
        }),
    );
    assert_eq!(written["ok"], true);
    let loaded = run(
        "settings-get",
        json!({"settingsPath": path.display().to_string()}),
    );
    assert_eq!(loaded["settings"]["generalLogsEnabled"], false);
    assert_eq!(loaded["settings"]["terminalTextSelectionMode"], true);
}
