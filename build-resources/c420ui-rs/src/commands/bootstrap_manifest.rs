use crate::bootstrap::contracts::BootstrapRequest;
use crate::bootstrap::manifest::manifest_only;

pub fn execute() -> Result<(), String> {
    let input: BootstrapRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let output = manifest_only(input)?;
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
