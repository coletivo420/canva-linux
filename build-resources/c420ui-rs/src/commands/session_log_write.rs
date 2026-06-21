use crate::session_log::contracts::SessionLogRequest;
use crate::session_log::store::write_session_log;

pub fn execute() -> Result<(), String> {
    let input: SessionLogRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let output = write_session_log(input)?;
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
