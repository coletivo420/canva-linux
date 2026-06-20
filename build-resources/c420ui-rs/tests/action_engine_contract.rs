use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;

fn host_bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_c420ui-host"))
}

fn temp_root(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("c420ui-action-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&path);
    fs::create_dir_all(&path).unwrap();
    path
}

fn make_fake_command(dir: &Path, name: &str, body: &str) -> PathBuf {
    let path = dir.join(name);
    fs::write(&path, format!("#!/bin/sh\n{}\n", body)).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&path, permissions).unwrap();
    }
    path
}

fn run_action(input: serde_json::Value) -> (std::process::ExitStatus, Vec<serde_json::Value>) {
    let mut child = Command::new(host_bin())
        .args(["action-run", "--json-lines"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{}\n", input).as_bytes())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    let stdout = String::from_utf8(output.stdout).unwrap();
    let events = stdout
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| serde_json::from_str::<serde_json::Value>(line).unwrap())
        .collect();
    (output.status, events)
}

fn action_request(action: serde_json::Value) -> serde_json::Value {
    json!({
        "rootDir": temp_root("root").display().to_string(),
        "actionId": action["id"].as_str().unwrap(),
        "dryRun": false,
        "yes": true,
        "env": {},
        "actions": [action]
    })
}

fn write_project_actions(root: &Path, actions: serde_json::Value) {
    let config = root.join("config");
    fs::create_dir_all(&config).unwrap();
    fs::write(config.join("actions.json"), actions.to_string()).unwrap();
    fs::write(
        config.join("host-dependencies.json"),
        json!({"commands": []}).to_string(),
    )
    .unwrap();
    fs::write(config.join("dependencies.json"), json!({}).to_string()).unwrap();
    fs::write(
        config.join("install-native.json"),
        json!({"executable": "example", "desktopName": "example.desktop"}).to_string(),
    )
    .unwrap();
    fs::write(config.join("maintenance.json"), json!({}).to_string()).unwrap();
    fs::write(
        config.join("project-ui.json"),
        json!({
            "projectName": "Example",
            "projectSubtitle": "Workspace",
            "c420uiTitle": "Example",
            "logoLines": []
        })
        .to_string(),
    )
    .unwrap();
}

#[test]
fn action_run_requires_json_lines() {
    let output = Command::new(host_bin()).arg("action-run").output().unwrap();
    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8(output.stderr)
        .unwrap()
        .contains("action-run command requires --json-lines"));
}

#[test]
fn action_run_rejects_invalid_json_as_event() {
    let mut child = Command::new(host_bin())
        .args(["action-run", "--json-lines"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.as_mut().unwrap().write_all(b"{bad\n").unwrap();
    let output = child.wait_with_output().unwrap();
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(!output.status.success());
    assert!(stdout.contains("\"event\":\"error\""));
}

#[test]
fn action_run_unknown_action_finishes_failed() {
    let (status, events) = run_action(json!({
        "rootDir": temp_root("unknown").display().to_string(),
        "actionId": "missing",
        "actions": [],
        "env": {}
    }));

    assert_eq!(status.code(), Some(64));
    assert!(events.iter().any(|event| event["event"] == "error"));
    assert!(events
        .iter()
        .any(|event| event["event"] == "action:finish" && event["status"] == "failed"));
}

#[test]
fn action_run_loads_action_from_project_config_root() {
    let root = temp_root("project-config-action");
    let marker = root.join("marker");
    write_project_actions(
        &root,
        json!([{
            "id": "doctor",
            "label": "Doctor",
            "kind": "command",
            "command": "/bin/sh",
            "args": ["-c", format!("touch {}", marker.display())]
        }]),
    );

    let (status, events) = run_action(json!({
        "rootDir": root.display().to_string(),
        "projectConfigRoot": "config",
        "actionId": "doctor",
        "yes": true,
        "env": {}
    }));

    assert!(status.success());
    assert!(marker.exists());
    assert!(events
        .iter()
        .any(|event| event["event"] == "action:finish" && event["status"] == "success"));
}

#[test]
fn action_run_rejects_unknown_action_from_project_config_root() {
    let root = temp_root("project-config-missing");
    write_project_actions(
        &root,
        json!([{"id": "doctor", "label": "Doctor", "kind": "command", "command": "/bin/true"}]),
    );

    let (status, events) = run_action(json!({
        "rootDir": root.display().to_string(),
        "projectConfigRoot": "config",
        "actionId": "missing",
        "yes": true,
        "env": {}
    }));

    assert_eq!(status.code(), Some(64));
    assert!(events.iter().any(|event| event["event"] == "error"));
}

#[test]
fn action_run_dry_run_does_not_execute_command() {
    let root = temp_root("dry-run");
    let marker = root.join("marker");
    let action = json!({
        "id": "doctor",
        "label": "Doctor",
        "command": "/bin/sh",
        "args": ["-c", format!("touch {}", marker.display())]
    });
    let (status, events) = run_action(json!({
        "rootDir": root.display().to_string(),
        "actionId": "doctor",
        "dryRun": true,
        "yes": true,
        "env": {},
        "actions": [action]
    }));

    assert!(status.success());
    assert!(!marker.exists());
    assert!(events.iter().any(|event| event["event"] == "action:start"));
    assert!(events
        .iter()
        .any(|event| event["event"] == "action:finish" && event["status"] == "success"));
}

#[test]
fn action_run_planned_does_not_execute_command() {
    let root = temp_root("planned");
    let marker = root.join("marker");
    let action = json!({
        "id": "bundle",
        "label": "Bundle",
        "planned": true,
        "description": "Planned",
        "command": "/bin/sh",
        "args": ["-c", format!("touch {}", marker.display())]
    });
    let (status, events) = run_action(action_request(action));

    assert_eq!(status.code(), Some(78));
    assert!(!marker.exists());
    assert!(events
        .iter()
        .any(|event| event["event"] == "action:finish" && event["status"] == "planned"));
}

#[test]
fn action_run_dangerous_requires_yes() {
    let action = json!({
        "id": "danger",
        "label": "Danger",
        "dangerous": true,
        "command": "/bin/true"
    });
    let (status, events) = run_action(json!({
        "rootDir": temp_root("danger").display().to_string(),
        "actionId": "danger",
        "yes": false,
        "env": {},
        "actions": [action]
    }));

    assert_eq!(status.code(), Some(1));
    assert!(events
        .iter()
        .any(|event| event["event"] == "action:finish" && event["status"] == "failed"));
}

#[test]
fn action_run_command_emits_logs_and_success() {
    let root = temp_root("command");
    let command = make_fake_command(
        &root,
        "fake-action",
        "printf 'hello\\n'; printf 'warn\\n' >&2",
    );
    let action = json!({
        "id": "doctor",
        "label": "Doctor",
        "command": command.display().to_string()
    });
    let (status, events) = run_action(action_request(action));

    assert!(status.success());
    assert!(events.iter().any(|event| event["event"] == "log"
        && event["source"] == "stdout"
        && event["line"] == "hello"));
    assert!(events.iter().any(|event| event["event"] == "log"
        && event["source"] == "stderr"
        && event["level"] == "error"));
    assert!(events
        .iter()
        .any(|event| event["event"] == "action:finish" && event["status"] == "success"));
}

#[test]
fn action_run_nonzero_exit_fails() {
    let action = json!({
        "id": "fail",
        "label": "Fail",
        "command": "/bin/sh",
        "args": ["-c", "exit 7"]
    });
    let (status, events) = run_action(action_request(action));

    assert_eq!(status.code(), Some(7));
    assert!(events.iter().any(|event| event["event"] == "action:finish"
        && event["status"] == "failed"
        && event["code"] == 7));
}

#[test]
fn action_run_cancel_interrupts_process() {
    let root = temp_root("cancel");
    let command = make_fake_command(&root, "slow-action", "/bin/sleep 5");
    let mut child = Command::new(host_bin())
        .args(["action-run", "--json-lines"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(
            format!(
                "{}\n",
                json!({
                    "rootDir": root.display().to_string(),
                    "actionId": "slow",
                    "yes": true,
                    "env": {},
                    "actions": [{"id":"slow","label":"Slow","command": command.display().to_string()}]
                })
            )
            .as_bytes(),
        )
        .unwrap();
    std::thread::sleep(Duration::from_millis(50));
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(b"{\"event\":\"cancel\"}\n")
        .unwrap();
    let output = child.wait_with_output().unwrap();
    let stdout = String::from_utf8(output.stdout).unwrap();

    assert_eq!(output.status.code(), Some(130));
    assert!(stdout.contains("\"status\":\"canceled\""));
}

#[test]
fn action_run_root_required_emits_request_and_handles_cancel() {
    let root = temp_root("root-request");
    let mut child = Command::new(host_bin())
        .args(["action-run", "--json-lines"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(
            format!(
                "{}\n",
                json!({
                    "rootDir": root.display().to_string(),
                    "actionId": "install",
                    "yes": true,
                    "env": {},
                    "rootPolicy": {"requiresRoot": true, "reason": "Need root"},
                    "actions": [{"id":"install","label":"Install","requiresRoot":true,"command":"/bin/true"}]
                })
            )
            .as_bytes(),
        )
        .unwrap();
    std::thread::sleep(Duration::from_millis(50));
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(b"{\"event\":\"cancel\"}\n")
        .unwrap();
    let output = child.wait_with_output().unwrap();
    let stdout = String::from_utf8(output.stdout).unwrap();

    assert_eq!(output.status.code(), Some(130));
    assert!(stdout.contains("\"event\":\"root-request\""));
    assert!(stdout.contains("\"status\":\"canceled\""));
}
