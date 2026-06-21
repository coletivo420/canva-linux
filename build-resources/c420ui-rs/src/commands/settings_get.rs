use crate::settings::contracts::SettingsRequest;
use crate::settings::store::get_settings;

pub fn execute() -> Result<(), String> {
    let input: SettingsRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let output = get_settings(input)?;
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
