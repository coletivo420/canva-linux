use crate::project::config::{load_project_config, ProjectConfigRequest};

pub fn execute() -> Result<(), String> {
    let input: ProjectConfigRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let output = load_project_config(&input.root_dir, &input.project_config_root)?;
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
