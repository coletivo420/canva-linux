use serde_json::json;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn host_bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_c420ui-host"))
}

fn temp_root(name: &str) -> PathBuf {
    let root =
        std::env::temp_dir().join(format!("c420ui-bootstrap-{}-{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(root.join("build-resources/c420ui")).unwrap();
    fs::create_dir_all(root.join("config")).unwrap();
    fs::write(
        root.join("package.json"),
        json!({"version":"1.2.3"}).to_string(),
    )
    .unwrap();
    fs::write(
        root.join("build-resources/c420ui/package.json"),
        json!({"version":"0.1.0"}).to_string(),
    )
    .unwrap();
    fs::write(
        root.join("build-resources/c420ui/example.ts"),
        "export const value = 1;\n",
    )
    .unwrap();
    fs::write(
        root.join("config/project-ui.json"),
        json!({"stateDirectoryName":"example-project"}).to_string(),
    )
    .unwrap();
    fs::write(
        root.join("config/build-metadata.json"),
        json!({
            "buildRevision":"abc1234",
            "fullVersion":"1.2.3+abc1234",
            "displayVersion":"1.2.3",
            "phase":"Dev",
            "dependentProjectSourceHash":"sha256:bbbb",
            "combinedSourceHash":"sha256:cccc"
        })
        .to_string(),
    )
    .unwrap();
    root
}

fn run(command: &str, input: serde_json::Value) -> std::process::Output {
    let mut child = Command::new(host_bin())
        .args([command, "--json"])
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
    child.wait_with_output().unwrap()
}

fn bootstrap_input(root: &Path) -> serde_json::Value {
    json!({
        "rootDir": root.display().to_string(),
        "bootstrapOutDir": "build-resources/c420ui/bootstrap/generated",
        "projectConfigRoot": "config",
        "buildMetadataPath": "config/build-metadata.json"
    })
}

#[test]
fn bootstrap_requires_json() {
    let output = Command::new(host_bin()).arg("bootstrap").output().unwrap();
    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8(output.stderr)
        .unwrap()
        .contains("bootstrap command requires --json"));
}

#[test]
fn bootstrap_generates_manifest_and_thin_launchers() {
    let root = temp_root("generate");
    let output = run("bootstrap", bootstrap_input(&root));
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let value: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["ok"], true);
    assert_eq!(value["manifest"]["kind"], "c420ui-bootstrap");
    assert_eq!(value["manifest"]["bundleFormat"], "thin-launcher");
    assert_eq!(value["manifest"]["dependentProject"], "example-project");

    for artifact in ["run-c420ui.mjs", "run-c420ui-cli.mjs", "c420ui-builder.mjs"] {
        let content = fs::read_to_string(
            root.join("build-resources/c420ui/bootstrap/generated")
                .join(artifact),
        )
        .unwrap();
        assert!(content.contains("spawnSync"));
        assert!(!content.contains("createInteractiveActionRunner"));
        assert!(!content.contains("status-panels"));
    }

    let builder = fs::read_to_string(
        root.join("build-resources/c420ui/bootstrap/generated/c420ui-builder.mjs"),
    )
    .unwrap();
    assert!(builder.contains("run(tui(root), [\"run\", \"--json-lines\"])"));
    assert!(builder.contains("run(host(root), [\"action-run\", \"--json-lines\"]"));
    assert!(!builder.contains("run(host(root), [\"bootstrap\", \"--json\"]"));
}

#[test]
fn bootstrap_check_detects_stale_artifact() {
    let root = temp_root("stale");
    assert!(run("bootstrap", bootstrap_input(&root)).status.success());
    fs::write(
        root.join("build-resources/c420ui/bootstrap/generated/run-c420ui.mjs"),
        "console.log('stale');\n",
    )
    .unwrap();
    let output = run("bootstrap-check", bootstrap_input(&root));
    assert_eq!(output.status.code(), Some(2));
}
