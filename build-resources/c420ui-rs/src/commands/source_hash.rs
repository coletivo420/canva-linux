use crate::bootstrap::contracts::{BootstrapDiagnostic, SourceHashRequest, SourceHashResponse};
use crate::bootstrap::source_hash::calculate_source_hash;
use crate::bootstrap::validation::resolve_root;

pub fn execute() -> Result<(), String> {
    let input: SourceHashRequest = serde_json::from_reader(std::io::stdin())
        .map_err(|error| format!("Invalid JSON input: {}", error))?;
    let root = resolve_root(&input.root_dir)?;
    let hash = calculate_source_hash(&root, &input.scope)?;
    let output = SourceHashResponse {
        ok: true,
        command: "source-hash",
        scope: input.scope,
        hash,
        diagnostics: Vec::<BootstrapDiagnostic>::new(),
    };
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
    Ok(())
}
