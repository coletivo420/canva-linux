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
fn source_hash_separates_scopes_and_ignores_generated_artifacts() {
    let root = std::env::temp_dir().join(format!("c420ui-metadata-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(root.join("build-resources/c420ui/bootstrap/generated")).unwrap();
    fs::create_dir_all(root.join("build-resources/example-project")).unwrap();
    fs::write(root.join("build-resources/c420ui/source.ts"), "one\n").unwrap();
    fs::write(
        root.join("build-resources/c420ui/bootstrap/generated/run-c420ui.mjs"),
        "generated\n",
    )
    .unwrap();
    fs::write(
        root.join("build-resources/example-project/config.json"),
        "{}\n",
    )
    .unwrap();

    let base = json!({"rootDir": root.display().to_string()});
    let c420ui = run(
        "source-hash",
        json!({"rootDir": base["rootDir"], "scope":"c420ui"}),
    );
    let dependent = run(
        "source-hash",
        json!({"rootDir": base["rootDir"], "scope":"dependent-project"}),
    );
    let combined = run(
        "source-hash",
        json!({"rootDir": base["rootDir"], "scope":"combined"}),
    );
    assert_eq!(c420ui["ok"], true);
    assert_ne!(c420ui["hash"], dependent["hash"]);
    assert_ne!(combined["hash"], c420ui["hash"]);

    fs::write(
        root.join("build-resources/c420ui/bootstrap/generated/run-c420ui.mjs"),
        "changed\n",
    )
    .unwrap();
    let c420ui_after = run(
        "source-hash",
        json!({"rootDir": root.display().to_string(), "scope":"c420ui"}),
    );
    assert_eq!(c420ui["hash"], c420ui_after["hash"]);
}
