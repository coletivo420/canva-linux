use std::process::Command;

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
