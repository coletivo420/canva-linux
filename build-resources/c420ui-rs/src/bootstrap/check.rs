use crate::bootstrap::artifacts::{artifact_hashes, ARTIFACTS};
use crate::bootstrap::contracts::{BootstrapDiagnostic, BootstrapRequest};
use crate::bootstrap::manifest::build_manifest;
use crate::bootstrap::source_hash::calculate_source_hash;
use crate::bootstrap::validation::{resolve_output_dir, resolve_root};
use std::fs;

pub fn check_bootstrap(request: BootstrapRequest) -> Result<Vec<BootstrapDiagnostic>, String> {
    let root = resolve_root(&request.root_dir)?;
    let out_dir = resolve_output_dir(&root, &request.bootstrap_out_dir)?;
    let mut diagnostics = Vec::new();

    let manifest_path = out_dir.join("manifest.json");
    if !manifest_path.is_file() {
        diagnostics.push(error("missing-manifest", "bootstrap manifest is missing"));
    }

    for artifact in ARTIFACTS {
        let path = out_dir.join(artifact);
        if !path.is_file() {
            diagnostics.push(error(
                "missing-entrypoint",
                format!("bootstrap entrypoint {} is missing", artifact),
            ));
            continue;
        }
        let content = fs::read_to_string(&path).unwrap_or_default();
        if content.contains("createInteractiveActionRunner")
            || content.contains("Action Engine")
            || content.contains("status-panels")
            || content.contains("esbuild")
        {
            diagnostics.push(error(
                "heavy-entrypoint",
                format!("{} must remain a thin launcher", artifact),
            ));
        }
    }

    if manifest_path.is_file() {
        let manifest = build_manifest(&root, &out_dir, &request)?;
        let actual_manifest: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(&manifest_path)
                .map_err(|error| format!("Failed to read manifest: {}", error))?,
        )
        .map_err(|error| format!("Invalid manifest JSON: {}", error))?;
        let expected_manifest =
            serde_json::to_value(&manifest).map_err(|error| error.to_string())?;
        if actual_manifest != expected_manifest {
            diagnostics.push(error(
                "stale-manifest",
                "manifest differs from c420ui-host bootstrap-manifest output",
            ));
        }

        let expected_hashes = artifact_hashes(&out_dir)?;
        for (artifact, expected_hash) in expected_hashes {
            let actual_hash = actual_manifest
                .get("artifactHashes")
                .and_then(|value| value.get(&artifact))
                .and_then(|value| value.as_str())
                .unwrap_or("");
            if actual_hash != expected_hash {
                diagnostics.push(error(
                    "stale-artifact-hash",
                    format!("artifact hash differs for {}", artifact),
                ));
            }
        }

        let actual_source_hash = actual_manifest
            .get("c420uiSourceHash")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        let expected_source_hash = calculate_source_hash(&root, "c420ui")?;
        if actual_source_hash != expected_source_hash {
            diagnostics.push(error(
                "stale-source-hash",
                "c420ui source hash differs from current source",
            ));
        }
    }

    Ok(diagnostics)
}

fn error(code: &'static str, message: impl Into<String>) -> BootstrapDiagnostic {
    BootstrapDiagnostic {
        level: "error",
        code,
        message: message.into(),
    }
}
