use super::state::TuiRuntimeState;
use std::io::{self, Write};

pub fn render_to_stderr(state: &TuiRuntimeState) -> io::Result<()> {
    let mut stderr = io::stderr();
    writeln!(stderr)?;
    writeln!(
        stderr,
        "== {} {} ==",
        state.render.brand.name, state.render.brand.version
    )?;
    writeln!(
        stderr,
        "{} - {}",
        state.render.project.name, state.render.project.version
    )?;
    if let Some(subtitle) = &state.render.project.subtitle {
        writeln!(stderr, "{}", subtitle)?;
    }
    if let Some(status) = &state.status {
        writeln!(stderr, "Status: {}", status)?;
    }
    if let Some(progress) = &state.render.progress {
        let label = progress.label.as_deref().unwrap_or(&progress.state);
        writeln!(stderr, "Progress: {}", label)?;
    }
    if let Some(request) = &state.pending_root_request {
        writeln!(stderr)?;
        writeln!(stderr, "Root request: {}", request.action_id)?;
        writeln!(stderr, "{}", request.reason)?;
        writeln!(stderr, "Press Enter/y to accept or n/Esc to cancel.")?;
    }
    writeln!(stderr)?;
    writeln!(stderr, "Actions:")?;
    for (index, action) in state.render.actions.iter().enumerate() {
        let marker = if index == state.selected { ">" } else { " " };
        let suffix = if action.dangerous {
            " [danger]"
        } else if action.planned {
            " [planned]"
        } else {
            ""
        };
        writeln!(stderr, "{} {}{}", marker, action.label, suffix)?;
    }
    writeln!(stderr)?;
    writeln!(stderr, "Logs:")?;
    let start = state.render.logs.len().saturating_sub(8);
    for log in state.render.logs.iter().skip(start) {
        writeln!(stderr, "[{}] {}", log.source, log.line)?;
    }
    writeln!(stderr)?;
    writeln!(
        stderr,
        "Keys: j/k move, Enter select/accept, n deny, q quit, c cancel"
    )?;
    stderr.flush()
}
