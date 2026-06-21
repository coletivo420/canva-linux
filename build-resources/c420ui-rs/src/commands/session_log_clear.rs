use crate::session_log::store::clear_session_log;

pub fn execute() -> Result<(), String> {
    let output = clear_session_log()?;
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
