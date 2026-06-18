use std::io::Write;
use std::process::{Command, Stdio};

fn run_tui_json(command: &str, input: &str) -> std::process::Output {
    let bin = env!("CARGO_BIN_EXE_c420ui-tui");
    let mut child = Command::new(bin)
        .arg(command)
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn tui binary");

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write stdin");
    }

    child.wait_with_output().expect("failed to read output")
}

fn render_input(actions: &str, hash: &str) -> String {
    format!(
        r#"{{
  "brand": {{ "name": "c420ui", "version": "0.1.0", "hash": "{hash}" }},
  "project": {{ "name": "Example", "subtitle": "Workspace", "version": "1.0.0", "phase": "dev" }},
  "actions": {actions},
  "logs": [{{ "source": "stdout", "line": "ready" }}],
  "progress": {{ "state": "running", "label": "Rendering", "percent": 50 }}
}}"#
    )
}

#[test]
fn tui_version_prints_binary_name() {
    let bin = env!("CARGO_BIN_EXE_c420ui-tui");
    let output = Command::new(bin)
        .arg("--version")
        .output()
        .expect("failed to execute tui binary");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert_eq!(stdout.trim(), "c420ui-tui 0.1.0");
}

#[test]
fn tui_doctor_json_is_valid() {
    let bin = env!("CARGO_BIN_EXE_c420ui-tui");
    let output = Command::new(bin)
        .arg("doctor")
        .arg("--json")
        .output()
        .expect("failed to execute tui binary");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not JSON");
    assert_eq!(json["ok"], true);
    assert_eq!(json["command"], "doctor");
    assert_eq!(json["binary"], "c420ui-tui");
    assert_eq!(json["checks"][0]["id"], "tui-contracts");
}

#[test]
fn tui_render_json_returns_screen_lines() {
    let output = run_tui_json(
        "render",
        &render_input(
            r#"[
              { "id": "build", "label": "Build", "group": "package" },
              { "id": "run", "label": "Run", "group": "development" },
              { "id": "clean", "label": "Clean", "group": "maintenance", "dangerous": true }
            ]"#,
            "sha256:abcdef123456",
        ),
    );

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not JSON");
    assert_eq!(json["ok"], true);
    assert_eq!(json["command"], "render");
    assert_eq!(json["screen"]["title"], "c420ui");
    assert_eq!(json["screen"]["lines"][0], "c420ui 0.1.0");
    assert_eq!(json["screen"]["lines"][1], "Project: Example");
    assert_eq!(json["screen"]["lines"][2], "Actions: 3");
}

#[test]
fn tui_render_rejects_invalid_json() {
    let output = run_tui_json("render", "{invalid");
    assert!(!output.status.success());
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn tui_render_accepts_empty_actions() {
    let output = run_tui_json("render", &render_input("[]", ""));
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not JSON");
    assert_eq!(json["screen"]["lines"][2], "Actions: 0");
}

#[test]
fn tui_render_shortens_hash_when_provided() {
    let output = run_tui_json("render", &render_input("[]", "sha256:1234567890abcdef"));
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not JSON");
    let lines = json["screen"]["lines"].as_array().unwrap();
    assert!(lines.iter().any(|line| line == "Brand hash: 12345678"));
}

#[test]
fn tui_render_uses_generic_project_identity() {
    let output = run_tui_json("render", &render_input("[]", ""));
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(stdout.contains("Example"));
}
