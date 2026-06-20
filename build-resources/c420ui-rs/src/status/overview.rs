use crate::status::artifacts::linux_unpacked;
use crate::status::classify::{loading_value, version_value};
use crate::status::contracts::StatusPanelLine;
use crate::status::detection::string_field;

pub fn loading_linux_artifacts() -> Vec<StatusPanelLine> {
    ["Electron", "Node", "npm", "Linux unpacked"]
        .iter()
        .map(|label| StatusPanelLine::new(*label, loading_value(), "loading"))
        .collect()
}

pub fn linux_artifacts(overview: &serde_json::Value) -> Vec<StatusPanelLine> {
    let runtime = overview.get("runtime").unwrap_or(&serde_json::Value::Null);
    let mut lines = vec![
        runtime_line("Electron", string_field(runtime, "electronVersion")),
        runtime_line("Node", string_field(runtime, "nodeVersion")),
        runtime_line("npm", string_field(runtime, "npmVersion")),
    ];

    if let Some(fragment) = linux_unpacked(overview) {
        let version =
            string_field(fragment, "fullVersion").or_else(|| string_field(fragment, "version"));
        lines.push(
            StatusPanelLine::new(
                "Linux unpacked",
                version_value(version.as_deref()),
                "detected",
            )
            .with_hash(string_field(fragment, "hash")),
        );
    } else {
        lines.push(StatusPanelLine::new("Linux unpacked", "unknown", "unknown"));
    }
    lines
}

pub fn content_lines(overview: Option<&serde_json::Value>) -> Vec<StatusPanelLine> {
    let Some(overview) = overview else {
        return vec![StatusPanelLine::new("Overview", loading_value(), "loading")];
    };
    let project = overview.get("project").unwrap_or(&serde_json::Value::Null);
    vec![
        StatusPanelLine::new(
            "Version",
            string_field(project, "version").unwrap_or_else(|| "unknown".to_string()),
            "detected",
        ),
        StatusPanelLine::new(
            "Phase",
            string_field(project, "phase").unwrap_or_else(|| "unknown".to_string()),
            "unknown",
        ),
    ]
}

fn runtime_line(label: &str, version: Option<String>) -> StatusPanelLine {
    let state = if version.is_some() {
        "detected"
    } else {
        "unknown"
    };
    StatusPanelLine::new(label, version_value(version.as_deref()), state)
}
