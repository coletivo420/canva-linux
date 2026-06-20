use crate::status::contracts::StatusPanelsRequest;
use crate::status::panels::build_status_panels;

pub fn execute() -> Result<(), String> {
    let input: StatusPanelsRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let output = build_status_panels(input);
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
