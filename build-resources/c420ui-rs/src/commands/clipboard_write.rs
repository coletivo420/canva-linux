use crate::host::clipboard::write_clipboard;
use crate::input::ClipboardWriteInput;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClipboardWriteOutput {
    ok: bool,
    command: &'static str,
    backend: Option<&'static str>,
    message: String,
}

pub fn execute() -> Result<(), String> {
    let input: ClipboardWriteInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    let result = write_clipboard(&input.text, &input.env, &input.preferred_backends);
    let output = ClipboardWriteOutput {
        ok: result.ok,
        command: "clipboard-write",
        backend: result.backend,
        message: result.message,
    };
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
