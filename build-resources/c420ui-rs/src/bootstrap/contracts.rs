use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapRequest {
    pub root_dir: String,
    #[serde(default = "default_bootstrap_out_dir")]
    pub bootstrap_out_dir: String,
    #[serde(default = "default_project_config_root")]
    pub project_config_root: String,
    #[serde(default = "default_build_metadata_path")]
    pub build_metadata_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceHashRequest {
    pub root_dir: String,
    #[serde(default = "default_scope")]
    pub scope: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapResponse {
    pub ok: bool,
    pub command: &'static str,
    pub manifest: BootstrapManifest,
    pub diagnostics: Vec<BootstrapDiagnostic>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapManifest {
    pub kind: String,
    pub generated_by: String,
    pub c420ui_version: String,
    pub dependent_project: String,
    pub dependent_project_version: String,
    pub dependent_project_build_revision: String,
    pub dependent_project_full_version: String,
    pub dependent_project_display_version: String,
    pub dependent_project_phase: String,
    pub entrypoint: String,
    pub cli_entrypoint: String,
    pub entrypoints: BTreeMap<String, String>,
    pub requires_node: String,
    pub build_recipe: String,
    pub build_tool: String,
    pub build_target: String,
    pub bundle_format: String,
    pub module_format: String,
    pub typescript_first: bool,
    pub owns_full_dependency_policy: bool,
    pub c420ui_source_hash_algorithm: String,
    pub c420ui_source_hash: String,
    pub dependent_project_source_hash: String,
    pub combined_source_hash: String,
    pub c420ui_source_hash_inputs: Vec<String>,
    pub artifact_hashes: BTreeMap<String, String>,
}

#[derive(Debug, Serialize)]
pub struct BootstrapDiagnostic {
    pub level: &'static str,
    pub code: &'static str,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceHashResponse {
    pub ok: bool,
    pub command: &'static str,
    pub scope: String,
    pub hash: String,
    pub diagnostics: Vec<BootstrapDiagnostic>,
}

pub fn default_bootstrap_out_dir() -> String {
    "build-resources/c420ui/bootstrap/generated".to_string()
}

pub fn default_project_config_root() -> String {
    "config".to_string()
}

pub fn default_build_metadata_path() -> String {
    "build-metadata.json".to_string()
}

fn default_scope() -> String {
    "c420ui".to_string()
}
