use crate::status::classify::{
    loading_value, not_detected_value, state_for_detected, version_value,
};
use crate::status::contracts::StatusPanelLine;

const INSTALLATIONS: [(&str, &str, &str, &str, &str); 4] = [
    (
        "Native System",
        "nativeSystem",
        "nativeSystemFullVersion",
        "nativeSystemVersion",
        "nativeSystemHash",
    ),
    (
        "Native User",
        "nativeUser",
        "nativeUserFullVersion",
        "nativeUserVersion",
        "nativeUserHash",
    ),
    (
        "Flatpak System",
        "flatpakSystem",
        "flatpakSystemFullVersion",
        "flatpakSystemVersion",
        "flatpakSystemHash",
    ),
    (
        "Flatpak User",
        "flatpakUser",
        "flatpakUserFullVersion",
        "flatpakUserVersion",
        "flatpakUserHash",
    ),
];

pub fn loading_installations() -> Vec<StatusPanelLine> {
    INSTALLATIONS
        .iter()
        .map(|(label, _, _, _, _)| StatusPanelLine::new(*label, loading_value(), "loading"))
        .collect()
}

pub fn detected_installations(overview: &serde_json::Value) -> Vec<StatusPanelLine> {
    let installations = overview
        .get("installations")
        .unwrap_or(&serde_json::Value::Null);
    INSTALLATIONS
        .iter()
        .map(|(label, detected_key, full_key, version_key, hash_key)| {
            let detected = installations
                .get(*detected_key)
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let version = string_field(installations, full_key)
                .or_else(|| string_field(installations, version_key));
            let state = state_for_detected(detected, version.as_deref());
            let value = if detected {
                version_value(version.as_deref())
            } else {
                not_detected_value().to_string()
            };
            StatusPanelLine::new(*label, value, state)
                .with_hash(string_field(installations, hash_key))
        })
        .collect()
}

pub fn string_field(value: &serde_json::Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|item| item.as_str())
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToString::to_string)
}
