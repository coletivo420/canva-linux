use serde_json::json;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

fn host_bin() -> PathBuf {
    PathBuf::from(env!("CARGO_BIN_EXE_c420ui-host"))
}

fn run_status_panels(input: serde_json::Value) -> (std::process::ExitStatus, serde_json::Value) {
    let mut child = Command::new(host_bin())
        .args(["status-panels", "--json"])
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
    let value = serde_json::from_slice(&output.stdout).unwrap();
    (output.status, value)
}

fn sample_overview() -> serde_json::Value {
    let artifact_prefix = ["canva", "-", "linux", "-", "0.1.4-15.Dev.12", "-"].concat();
    json!({
        "project": {"version": "0.1.4-15.Dev.12", "phase": "Dev12"},
        "installations": {
            "nativeSystem": true,
            "nativeSystemFullVersion": "0.1.4-15.Dev.12",
            "nativeSystemHash": "sha256:abcdef123456",
            "nativeUser": false,
            "flatpakSystem": false,
            "flatpakUser": true,
            "flatpakUserVersion": "0.1.4-15.Dev.12"
        },
        "runtime": {
            "electronVersion": "41.5.0",
            "nodeVersion": "25.6.0",
            "npmVersion": "11.6.0"
        },
        "artifactFragments": [
            {"id":"appimage","kind":"appimage","label":"AppImage","detected":true,"path": format!("{}x86_64.AppImage", artifact_prefix),"hash":"sha256:aaaabbbbcccc"},
            {"id":"flatpak","kind":"flatpak","label":"Flatpak","detected":true,"path": format!("{}X86_64.flatpak", artifact_prefix)},
            {"id":"tarball","kind":"tarball","label":"Release tarball","detected":false},
            {"id":"sha256sums","kind":"sha256sums","label":"SHA256SUMS","detected":true,"path":"SHA256SUMS"},
            {"id":"deb","kind":"deb","label":"Debian package","detected":false},
            {"id":"rpm","kind":"rpm","label":"RPM package","detected":false},
            {"id":"aur","kind":"aur","label":"AUR package","detected":false},
            {"id":"linux-unpacked","kind":"linux-unpacked","label":"Linux unpacked","detected":true,"version":"0.1.4-15.Dev.12","hash":"sha256:linuxhash"},
            {"id":"native-system","kind":"native","label":"Native system","detected":true}
        ],
        "warnings": []
    })
}

#[test]
fn status_panels_requires_json() {
    let output = Command::new(host_bin())
        .arg("status-panels")
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(2));
    assert!(String::from_utf8(output.stderr)
        .unwrap()
        .contains("status-panels command requires --json"));
}

#[test]
fn status_panels_null_overview_generates_loading() {
    let (status, value) = run_status_panels(json!({
        "rootDir": "/repo",
        "projectConfigRoot": "config",
        "overviewStatus": null
    }));
    assert!(status.success());
    assert_eq!(value["ok"], true);
    assert_eq!(
        value["panels"]["detectedInstallations"]["lines"]
            .as_array()
            .unwrap()
            .len(),
        4
    );
    assert_eq!(
        value["panels"]["detectedInstallations"]["lines"][0]["state"],
        "loading"
    );
}

#[test]
fn status_panels_generates_semantic_detection_lines() {
    let (status, value) = run_status_panels(json!({
        "rootDir": "/repo",
        "projectConfigRoot": "config",
        "overviewStatus": sample_overview()
    }));
    assert!(status.success());
    let lines = value["panels"]["detectedInstallations"]["lines"]
        .as_array()
        .unwrap();
    assert_eq!(lines.len(), 4);
    assert_eq!(lines[0]["label"], "Native System");
    assert_eq!(lines[0]["state"], "detected");
    assert_eq!(lines[0]["hash"], "sha256:abcdef123456");
    assert_eq!(lines[1]["state"], "not-detected");
    assert_eq!(lines[1]["value"], "not detected");
}

#[test]
fn status_panels_filters_generated_artifacts_and_preserves_architecture_names() {
    let (_, value) = run_status_panels(json!({
        "rootDir": "/repo",
        "projectConfigRoot": "config",
        "overviewStatus": sample_overview()
    }));
    let lines = value["panels"]["generatedArtifacts"]["lines"]
        .as_array()
        .unwrap();
    let labels = lines
        .iter()
        .map(|line| line["label"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert!(labels.contains(&"AppImage"));
    assert!(labels.contains(&"Flatpak"));
    assert!(labels.contains(&"Release tarball"));
    assert!(labels.contains(&"SHA256SUMS"));
    assert!(labels.contains(&"Debian package"));
    assert!(labels.contains(&"RPM package"));
    assert!(labels.contains(&"AUR package"));
    assert!(!labels.contains(&"Linux unpacked"));
    assert!(!labels.contains(&"Native system"));
    assert_eq!(
        lines[0]["value"],
        [
            "canva",
            "-",
            "linux",
            "-",
            "0.1.4-15.Dev.12",
            "-",
            "x86_64.AppImage"
        ]
        .concat()
    );
    assert_eq!(
        lines[1]["value"],
        [
            "canva",
            "-",
            "linux",
            "-",
            "0.1.4-15.Dev.12",
            "-",
            "X86_64.flatpak"
        ]
        .concat()
    );
}

#[test]
fn status_panels_splits_linux_artifacts_into_separate_lines() {
    let (_, value) = run_status_panels(json!({
        "rootDir": "/repo",
        "projectConfigRoot": "config",
        "overviewStatus": sample_overview()
    }));
    let lines = value["panels"]["linuxArtifacts"]["lines"]
        .as_array()
        .unwrap();
    assert_eq!(lines.len(), 4);
    assert_eq!(lines[0]["label"], "Electron");
    assert_eq!(lines[1]["label"], "Node");
    assert_eq!(lines[2]["label"], "npm");
    assert_eq!(lines[3]["label"], "Linux unpacked");
    assert!(!serde_json::to_string(&lines)
        .unwrap()
        .contains("Electron, Node, npm"));
}

#[test]
fn status_panels_output_contains_no_blessed_tags() {
    let (_, value) = run_status_panels(json!({
        "rootDir": "/repo",
        "projectConfigRoot": "config",
        "overviewStatus": sample_overview()
    }));
    let text = serde_json::to_string(&value).unwrap();
    assert!(!text.contains("{green-fg}"));
    assert!(!text.contains("{orange-fg}"));
    assert!(!text.contains("{red-fg}"));
}
