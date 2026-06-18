use super::contracts::{TuiProgress, TuiRenderInput};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(
    tag = "event",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum TuiRuntimeInputEvent {
    Init {
        state: TuiRenderInput,
    },
    State {
        state: TuiRenderInput,
    },
    Log {
        source: String,
        line: String,
    },
    Progress {
        state: String,
        label: Option<String>,
    },
    ActionStart {
        action_id: String,
    },
    ActionFinish {
        action_id: String,
        status: String,
        code: i32,
    },
    RootRequest {
        request_id: String,
        action_id: String,
        reason: String,
    },
    Error {
        message: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "event",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum TuiRuntimeOutputEvent {
    Ready,
    ActionSelected { action_id: String },
    Quit,
    Cancel,
    RootRequestResponse { request_id: String, accepted: bool },
}

pub fn progress_from_protocol(state: String, label: Option<String>) -> TuiProgress {
    TuiProgress {
        state,
        label,
        percent: None,
    }
}
