use crate::tui::contracts::{TuiLogLine, TuiMenuItem, TuiPanel};
use crate::tui::legacy_theme::LegacyTheme;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};

pub fn draw_header<'a>(
    title: &'a str,
    lines: &'a [String],
    _area: Rect,
    theme: &LegacyTheme,
    active: bool,
) -> Paragraph<'a> {
    let style = if active {
        Style::default().fg(theme.active_label).bg(theme.background)
    } else {
        Style::default()
            .fg(theme.inactive_label)
            .bg(theme.background)
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(title);

    let content: Vec<Line> = lines
        .iter()
        .map(|line| {
            Line::from(Span::styled(
                line.clone(),
                Style::default().fg(theme.light_blue),
            ))
        })
        .collect();

    Paragraph::new(content).block(block).style(style)
}

pub fn draw_menu<'a>(
    label: &'a str,
    items: &'a [TuiMenuItem],
    selected: usize,
    theme: &LegacyTheme,
    active: bool,
) -> List<'a> {
    let list_items: Vec<ListItem> = items
        .iter()
        .enumerate()
        .map(|(i, item)| {
            let style = if i == selected {
                if active {
                    Style::default()
                        .fg(theme.menu_selected_fg)
                        .bg(theme.menu_selected_bg)
                } else {
                    Style::default()
                        .fg(theme.menu_inactive_selected_fg)
                        .bg(theme.menu_inactive_selected_bg)
                }
            } else {
                Style::default().fg(theme.text)
            };
            let marker = if item.planned.unwrap_or(false) {
                " (planned)"
            } else {
                ""
            };
            ListItem::new(format!("{}{}", item.label, marker)).style(style)
        })
        .collect();

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(label);

    List::new(list_items).block(block)
}

pub fn draw_panel<'a>(panel: &'a TuiPanel, theme: &LegacyTheme, active: bool) -> Paragraph<'a> {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(panel.label.clone());

    let lines: Vec<Line> = panel
        .lines
        .iter()
        .map(|l| styled_content_line(l, theme))
        .collect();

    Paragraph::new(lines).block(block)
}

pub fn draw_action_content<'a>(
    panel: &'a TuiPanel,
    selected: Option<&'a TuiMenuItem>,
    view: &crate::tui::contracts::TuiView,
    theme: &LegacyTheme,
    active: bool,
) -> Paragraph<'a> {
    if matches!(view, crate::tui::contracts::TuiView::Help) {
        return draw_help_content(panel, selected, theme, active);
    }

    if selected.is_none()
        || !matches!(
            view,
            crate::tui::contracts::TuiView::Install
                | crate::tui::contracts::TuiView::Development
                | crate::tui::contracts::TuiView::Maintenance
        )
    {
        return draw_panel(panel, theme, active);
    }

    let selected = selected.expect("checked above");
    let mut lines = vec![
        Line::from(Span::styled(
            format!("{} Actions", view_title(view)),
            Style::default().fg(theme.blue),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Selected action:",
            Style::default().fg(theme.success),
        )),
        Line::from(Span::styled(
            format!("  {}", selected.label),
            Style::default().fg(theme.text),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Description:",
            Style::default().fg(theme.success),
        )),
        Line::from(Span::styled(
            format!(
                "  {}",
                selected
                    .description
                    .as_deref()
                    .unwrap_or("No description available.")
            ),
            Style::default().fg(theme.text),
        )),
    ];
    if selected.planned.unwrap_or(false) {
        lines.extend([
            Line::from(""),
            Line::from(Span::styled("Status:", Style::default().fg(theme.success))),
            Line::from(Span::styled(
                "  Planned - visible in c420ui, but not executable in this phase.",
                Style::default().fg(theme.warning),
            )),
        ]);
    }
    if let Some(warning) = selected.warning.as_deref() {
        lines.extend([
            Line::from(""),
            Line::from(Span::styled("Warning:", Style::default().fg(theme.success))),
            Line::from(Span::styled(
                format!("  {}", warning),
                Style::default().fg(theme.error),
            )),
        ]);
    }

    Paragraph::new(lines).block(panel_block(&panel.label, theme, active))
}

fn draw_help_content<'a>(
    panel: &'a TuiPanel,
    selected: Option<&'a TuiMenuItem>,
    theme: &LegacyTheme,
    active: bool,
) -> Paragraph<'a> {
    let selected_id = selected
        .map(|item| item.id.as_str())
        .unwrap_or("help-navigation");
    let selected_label = selected
        .map(|item| item.label.as_str())
        .unwrap_or("Navigation");
    let body = match selected_id {
        "help-panels" => vec![
            "Active panel: highlighted border and label",
            "Active cell: highlighted menu/settings row",
            "Alt+Up/Down or Shift+PgUp/PgDn still scroll action panel directly",
        ],
        "help-logs" => vec![
            "F5 copies logs to the clipboard",
            "PageUp/PageDown/Home/End scroll the focused log panel",
            "Manual text selection mode can be enabled in Application Settings",
        ],
        "help-launcher" => vec![
            "The project launcher opens c420ui",
            "Direct action flags run CLI mode instead",
            "Do not run the Tool with sudo or as root",
            "Root authentication failures are shown in a centered popup",
        ],
        "help-settings" => vec![
            "Tool settings affect this installer/development interface",
            "Application Settings are persistent c420ui state",
            "Use Space or Enter only on real setting toggles",
        ],
        "help-status-colors" => vec![
            "Active panel border / label",
            "Active cell row",
            "Detected / Completed",
            "Not detected",
            "Running",
            "Error / Canceled",
        ],
        "help-clipboard" => vec!["wl-copy -> KDE qdbus6/qdbus -> GPaste -> xclip -> xsel"],
        "back-main" => vec!["Return to the Main Menu."],
        _ => vec![
            "Tab / Shift+Tab moves focus between menu, diagnostics, action panel and logs",
            "Up/Down moves menu selection when the menu is focused",
            "Enter selects executable actions only outside Help",
            "Esc goes back to main or confirms exit",
            "q quits",
        ],
    };

    let mut lines = vec![
        Line::from(Span::styled("Help", Style::default().fg(theme.blue))),
        Line::from(""),
        Line::from(Span::styled(
            format!("{}:", selected_label),
            Style::default().fg(theme.success),
        )),
    ];
    lines.extend(body.into_iter().map(|line| {
        Line::from(Span::styled(
            format!("  {}", line),
            Style::default().fg(theme.text),
        ))
    }));

    Paragraph::new(lines).block(panel_block(&panel.label, theme, active))
}

pub fn draw_logs<'a>(
    label: &'a str,
    lines: &'a [TuiLogLine],
    theme: &LegacyTheme,
    active: bool,
) -> Paragraph<'a> {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(label);

    let content: Vec<Line> = lines
        .iter()
        .map(|l| {
            let prefix = match l.source.as_str() {
                "system" => Span::styled("Tool | ", Style::default().fg(theme.light_blue)),
                _ => Span::styled("Action | ", Style::default().fg(theme.muted)),
            };
            let line_style = match l.level.as_deref() {
                Some("error") => Style::default().fg(theme.error),
                Some("warning") => Style::default().fg(theme.warning),
                _ => Style::default().fg(theme.text),
            };
            Line::from(vec![prefix, Span::styled(l.line.clone(), line_style)])
        })
        .collect();

    Paragraph::new(content).block(block)
}

pub fn draw_progress<'a>(
    state: &'a str,
    label: Option<&'a str>,
    percent: Option<u8>,
    theme: &LegacyTheme,
) -> Paragraph<'a> {
    let percent = percent.unwrap_or(0);
    let filled = (percent as f32 / 5.0) as usize;
    let empty = 20 - filled;

    let bar = format!(
        "Progress: [{}{}] {}%{}",
        "█".repeat(filled),
        "░".repeat(empty),
        percent,
        label.map(|l| format!(" - {}", l)).unwrap_or_default()
    );

    let color = match state {
        "error" | "canceled" => theme.error,
        "success" | "warning" => theme.success,
        _ => theme.warning,
    };

    Paragraph::new(bar).style(Style::default().fg(color))
}

pub fn draw_modal<'a>(
    modal: &'a crate::tui::contracts::TuiModal,
    modal_input: &'a str,
    theme: &LegacyTheme,
    _area: Rect,
) -> Paragraph<'a> {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(if modal.dangerous.unwrap_or(false) {
            theme.error
        } else {
            theme.active_border
        }))
        .title(modal.title.clone());

    let mut lines = vec![Line::from(modal.message.clone()), Line::from("")];

    if modal.kind == crate::tui::contracts::TuiModalKind::Input {
        lines.push(Line::from("Enter your sudo password to continue."));
        if modal.secret.unwrap_or(false) {
            lines.push(Line::from("*".repeat(modal_input.len())));
        } else {
            lines.push(Line::from(modal_input));
        }
    }

    Paragraph::new(lines)
        .block(block)
        .style(Style::default().fg(theme.text).bg(theme.background))
}

pub fn draw_footer<'a>(items: &'a [String], theme: &LegacyTheme) -> Paragraph<'a> {
    let content = items.join(" | ");
    Paragraph::new(content).style(Style::default().fg(theme.footer_fg).bg(theme.footer_bg))
}

fn panel_block<'a>(label: &'a str, theme: &LegacyTheme, active: bool) -> Block<'a> {
    Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(Span::styled(
            label.to_string(),
            Style::default().fg(if active {
                theme.active_label
            } else {
                theme.inactive_label
            }),
        ))
}

fn styled_content_line<'a>(line: &'a str, theme: &LegacyTheme) -> Line<'a> {
    let trimmed = line.trim();
    let style = if trimmed.ends_with(':') {
        Style::default().fg(theme.success)
    } else if trimmed == "not detected" || trimmed.contains("not detected") {
        Style::default().fg(theme.purple)
    } else {
        Style::default().fg(theme.text)
    };
    Line::from(Span::styled(line.to_string(), style))
}

fn view_title(view: &crate::tui::contracts::TuiView) -> &'static str {
    match view {
        crate::tui::contracts::TuiView::Install => "Install",
        crate::tui::contracts::TuiView::Development => "Development",
        crate::tui::contracts::TuiView::Maintenance => "Maintenance",
        crate::tui::contracts::TuiView::Settings => "Application Settings",
        crate::tui::contracts::TuiView::Help => "Help",
        crate::tui::contracts::TuiView::Main => "Main",
    }
}

pub fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
