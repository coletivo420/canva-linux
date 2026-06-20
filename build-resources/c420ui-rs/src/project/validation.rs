use serde::Serialize;
use std::path::{Component, Path};

#[derive(Serialize, Debug, Clone)]
pub struct ProjectDiagnostic {
    pub level: &'static str,
    pub code: &'static str,
    pub message: String,
}

impl ProjectDiagnostic {
    pub fn error(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            level: "error",
            code,
            message: message.into(),
        }
    }

    pub fn warning(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            level: "warning",
            code,
            message: message.into(),
        }
    }
}

pub fn validate_relative_path(value: &str) -> bool {
    let path = Path::new(value);
    if path.is_absolute() {
        return true;
    }
    !path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    })
}

pub fn validate_identifier(value: &str) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty()
        && trimmed
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.' | ':'))
}
