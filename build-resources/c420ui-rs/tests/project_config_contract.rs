use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn host_bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_c420ui-host"))
}

fn temp_root(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!(
        "c420ui-project-config-{}-{}",
        name,
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&path);
    fs::create_dir_all(path.join("config")).unwrap();
    path
}

fn write_config(root: &Path, actions: serde_json::Value) {
    let config = root.join("config");
    fs::write(config.join("actions.json"), actions.to_string()).unwrap();
    fs::write(
        config.join("host-dependencies.json"),
        json!({
            "commands": [{
                "id": "sh",
                "command": "sh",
                "required": true,
                "installHint": "Install a POSIX shell."
            }],
            "npm": {"packageManager": "npm"}
        })
        .to_string(),
    )
    .unwrap();
    fs::write(
        config.join("dependencies.json"),
        json!({"npm": {"packageManager": "npm"}}).to_string(),
    )
    .unwrap();
    fs::write(
        config.join("install-native.json"),
        json!({
            "executable": "example",
            "desktopName": "example.desktop",
            "buildMetadataTarget": "config/build-metadata.json",
            "system": {"prefix": "/opt/example", "bin": "/usr/local/bin/example"},
            "user": {"prefix": ".local/opt/example", "bin": ".local/bin/example"}
        })
        .to_string(),
    )
    .unwrap();
    fs::write(
        config.join("maintenance.json"),
        json!({"cleanupTargets": [".build"], "permissionTargets": ["dist"]}).to_string(),
    )
    .unwrap();
    fs::write(
        config.join("project-ui.json"),
        json!({
            "projectName": "Example Project",
            "projectSubtitle": "Workspace",
            "c420uiTitle": "Example c420ui",
            "logoLines": ["EXAMPLE"]
        })
        .to_string(),
    )
    .unwrap();
}

fn run_project_config(root: &Path) -> std::process::Output {
    let mut child = Command::new(host_bin())
        .args(["project-config", "--json"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
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
                    "projectConfigRoot": "config"
                })
            )
            .as_bytes(),
        )
        .unwrap();
    child.wait_with_output().unwrap()
}

fn stdout_json(output: std::process::Output) -> serde_json::Value {
    serde_json::from_slice(&output.stdout).unwrap()
}

#[test]
fn project_config_requires_json() {
    let output = Command::new(host_bin())
        .arg("project-config")
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8(output.stderr)
        .unwrap()
        .contains("project-config command requires --json"));
}

#[test]
fn project_config_rejects_invalid_root_dir() {
    let mut child = Command::new(host_bin())
        .args(["project-config", "--json"])
        .stdin(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(b"{\"rootDir\":\"relative\",\"projectConfigRoot\":\"config\"}\n")
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert_eq!(output.status.code(), Some(2));
}

#[test]
fn project_config_loads_valid_project_files() {
    let root = temp_root("valid");
    write_config(
        &root,
        json!([{
            "id": "doctor",
            "label": "Doctor",
            "kind": "command",
            "command": "/bin/true",
            "cli": ["--doctor"],
            "env": {"EXAMPLE": "1"}
        }]),
    );

    let output = run_project_config(&root);
    assert!(output.status.success());
    let value = stdout_json(output);
    assert_eq!(value["ok"], true);
    assert_eq!(value["command"], "project-config");
    assert_eq!(value["project"]["actions"][0]["id"], "doctor");
    assert_eq!(value["project"]["actions"][0]["cliFlags"][0], "--doctor");
    assert_eq!(value["project"]["hostDependencies"][0]["id"], "sh");
    assert_eq!(
        value["project"]["install"]["desktopName"],
        "example.desktop"
    );
    assert_eq!(
        value["project"]["maintenance"]["cleanupTargets"][0],
        ".build"
    );
    assert_eq!(value["project"]["ui"]["projectName"], "Example Project");
}

#[test]
fn project_config_reports_action_and_path_diagnostics() {
    let root = temp_root("invalid");
    write_config(
        &root,
        json!([
            {"id": "doctor", "label": "Doctor", "kind": "command", "command": "/bin/true"},
            {"id": "doctor", "label": "", "kind": "command"}
        ]),
    );
    fs::write(
        root.join("config/install-native.json"),
        json!({
            "executable": "bin/example",
            "desktopName": "example.txt",
            "buildMetadataTarget": "../outside",
            "user": {"prefix": "../outside"}
        })
        .to_string(),
    )
    .unwrap();
    fs::write(
        root.join("config/maintenance.json"),
        json!({"cleanupTargets": ["../outside"]}).to_string(),
    )
    .unwrap();

    let output = run_project_config(&root);
    assert!(output.status.success());
    let value = stdout_json(output);
    let codes = value["diagnostics"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["code"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(value["ok"], false);
    assert!(codes.contains(&"duplicate-action-id"));
    assert!(codes.contains(&"invalid-action-command"));
    assert!(codes.contains(&"invalid-install-path"));
    assert!(codes.contains(&"invalid-maintenance-target"));
}

#[test]
fn rust_source_does_not_hardcode_dependent_project_identity() {
    let source_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut stack = vec![source_root];
    while let Some(path) = stack.pop() {
        for entry in fs::read_dir(path).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|item| item.to_str()) == Some("rs") {
                let text = fs::read_to_string(&path).unwrap();
                let forbidden = [
                    ["Canva", " ", "Linux"].concat(),
                    ["canva", "-", "linux"].concat(),
                    ["io", ".", "github", ".", "coletivo420"].concat(),
                ];
                for fragment in forbidden {
                    assert!(!text.contains(&fragment), "{}", path.display());
                }
            }
        }
    }
}
