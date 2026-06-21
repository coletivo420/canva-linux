use super::contracts::{TuiRenderInput, TuiRenderOutput, TuiScreen};

pub fn render(input: TuiRenderInput) -> TuiRenderOutput {
    let mut lines = vec![
        format!("c420ui {}", input.brand.version),
        format!("Project: {}", input.project.name),
        format!("Actions: {}", input.menu.items.len()),
    ];

    if let Some(hash) = &input.brand.hash {
        if hash.starts_with("sha256:") && hash.len() >= 15 {
            lines.push(format!("Brand hash: {}", &hash[7..15]));
        } else {
            lines.push(format!("Brand hash: {}", hash));
        }
    }

    TuiRenderOutput {
        ok: true,
        command: "render",
        version: "0.1.0",
        screen: TuiScreen {
            title: "c420ui".to_string(),
            lines,
        },
    }
}
