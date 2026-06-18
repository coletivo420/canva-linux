use super::contracts::{TuiRenderInput, TuiRenderOutput, TuiScreen};

pub fn render(input: TuiRenderInput) -> TuiRenderOutput {
    let mut lines = vec![
        format!("{} {}", input.brand.name, input.brand.version),
        format!("Project: {}", input.project.name),
        format!("Actions: {}", input.actions.len()),
    ];

    if let Some(hash) = input
        .brand
        .hash
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        lines.push(format!("Brand hash: {}", short_hash(hash)));
    }
    if let Some(hash) = input
        .project
        .hash
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        lines.push(format!("Project hash: {}", short_hash(hash)));
    }
    if let Some(progress) = input.progress {
        let label = progress.label.unwrap_or_else(|| progress.state.clone());
        lines.push(format!("Progress: {}", label));
    }
    if !input.logs.is_empty() {
        lines.push(format!("Logs: {}", input.logs.len()));
    }

    TuiRenderOutput {
        ok: true,
        command: "render",
        version: "0.1.0",
        screen: TuiScreen {
            title: input.brand.name,
            lines,
        },
    }
}

fn short_hash(hash: &str) -> String {
    let value = hash.strip_prefix("sha256:").unwrap_or(hash);
    value.chars().take(8).collect()
}
