use std::io::Write;
use std::process::{Command, Stdio};

#[test]
fn test_version() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let output = Command::new(bin)
        .arg("--version")
        .output()
        .expect("failed to execute binary");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert_eq!(stdout.trim(), "c420ui-host 0.1.0");
}

#[test]
fn test_host_info_json() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let output = Command::new(bin)
        .arg("host-info")
        .arg("--json")
        .output()
        .expect("failed to execute binary");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], true);
    assert_eq!(json["command"], "host-info");
    assert_eq!(json["version"], "0.1.0");
    assert!(json["host"].is_object());
    assert!(json["host"]["os"].is_string());
    assert!(json["host"]["arch"].is_string());
}

#[test]
fn test_doctor_json() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let output = Command::new(bin)
        .arg("doctor")
        .arg("--json")
        .output()
        .expect("failed to execute binary");

    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], true);
    assert_eq!(json["command"], "doctor");
    assert_eq!(json["version"], "0.1.0");
    assert!(json["checks"].is_array());

    let checks = json["checks"].as_array().unwrap();
    assert!(!checks.is_empty());
    assert_eq!(checks[0]["id"], "host");
    assert_eq!(checks[0]["ok"], true);
}

#[test]
fn test_unknown_command() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let output = Command::new(bin)
        .arg("unknown-cmd-xyz")
        .output()
        .expect("failed to execute binary");

    assert!(!output.status.success());
    assert_eq!(output.status.code(), Some(2));
    let stdout = String::from_utf8(output.stdout).unwrap();
    assert!(
        stdout.is_empty(),
        "stdout should be empty on unknown command"
    );
}

#[test]
fn test_check_host_dependencies_available() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("check-host-dependencies")
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    let input = r#"{
        "node": {
            "required": true,
            "minimumMajor": 20,
            "version": "22.15.0"
        },
        "commands": [
            {
                "id": "sh-test",
                "command": "sh",
                "required": true,
                "requiredFor": ["development", "build"],
                "installHint": "sh is a shell"
            }
        ]
    }"#;

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    let output = child.wait_with_output().expect("failed to read output");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], true);
    assert_eq!(json["command"], "check-host-dependencies");
    assert_eq!(json["status"], "available");
}

#[test]
fn test_check_host_dependencies_missing() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("check-host-dependencies")
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    let input = r#"{
        "node": {
            "required": true,
            "minimumMajor": 20,
            "version": "22.15.0"
        },
        "commands": [
            {
                "id": "impossible-command-xyz",
                "command": "impossible-command-xyz",
                "required": true,
                "requiredFor": ["development", "build"],
                "installHint": "no hint"
            }
        ]
    }"#;

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    let output = child.wait_with_output().expect("failed to read output");
    assert!(output.status.success()); // JSON envelopes output ok=false, but exits 0 when structurally correct
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], false);
    assert_eq!(json["command"], "check-host-dependencies");
    assert_eq!(json["status"], "missing");
    let dependencies = json["dependencies"].as_array().unwrap();
    assert_eq!(dependencies.len(), 1);
    assert_eq!(dependencies[0]["id"], "impossible-command-xyz");
}

#[test]
fn test_check_host_dependencies_failed_node() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("check-host-dependencies")
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    let input = r#"{
        "node": {
            "required": true,
            "minimumMajor": 20,
            "version": "18.19.0"
        }
    }"#;

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    let output = child.wait_with_output().expect("failed to read output");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], false);
    assert_eq!(json["command"], "check-host-dependencies");
    assert_eq!(json["status"], "failed");
    assert!(json["message"]
        .as_str()
        .unwrap()
        .contains("Node.js major version 20 or newer is required"));
}

#[test]
fn test_check_host_dependencies_invalid_json() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("check-host-dependencies")
        .arg("--json")
        .stdin(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(b"not-a-json-object")
            .expect("failed to write to stdin");
    }

    let status = child.wait().expect("failed to wait on child");
    assert_eq!(status.code(), Some(2));
}

#[test]
fn test_check_host_dependencies_unknown_fields() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("check-host-dependencies")
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    let input = r#"{
        "node": {
            "required": true,
            "minimumMajor": 20,
            "version": "22.15.0"
        },
        "unknown_root_field_xyz": 123
    }"#;

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    let output = child.wait_with_output().expect("failed to read output");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], true);
    assert_eq!(json["command"], "check-host-dependencies");
    assert_eq!(json["status"], "available");
}

#[test]
fn test_check_host_dependencies_custom_path() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("check-host-dependencies")
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    let input = r#"{
        "commands": [
            {
                "id": "sh-test",
                "command": "sh",
                "required": true,
                "requiredFor": ["development", "build"],
                "installHint": "sh is a shell"
            }
        ],
        "env": {
            "PATH": "/tmp/empty-nonexistent-directory-xyz"
        }
    }"#;

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    let output = child.wait_with_output().expect("failed to read output");
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("stdout is not valid JSON");

    assert_eq!(json["ok"], false);
    assert_eq!(json["command"], "check-host-dependencies");
    assert_eq!(json["status"], "missing");
    let dependencies = json["dependencies"].as_array().unwrap();
    assert_eq!(dependencies.len(), 1);
    assert_eq!(dependencies[0]["id"], "sh-test");
}
