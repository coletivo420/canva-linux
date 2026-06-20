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
        percent: Option<u8>,
    },
    ActionStart {
        action_id: String,
    },
    ActionFinish {
        action_id: String,
        status: String,
        code: i32,
    },
    RootRequestResult {
        request_id: String,
        ok: bool,
        message: Option<String>,
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
    ActionSelected {
        action_id: String,
    },
    ViewChanged {
        view: crate::tui::contracts::TuiView,
        selected: usize,
    },
    CopyLogs,
    Help,
    Toggle,
    SettingToggle {
        setting: String,
    },
    Quit,
    Cancel,
    RootRequestResponse {
        request_id: String,
        accepted: bool,
        input: Option<String>,
    },
}

pub fn progress_from_protocol(
    state: String,
    label: Option<String>,
    percent: Option<u8>,
) -> TuiProgress {
    TuiProgress {
        state,
        label,
        percent,
    }
}
