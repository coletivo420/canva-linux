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
        let layout = LegacyLayout::compute(area);

        // Draw Headers
        f.render_widget(
            draw_header(&input.brand.name, layout.c420ui_header, &theme, false),
            layout.c420ui_header,
        );
        f.render_widget(
            draw_header(&input.project.name, layout.project_header, &theme, false),
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
        f.render_widget(
            draw_panel(
                &input.panels.content,
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
