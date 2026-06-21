pub fn state_for_detected(detected: bool, value: Option<&str>) -> &'static str {
    if detected {
        if value.unwrap_or("").trim().is_empty() {
            "unknown"
        } else {
            "detected"
        }
    } else {
        "not-detected"
    }
}

pub fn loading_value() -> &'static str {
    "loading..."
}

pub fn not_detected_value() -> &'static str {
    "not detected"
}

pub fn version_value(version: Option<&str>) -> String {
    match version.map(str::trim).filter(|item| !item.is_empty()) {
        Some(value) => format!("v{}", value.trim_start_matches('v')),
        None => "version unknown".to_string(),
    }
}
