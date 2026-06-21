use crate::bootstrap::contracts::BootstrapDiagnostic;
use crate::bootstrap::validation::resolve_root;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BuildMetadataRequest {
    root_dir: String,
    #[serde(default)]
    build_metadata_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildMetadataResponse {
    ok: bool,
    command: &'static str,
    metadata: Value,
    diagnostics: Vec<BootstrapDiagnostic>,
}

pub fn execute() -> Result<(), String> {
    let input: BuildMetadataRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let root = resolve_root(&input.root_dir)?;
    let path = if input.build_metadata_path.trim().is_empty() {
        root.join("build-metadata.json")
    } else {
        root.join(input.build_metadata_path)
    };
    let text = fs::read_to_string(&path).map_err(|error| {
        format!(
            "Failed to read build metadata {}: {}",
            path.display(),
            error
        )
    })?;
    let metadata = serde_json::from_str(&text)
        .map_err(|error| format!("Invalid build metadata JSON {}: {}", path.display(), error))?;
    let output = BuildMetadataResponse {
        ok: true,
        command: "build-metadata",
        metadata,
        diagnostics: vec![],
    };
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
