use serde_json::json;
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
fn session_log_uses_tmp_namespace_and_round_trips() {
    let _ = run("session-log-clear", json!({}));
    let written = run(
        "session-log-write",
        json!({"text":"hello\n", "append": false}),
    );
    assert_eq!(written["ok"], true);
    assert_eq!(written["path"], "/tmp/c420ui/tool-session.log");
    let read = run("session-log-read", json!({}));
    assert_eq!(read["text"], "hello\n");
}
