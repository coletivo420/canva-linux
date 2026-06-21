use crate::bootstrap::check::check_bootstrap;
use crate::bootstrap::contracts::BootstrapRequest;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapCheckResponse {
    ok: bool,
    command: &'static str,
    diagnostics: Vec<crate::bootstrap::contracts::BootstrapDiagnostic>,
}

pub fn execute() -> Result<(), String> {
    let input: BootstrapRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let diagnostics = check_bootstrap(input)?;
    let ok = !diagnostics.iter().any(|item| item.level == "error");
    let output = BootstrapCheckResponse {
        ok,
        command: "bootstrap-check",
        diagnostics,
    };
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    if ok {
        Ok(())
    } else {
        Err("bootstrap-check reported diagnostics".to_string())
    }
}
