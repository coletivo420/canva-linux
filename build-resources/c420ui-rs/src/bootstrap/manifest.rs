use crate::bootstrap::artifacts::{artifact_hashes, ARTIFACTS};
use crate::bootstrap::contracts::{BootstrapManifest, BootstrapRequest, BootstrapResponse};
use crate::bootstrap::launchers::write_launchers;
use crate::bootstrap::source_hash::calculate_source_hash;
use crate::bootstrap::validation::{prepare_output_dir, resolve_output_dir, resolve_root};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

pub fn run_bootstrap(request: BootstrapRequest) -> Result<BootstrapResponse, String> {
    let root = resolve_root(&request.root_dir)?;
    let out_dir = resolve_output_dir(&root, &request.bootstrap_out_dir)?;
    prepare_output_dir(&out_dir)?;
    write_launchers(
        &out_dir,
        &request.project_config_root,
        &request.build_metadata_path,
    )?;
    let manifest = build_manifest(&root, &out_dir, &request)?;
    fs::write(
        out_dir.join("manifest.json"),
        format!("{}\n", serde_json::to_string_pretty(&manifest).unwrap()),
    )
    .map_err(|error| format!("Failed to write manifest: {}", error))?;
    Ok(BootstrapResponse {
        ok: true,
        command: "bootstrap",
        manifest,
        diagnostics: vec![],
    })
}

pub fn manifest_only(request: BootstrapRequest) -> Result<BootstrapResponse, String> {
    let root = resolve_root(&request.root_dir)?;
    let out_dir = resolve_output_dir(&root, &request.bootstrap_out_dir)?;
    let manifest = build_manifest(&root, &out_dir, &request)?;
    Ok(BootstrapResponse {
        ok: true,
        command: "bootstrap-manifest",
        manifest,
        diagnostics: vec![],
    })
}

pub fn build_manifest(
    root: &Path,
    out_dir: &Path,
    request: &BootstrapRequest,
) -> Result<BootstrapManifest, String> {
    let root_package = read_json(&root.join("package.json"))?;
    let c420ui_package = read_json(&root.join("build-resources/c420ui/package.json"))?;
    let build_metadata = read_json(&root.join(&request.build_metadata_path))?;
    let project_ui = read_json(
        &root
            .join(&request.project_config_root)
            .join("project-ui.json"),
    )
    .unwrap_or(Value::Null);
    let dependent_project = project_ui
        .get("stateDirectoryName")
        .and_then(|value| value.as_str())
        .unwrap_or("dependent-project");
    let dependent_version = string_field(&root_package, "version", "unknown");
    let c420ui_version = string_field(&c420ui_package, "version", "unknown");
    let artifact_hashes = artifact_hashes(out_dir)?;
    let c420ui_source_hash = calculate_source_hash(root, "c420ui")?;
    let mut entrypoints = BTreeMap::new();
    for (key, artifact) in [
        ("ui", ARTIFACTS[0]),
        ("cli", ARTIFACTS[1]),
        ("builder", ARTIFACTS[2]),
    ] {
        entrypoints.insert(
            key.to_string(),
            format!("build-resources/c420ui/bootstrap/generated/{}", artifact),
        );
    }
    Ok(BootstrapManifest {
        kind: "c420ui-bootstrap".to_string(),
        generated_by: "c420ui-host bootstrap".to_string(),
        c420ui_version,
        dependent_project: dependent_project.to_string(),
        dependent_project_version: dependent_version.clone(),
        dependent_project_build_revision: string_field(&build_metadata, "buildRevision", "unknown"),
        dependent_project_full_version: string_field(
            &build_metadata,
            "fullVersion",
            &dependent_version,
        ),
        dependent_project_display_version: string_field(
            &build_metadata,
            "displayVersion",
            &dependent_version,
        ),
        dependent_project_phase: string_field(&build_metadata, "phase", &dependent_version),
        entrypoint: ARTIFACTS[0].to_string(),
        cli_entrypoint: ARTIFACTS[1].to_string(),
        entrypoints,
        requires_node: ">=22.0.0".to_string(),
        build_recipe: "c420ui-host bootstrap".to_string(),
        build_tool: "c420ui-host".to_string(),
        build_target: "node22".to_string(),
        bundle_format: "thin-launcher".to_string(),
        module_format: "esm".to_string(),
        typescript_first: false,
        owns_full_dependency_policy: true,
        c420ui_source_hash_algorithm: "sha256".to_string(),
        c420ui_source_hash,
        dependent_project_source_hash: string_field(
            &build_metadata,
            "dependentProjectSourceHash",
            string_field(&build_metadata, "canvaLinuxSourceHash", "unknown").as_str(),
        ),
        combined_source_hash: string_field(&build_metadata, "combinedSourceHash", "unknown"),
        c420ui_source_hash_inputs: vec!["build-resources/c420ui".to_string()],
        artifact_hashes,
    })
}

fn read_json(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {}", path.display(), error))?;
    serde_json::from_str(&text)
        .map_err(|error| format!("Invalid JSON in {}: {}", path.display(), error))
}

fn string_field(value: &Value, key: &str, fallback: &str) -> String {
    value
        .get(key)
        .and_then(|item| item.as_str())
        .filter(|item| !item.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}
