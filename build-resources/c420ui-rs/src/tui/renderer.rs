use crate::tui::contracts::TuiFocusZone;
use crate::tui::legacy_layout::LegacyLayout;
use crate::tui::legacy_theme::LegacyTheme;
use crate::tui::widgets::*;
use ratatui::backend::Backend;
use ratatui::Terminal;

pub fn render<B: Backend>(
    terminal: &mut Terminal<B>,
    state: &crate::tui::state::TuiRuntimeState,
) -> std::io::Result<()> {
    let input = &state.render;
    let theme = LegacyTheme::from_contract(&input.theme.colors);

    terminal.draw(|f| {
        let area = f.size();
        let brand_version_line = format_c420ui_version_line(input);
        let project_lines = project_header_lines(input);
        let layout = LegacyLayout::compute(
            area,
            &input.brand.logo_lines,
            &project_lines,
            &brand_version_line,
        );

        // Draw Headers
        f.render_widget(
            draw_header(
                &input.brand.name,
                &brand_header_lines(input, &brand_version_line),
                layout.c420ui_header,
                &theme,
                false,
            ),
            layout.c420ui_header,
        );
        f.render_widget(
            draw_header(
                &input.project.name,
                &project_lines,
                layout.project_header,
                &theme,
                false,
            ),
            layout.project_header,
        );

        // Draw Menu
        f.render_widget(
            draw_menu(
                &input.menu.label,
                &input.menu.items,
                input.menu.selected,
                &theme,
                matches!(input.focus_zone, TuiFocusZone::Menu),
            ),
            layout.menu,
        );

        // Draw Panels
        f.render_widget(
            draw_panel(
                &input.panels.detected_installations,
                &theme,
                matches!(input.focus_zone, TuiFocusZone::Diagnostics),
            ),
            layout.detected_installations,
        );
        f.render_widget(
            draw_panel(
                &input.panels.generated_artifacts,
                &theme,
                matches!(input.focus_zone, TuiFocusZone::Diagnostics),
            ),
            layout.generated_artifacts,
        );
        f.render_widget(
            draw_panel(
                &input.panels.linux_artifacts,
                &theme,
                matches!(input.focus_zone, TuiFocusZone::Diagnostics),
            ),
            layout.linux_artifacts,
        );

        // Draw Overview (Content)
        let selected_item = input.menu.items.get(input.menu.selected);
        f.render_widget(
            draw_action_content(
                &input.panels.content,
                selected_item,
                &input.view,
                &theme,
                matches!(input.focus_zone, TuiFocusZone::Content),
            ),
            layout.overview,
        );

        // Draw Logs
        f.render_widget(
            draw_logs(
                &input.panels.logs.label,
                &input.panels.logs.lines,
                &theme,
                matches!(input.focus_zone, TuiFocusZone::Logs),
            ),
            layout.logs,
        );

        // Draw Progress
        if let Some(progress) = &input.progress {
            f.render_widget(
                draw_progress(
                    &progress.state,
                    progress.label.as_deref(),
                    progress.percent,
                    &theme,
                ),
                layout.progress,
            );
        }

        // Draw Footer
        f.render_widget(draw_footer(&input.footer.items, &theme), layout.footer);

        // Draw Modal
        if let Some(modal) = &input.modal {
            let modal_area = centered_rect(70, 50, area);
            f.render_widget(ratatui::widgets::Clear, modal_area);
            f.render_widget(
                draw_modal(modal, &state.modal_input, &theme, modal_area),
                modal_area,
            );
        }
    })?;

    Ok(())
}

fn brand_header_lines(
    input: &crate::tui::contracts::TuiRenderInput,
    version_line: &str,
) -> Vec<String> {
    let mut lines = vec![version_line.to_string()];
    lines.extend(input.brand.logo_lines.iter().cloned());
    lines
}

fn format_c420ui_version_line(input: &crate::tui::contracts::TuiRenderInput) -> String {
    match input.brand.hash.as_deref() {
        Some(hash) if !hash.is_empty() => format!(
            "{} {} · {}",
            input.brand.name,
            input.brand.version,
            short_hash(hash)
        ),
        _ => format!("{} {}", input.brand.name, input.brand.version),
    }
}

fn project_header_lines(input: &crate::tui::contracts::TuiRenderInput) -> Vec<String> {
    vec![
        input.project.name.clone(),
        input.project.subtitle.clone().unwrap_or_default(),
        format!(
            "Version: {}{} | Phase: {}",
            input.project.display_version,
            input
                .project
                .hash
                .as_deref()
                .map(|hash| format!(" · {}", short_hash(hash)))
                .unwrap_or_default(),
            input.project.phase.as_deref().unwrap_or("unknown")
        ),
    ]
}

fn short_hash(hash: &str) -> String {
    if hash == "unknown" {
        return "unknown".to_string();
    }
    let mut parts = hash.splitn(2, ':');
    let first = parts.next().unwrap_or_default();
    let second = parts.next();
    match second {
        Some(value) => format!("{}:{}", first, value.chars().take(8).collect::<String>()),
        None => first.chars().take(8).collect(),
    }
}
