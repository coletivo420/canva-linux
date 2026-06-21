use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_root(name: &str) -> PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let root = std::env::temp_dir().join(format!("c420ui-host-{}-{}", name, millis));
    fs::create_dir_all(&root).unwrap();
    root
}

fn run_json_command(command: &str, input: &str) -> std::process::Output {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg(command)
        .arg("--json")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    child.wait_with_output().expect("failed to read output")
}

fn run_process(input: &str) -> std::process::Output {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("run-process")
        .arg("--json-lines")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin
            .write_all(input.as_bytes())
            .expect("failed to write to stdin");
    }

    child.wait_with_output().expect("failed to read output")
}

fn json_lines(output: &std::process::Output) -> Vec<serde_json::Value> {
    let stdout = String::from_utf8(output.stdout.clone()).unwrap();
    stdout
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| serde_json::from_str(line).expect("stdout line is not valid JSON"))
        .collect()
}

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

#[test]
fn test_run_process_json_lines_runs_simple_command_successfully() {
    let input = format!(
        "{{\"command\":\"printf\",\"args\":[\"ok\"],\"cwd\":{},\"env\":{{\"PATH\":\"{}\"}},\"label\":\"print ok\"}}\n",
        serde_json::to_string(&std::env::current_dir().unwrap().display().to_string()).unwrap(),
        std::env::var("PATH").unwrap_or_default()
    );
    let output = run_process(&input);
    let events = json_lines(&output);

    assert!(output.status.success());
    assert!(events.iter().any(|event| event["event"] == "started"));
    assert!(events
        .iter()
        .any(|event| event["event"] == "stdout" && event["line"] == "ok"));
    assert!(events
        .iter()
        .any(|event| event["event"] == "exit" && event["code"] == 0));
}

#[test]
fn test_run_process_emits_stderr_event() {
    let input = format!(
        "{{\"command\":\"sh\",\"args\":[\"-c\",\"printf warn >&2\"],\"cwd\":{},\"env\":{{\"PATH\":\"{}\"}},\"label\":\"stderr\"}}\n",
        serde_json::to_string(&std::env::current_dir().unwrap().display().to_string()).unwrap(),
        std::env::var("PATH").unwrap_or_default()
    );
    let output = run_process(&input);
    let events = json_lines(&output);

    assert!(output.status.success());
    assert!(events
        .iter()
        .any(|event| event["event"] == "stderr" && event["line"] == "warn"));
}

#[test]
fn test_run_process_exits_non_zero_when_child_exits_non_zero() {
    let input = format!(
        "{{\"command\":\"sh\",\"args\":[\"-c\",\"exit 7\"],\"cwd\":{},\"env\":{{\"PATH\":\"{}\"}},\"label\":\"fail\"}}\n",
        serde_json::to_string(&std::env::current_dir().unwrap().display().to_string()).unwrap(),
        std::env::var("PATH").unwrap_or_default()
    );
    let output = run_process(&input);
    let events = json_lines(&output);

    assert_eq!(output.status.code(), Some(7));
    assert!(events
        .iter()
        .any(|event| event["event"] == "exit" && event["code"] == 7));
}

#[test]
fn test_run_process_rejects_invalid_cwd() {
    let input = "{\"command\":\"printf\",\"args\":[\"ok\"],\"cwd\":\"/tmp/definitely-missing-c420ui-cwd\",\"env\":{},\"label\":\"bad cwd\"}\n";
    let output = run_process(input);
    let events = json_lines(&output);

    assert_eq!(output.status.code(), Some(2));
    assert!(events.iter().any(|event| event["event"] == "error"));
}

#[test]
fn test_run_process_rejects_empty_command() {
    let input = format!(
        "{{\"command\":\"\",\"args\":[],\"cwd\":{},\"env\":{{}},\"label\":\"empty\"}}\n",
        serde_json::to_string(&std::env::current_dir().unwrap().display().to_string()).unwrap()
    );
    let output = run_process(&input);
    let events = json_lines(&output);

    assert_eq!(output.status.code(), Some(2));
    assert!(events.iter().any(|event| event["event"] == "error"));
}

#[test]
fn test_run_process_does_not_invoke_shell_for_command_string() {
    let input = format!(
        "{{\"command\":\"echo ok\",\"args\":[],\"cwd\":{},\"env\":{{\"PATH\":\"{}\"}},\"label\":\"no shell\"}}\n",
        serde_json::to_string(&std::env::current_dir().unwrap().display().to_string()).unwrap(),
        std::env::var("PATH").unwrap_or_default()
    );
    let output = run_process(&input);
    let events = json_lines(&output);

    assert_eq!(output.status.code(), Some(2));
    assert!(events.iter().any(|event| event["event"] == "error"));
}

#[test]
fn test_run_process_cancels_child_when_receiving_cancel_event() {
    let bin = env!("CARGO_BIN_EXE_c420ui-host");
    let mut child = Command::new(bin)
        .arg("run-process")
        .arg("--json-lines")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to spawn binary");

    let input = format!(
        "{{\"command\":\"sh\",\"args\":[\"-c\",\"while true; do :; done\"],\"cwd\":{},\"env\":{{\"PATH\":\"{}\"}},\"label\":\"cancel\"}}\n",
        serde_json::to_string(&std::env::current_dir().unwrap().display().to_string()).unwrap(),
        std::env::var("PATH").unwrap_or_default()
    );
    {
        let stdin = child.stdin.as_mut().expect("failed to open stdin");
        stdin.write_all(input.as_bytes()).unwrap();
        stdin.write_all(b"{\"event\":\"cancel\"}\n").unwrap();
    }

    let output = child.wait_with_output().expect("failed to read output");
    let events = json_lines(&output);

    assert_eq!(output.status.code(), Some(130));
    assert!(events.iter().any(|event| event["event"] == "canceled"));
}

#[test]
fn test_remove_paths_removes_existing_temp_directory() {
    let root = temp_root("remove");
    fs::create_dir_all(root.join("dist")).unwrap();
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"dist\"],\"dryRun\":false,\"allowSudo\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("remove-paths", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert!(!root.join("dist").exists());
    assert_eq!(json["command"], "remove-paths");
    assert_eq!(json["removed"][0]["status"], "removed");
}

#[test]
fn test_remove_paths_reports_missing_target() {
    let root = temp_root("missing");
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"dist\"],\"dryRun\":false,\"allowSudo\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("remove-paths", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["removed"][0]["status"], "missing");
}

#[test]
fn test_remove_paths_rejects_absolute_target() {
    let root = temp_root("absolute");
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"/tmp/dist\"],\"dryRun\":false,\"allowSudo\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("remove-paths", &input);
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn test_remove_paths_rejects_parent_traversal() {
    let root = temp_root("traversal");
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"../dist\"],\"dryRun\":false,\"allowSudo\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("remove-paths", &input);
    assert_eq!(output.status.code(), Some(2));
}

#[cfg(unix)]
#[test]
fn test_remove_paths_rejects_symlink_target() {
    use std::os::unix::fs::symlink;
    let root = temp_root("symlink");
    fs::create_dir_all(root.join("real")).unwrap();
    symlink(root.join("real"), root.join("link")).unwrap();
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"link\"],\"dryRun\":false,\"allowSudo\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("remove-paths", &input);
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn test_remove_paths_dry_run_does_not_remove() {
    let root = temp_root("dry-run");
    fs::create_dir_all(root.join("dist")).unwrap();
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"dist\"],\"dryRun\":true,\"allowSudo\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("remove-paths", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert!(root.join("dist").exists());
    assert_eq!(json["removed"][0]["status"], "planned");
}

#[test]
fn test_fix_permissions_rejects_empty_user() {
    let root = temp_root("empty-user");
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"dist\"],\"user\":\"\",\"group\":null,\"dryRun\":true}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("fix-permissions", &input);
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn test_fix_permissions_rejects_unsafe_target() {
    let root = temp_root("unsafe-permissions");
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"../dist\"],\"user\":\"builder\",\"group\":null,\"dryRun\":true}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("fix-permissions", &input);
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn test_fix_permissions_dry_run_reports_planned() {
    let root = temp_root("fix-dry-run");
    fs::create_dir_all(root.join("dist")).unwrap();
    let input = format!(
        "{{\"rootDir\":{},\"targets\":[\"dist\"],\"user\":\"builder\",\"group\":null,\"dryRun\":true}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("fix-permissions", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["updated"][0]["status"], "planned");
}

#[test]
fn test_sudo_validate_respects_user_scope_refusal() {
    let root = temp_root("sudo-user-scope");
    let input = format!(
        "{{\"rootDir\":{},\"nonInteractive\":true,\"timeoutSeconds\":1,\"refuseUserScope\":true,\"actionScope\":\"user\"}}",
        serde_json::to_string(&root.display().to_string()).unwrap()
    );

    let output = run_json_command("sudo-validate", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["ok"], false);
    assert_eq!(json["available"], false);
}

#[test]
fn test_maintenance_invalid_json_exits_2() {
    let output = run_json_command("remove-paths", "not-json");
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn test_fs_ops_write_file_and_copy_file() {
    let root = temp_root("fs-write-copy");
    let source = root.join("source.txt");
    let target = root.join("nested/target.txt");
    let input = format!(
        "{{\"rootDir\":{},\"operations\":[{{\"kind\":\"write-file\",\"path\":{},\"content\":\"hello\",\"mode\":420}},{{\"kind\":\"copy-file\",\"from\":{},\"to\":{},\"mode\":420}}],\"dryRun\":false}}",
        serde_json::to_string(&root.display().to_string()).unwrap(),
        serde_json::to_string(&source.display().to_string()).unwrap(),
        serde_json::to_string(&source.display().to_string()).unwrap(),
        serde_json::to_string(&target.display().to_string()).unwrap(),
    );

    let output = run_json_command("fs-ops", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["command"], "fs-ops");
    assert_eq!(fs::read_to_string(target).unwrap(), "hello");
}

#[test]
fn test_fs_ops_dry_run_does_not_write() {
    let root = temp_root("fs-dry-run");
    let target = root.join("planned.txt");
    let input = format!(
        "{{\"rootDir\":{},\"operations\":[{{\"kind\":\"write-file\",\"path\":{},\"content\":\"hello\",\"mode\":420}}],\"dryRun\":true}}",
        serde_json::to_string(&root.display().to_string()).unwrap(),
        serde_json::to_string(&target.display().to_string()).unwrap(),
    );

    let output = run_json_command("fs-ops", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert!(!target.exists());
    assert_eq!(json["results"][0]["status"], "planned");
}

#[cfg(unix)]
#[test]
fn test_ensure_linux_unpacked_preserves_selected_name() {
    let root = temp_root("linux-unpacked");
    let dist = root.join("dist");
    fs::create_dir_all(dist.join("linux-arm64-unpacked")).unwrap();
    let input = format!(
        "{{\"distDir\":{},\"canonicalName\":\"linux-unpacked\",\"candidateContains\":\"unpacked\",\"dryRun\":false}}",
        serde_json::to_string(&dist.display().to_string()).unwrap(),
    );

    let output = run_json_command("ensure-linux-unpacked", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["selected"], "linux-arm64-unpacked");
    assert!(dist.join("linux-unpacked").exists());
}

#[test]
fn test_ensure_linux_unpacked_dry_run_allows_missing_dist() {
    let root = temp_root("linux-unpacked-dry-run");
    let dist = root.join("missing-dist");
    let input = format!(
        "{{\"distDir\":{},\"canonicalName\":\"linux-unpacked\",\"candidateContains\":\"unpacked\",\"dryRun\":true}}",
        serde_json::to_string(&dist.display().to_string()).unwrap(),
    );

    let output = run_json_command("ensure-linux-unpacked", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["selected"], "linux-unpacked");
    assert_eq!(json["canonical"], "linux-unpacked");
    assert_eq!(json["createdSymlink"], false);
    assert_eq!(json["dryRun"], true);
}

#[test]
fn test_artifact_file_ops_cleanup_and_find() {
    let root = temp_root("artifact-ops");
    let dist = root.join("dist");
    fs::create_dir_all(&dist).unwrap();
    fs::write(dist.join("old.AppImage"), "old").unwrap();
    fs::write(dist.join("app-1.AppImage"), "new").unwrap();
    fs::write(dist.join("old.AppImage.sha256"), "old hash").unwrap();
    let input = format!(
        "{{\"distDir\":{},\"cleanup\":[\".sha256\"],\"find\":{{\"startsWith\":\"app-\",\"endsWith\":\".AppImage\",\"expect\":\"one\"}},\"dryRun\":false}}",
        serde_json::to_string(&dist.display().to_string()).unwrap(),
    );

    let output = run_json_command("artifact-file-ops", &input);
    let stdout = String::from_utf8(output.stdout).unwrap();
    let json: serde_json::Value = serde_json::from_str(&stdout).unwrap();

    assert!(output.status.success());
    assert_eq!(json["command"], "artifact-file-ops");
    assert!(!dist.join("old.AppImage.sha256").exists());
    assert_eq!(
        json["selected"],
        dist.join("app-1.AppImage").display().to_string()
    );
    assert_eq!(json["size"], 3);
}
