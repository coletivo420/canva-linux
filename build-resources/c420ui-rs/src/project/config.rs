use crate::action::contracts::ActionDefinition;
use crate::project::actions::{normalize_actions, ProjectActionDefinition};
use crate::project::dependencies::{
    resolve_host_dependencies, ProjectHostDependencyConfig, ResolvedHostDependency,
};
use crate::project::install::{normalize_install, ProjectInstallConfig};
use crate::project::maintenance::{normalize_maintenance, ProjectMaintenanceConfig};
use crate::project::ui::{normalize_ui, ProjectUiConfig};
use crate::project::validation::ProjectDiagnostic;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfigRequest {
    pub root_dir: String,
    pub project_config_root: String,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfig {
    pub ui: ProjectUiConfig,
    pub actions: Vec<ActionDefinition>,
    pub host_dependencies: Vec<ResolvedHostDependency>,
    pub npm_dependencies: Vec<serde_json::Value>,
    pub install: ProjectInstallConfig,
    pub maintenance: ProjectMaintenanceConfig,
}

#[derive(Serialize, Debug, Clone)]
pub struct LoadedProjectConfig {
    pub ok: bool,
    pub command: &'static str,
    pub project: ProjectConfig,
    #[serde(rename = "hostDependencies")]
    pub host_dependencies: Vec<ResolvedHostDependency>,
    pub diagnostics: Vec<ProjectDiagnostic>,
}

pub fn load_project_config(
    root_dir: &str,
    project_config_root: &str,
) -> Result<LoadedProjectConfig, String> {
    let root = PathBuf::from(root_dir);
    if !root.is_absolute() || !root.is_dir() {
        return Err("rootDir must be an existing absolute directory.".to_string());
    }
    let config_root = resolve_config_root(&root, project_config_root)?;
    if !config_root.is_dir() {
        return Err("projectConfigRoot must be an existing directory.".to_string());
    }

    let mut diagnostics = Vec::new();
    let actions = read_json::<Vec<ProjectActionDefinition>>(&config_root.join("actions.json"))?;
    let host_dependencies =
        read_json::<ProjectHostDependencyConfig>(&config_root.join("host-dependencies.json"))?;
    let dependencies = read_optional_json(&config_root.join("dependencies.json"))?;
    let install = read_json::<serde_json::Value>(&config_root.join("install-native.json"))?;
    let maintenance = read_json::<serde_json::Value>(&config_root.join("maintenance.json"))?;
    let ui = read_json::<serde_json::Value>(&config_root.join("project-ui.json"))?;

    let actions = normalize_actions(actions, &mut diagnostics);
    let host_dependencies = resolve_host_dependencies(host_dependencies, &mut diagnostics);
    let npm_dependencies = dependencies
        .get("npm")
        .map(|value| vec![value.clone()])
        .unwrap_or_default();
    let install = normalize_install(install, &mut diagnostics);
    let maintenance = normalize_maintenance(maintenance, &mut diagnostics);
    let ui = normalize_ui(ui, &mut diagnostics);
    let ok = !diagnostics.iter().any(|item| item.level == "error");

    Ok(LoadedProjectConfig {
        ok,
        command: "project-config",
        host_dependencies: host_dependencies.clone(),
        diagnostics,
        project: ProjectConfig {
            ui,
            actions,
            host_dependencies,
            npm_dependencies,
            install,
            maintenance,
        },
    })
}

fn resolve_config_root(root: &Path, project_config_root: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(project_config_root);
    let resolved = if candidate.is_absolute() {
        candidate
    } else {
        root.join(candidate)
    };
    if !resolved.starts_with(root) {
        return Err("projectConfigRoot must stay within rootDir.".to_string());
    }
    Ok(resolved)
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, String> {
    let text = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {}", path.display(), error))?;
    serde_json::from_str(&text)
        .map_err(|error| format!("Invalid JSON in {}: {}", path.display(), error))
}

fn read_optional_json(path: &Path) -> Result<serde_json::Value, String> {
    if !path.exists() {
        return Ok(serde_json::Value::Object(Default::default()));
    }
    read_json(path)
}
