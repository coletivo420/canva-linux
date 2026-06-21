use crate::status::classify::{
    loading_value, not_detected_value, state_for_detected, version_value,
};
use crate::status::contracts::StatusPanelLine;
use crate::status::detection::string_field;

const GENERATED: [&str; 7] = [
    "appimage",
    "flatpak",
    "tarball",
    "sha256sums",
    "deb",
    "rpm",
    "aur",
];

pub fn loading_generated_artifacts() -> Vec<StatusPanelLine> {
    vec![StatusPanelLine::new("AppImage", loading_value(), "loading")]
}

pub fn generated_artifacts(overview: &serde_json::Value) -> Vec<StatusPanelLine> {
    let Some(fragments) = overview
        .get("artifactFragments")
        .and_then(|value| value.as_array())
    else {
        return loading_generated_artifacts();
    };
    fragments
        .iter()
        .filter(|fragment| is_generated(fragment))
        .map(|fragment| {
            let label = string_field(fragment, "label").unwrap_or_else(|| {
                string_field(fragment, "id").unwrap_or_else(|| "Artifact".to_string())
            });
            let detected = fragment
                .get("detected")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let version = string_field(fragment, "path")
                .or_else(|| string_field(fragment, "fullVersion"))
                .or_else(|| string_field(fragment, "version"));
            let state = state_for_detected(detected, version.as_deref());
            let value = if detected {
                version.unwrap_or_else(|| version_value(None))
            } else {
                not_detected_value().to_string()
            };
            StatusPanelLine::new(label, value, state).with_hash(string_field(fragment, "hash"))
        })
        .collect()
}

pub fn linux_unpacked(overview: &serde_json::Value) -> Option<&serde_json::Value> {
    overview
        .get("artifactFragments")
        .and_then(|value| value.as_array())?
        .iter()
        .find(|fragment| {
            string_field(fragment, "kind").as_deref() == Some("linux-unpacked")
                || string_field(fragment, "id").as_deref() == Some("linux-unpacked")
        })
}

fn is_generated(fragment: &serde_json::Value) -> bool {
    let id = string_field(fragment, "id").unwrap_or_default();
    let kind = string_field(fragment, "kind").unwrap_or_default();
    if matches!(kind.as_str(), "linux-unpacked" | "native") {
        return false;
    }
    if matches!(
        id.as_str(),
        "linux-unpacked" | "native-system" | "native-user" | "native"
    ) {
        return false;
    }
    GENERATED.contains(&kind.as_str()) || GENERATED.contains(&id.as_str())
}
