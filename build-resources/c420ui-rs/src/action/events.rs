use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;

#[derive(Serialize)]
#[serde(tag = "event")]
pub enum ActionEvent<'a> {
    #[serde(rename = "action:start")]
    ActionStart {
        #[serde(rename = "actionId")]
        action_id: &'a str,
        message: &'a str,
        data: serde_json::Value,
    },
    #[serde(rename = "log")]
    Log {
        source: &'a str,
        line: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        level: Option<&'a str>,
    },
    #[serde(rename = "progress")]
    Progress {
        state: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        percent: Option<u8>,
    },
    #[serde(rename = "root-request")]
    RootRequest {
        #[serde(rename = "requestId")]
        request_id: &'a str,
        #[serde(rename = "actionId")]
        action_id: &'a str,
        reason: &'a str,
    },
    #[serde(rename = "action:finish")]
    ActionFinish {
        #[serde(rename = "actionId")]
        action_id: &'a str,
        status: &'a str,
        code: i32,
    },
    #[serde(rename = "error")]
    Error { message: String },
}

pub fn emit(event: ActionEvent<'_>) {
    match serde_json::to_string(&event) {
        Ok(json) => println!("{}", json),
        Err(error) => println!(
            "{}",
            json!({"event":"error","message":format!("Failed to serialize action event: {}", error)})
        ),
    }
    let _ = std::io::Write::flush(&mut std::io::stdout());
}

pub fn emit_log(source: &str, line: String, level: Option<&str>) {
    emit(ActionEvent::Log {
        source,
        line,
        level,
    });
}

pub fn emit_finish(action_id: &str, status: &str, code: i32) {
    emit(ActionEvent::ActionFinish {
        action_id,
        status,
        code,
    });
}

pub fn data(dry_run: bool) -> serde_json::Value {
    json!({ "dryRun": dry_run })
}

pub fn merge_env(
    base: &HashMap<String, String>,
    action: &HashMap<String, String>,
) -> HashMap<String, String> {
    let mut output = base.clone();
    output.extend(
        action
            .iter()
            .map(|(key, value)| (key.clone(), value.clone())),
    );
    output
}
