use crate::bootstrap::contracts::BootstrapRequest;
use crate::bootstrap::manifest::run_bootstrap;

pub fn execute() -> Result<(), String> {
    let input: BootstrapRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let output = run_bootstrap(input)?;
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
