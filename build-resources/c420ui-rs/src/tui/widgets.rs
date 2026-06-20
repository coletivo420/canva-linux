use crate::tui::contracts::{TuiLogLine, TuiMenuItem, TuiPanel};
use crate::tui::legacy_theme::LegacyTheme;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph, Wrap};

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
    scroll: u16,
) -> List<'a> {
    let list_items: Vec<ListItem> = items
        .iter()
        .enumerate()
        .map(|(i, item)| {
            let actionable = item.action_id.is_some() || item.view.is_some();
            let style = if i == selected {
                if !actionable {
                    Style::default().fg(theme.light_blue).bg(theme.surface_alt)
                } else if active {
                    Style::default()
                        .fg(theme.menu_selected_fg)
                        .bg(theme.menu_selected_bg)
                } else {
                    Style::default()
                        .fg(theme.menu_inactive_selected_fg)
                        .bg(theme.menu_inactive_selected_bg)
                }
            } else if !actionable {
                Style::default().fg(theme.muted)
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

    List::new(list_items)
        .block(block)
        .scroll_padding(scroll as usize)
}

pub fn draw_panel<'a>(
    panel: &'a TuiPanel,
    theme: &LegacyTheme,
    active: bool,
    scroll: u16,
    area: Rect,
) -> Paragraph<'a> {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(scrollable_title(
            &panel.label,
            panel.lines.len(),
            area.height,
        ));

    let lines: Vec<Line> = panel
        .lines
        .iter()
        .map(|l| styled_status_line(l, theme))
        .collect();

    Paragraph::new(lines)
        .block(block)
        .scroll((clamp_scroll(scroll, panel.lines.len()), 0))
        .wrap(Wrap { trim: false })
}

pub fn draw_action_content<'a>(
    panel: &'a TuiPanel,
    selected: Option<&'a TuiMenuItem>,
    view: &crate::tui::contracts::TuiView,
    theme: &LegacyTheme,
    active: bool,
    scroll: u16,
    area: Rect,
) -> Paragraph<'a> {
    if matches!(view, crate::tui::contracts::TuiView::Help) {
        return draw_help_content(panel, selected, theme, active, scroll, area);
    }

    if selected.is_none()
        || !matches!(
            view,
            crate::tui::contracts::TuiView::Install
                | crate::tui::contracts::TuiView::Development
                | crate::tui::contracts::TuiView::Maintenance
        )
    {
        return draw_panel(panel, theme, active, scroll, area);
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

    let scroll = clamp_scroll(scroll, lines.len());
    Paragraph::new(lines)
        .block(panel_block(panel.label.clone(), theme, active))
        .scroll((scroll, 0))
        .wrap(Wrap { trim: false })
}

fn draw_help_content<'a>(
    panel: &'a TuiPanel,
    selected: Option<&'a TuiMenuItem>,
    theme: &LegacyTheme,
    active: bool,
    scroll: u16,
    area: Rect,
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

    let title = scrollable_title(&panel.label, lines.len(), area.height);
    let scroll = clamp_scroll(scroll, lines.len());
    Paragraph::new(lines)
        .block(panel_block(title, theme, active))
        .scroll((scroll, 0))
        .wrap(Wrap { trim: false })
}

pub fn draw_logs<'a>(
    label: &'a str,
    lines: &'a [TuiLogLine],
    theme: &LegacyTheme,
    active: bool,
    scroll: u16,
    area: Rect,
) -> Paragraph<'a> {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(scrollable_title(label, lines.len(), area.height));

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

    Paragraph::new(content)
        .block(block)
        .scroll((clamp_scroll(scroll, lines.len()), 0))
        .wrap(Wrap { trim: false })
}

pub fn draw_modal<'a>(
    modal: &'a crate::tui::contracts::TuiModal,
    modal_input: &'a str,
    theme: &LegacyTheme,
    area: Rect,
) -> Paragraph<'a> {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(if modal.dangerous.unwrap_or(false) {
            theme.error
        } else {
            theme.active_border
        }))
        .title(modal.title.clone());

    let mut lines: Vec<Line> = modal
        .message
        .lines()
        .map(|line| Line::from(line.to_string()))
        .collect();
    lines.push(Line::from(""));

    if modal.kind == crate::tui::contracts::TuiModalKind::Input {
        let input_width = area.width.saturating_sub(8).max(12) as usize;
        let typed = if modal.secret.unwrap_or(false) {
            "*".repeat(modal_input.len())
        } else {
            modal_input.to_string()
        };
        let clipped = typed
            .chars()
            .take(input_width.saturating_sub(4))
            .collect::<String>();
        lines.push(Line::from(format!("┌{}┐", "─".repeat(input_width))));
        if modal.secret.unwrap_or(false) {
            lines.push(Line::from(format!(
                "│ {:width$} │",
                clipped,
                width = input_width - 2
            )));
        } else {
            lines.push(Line::from(format!(
                "│ {:width$} │",
                clipped,
                width = input_width - 2
            )));
        }
        lines.push(Line::from(format!("└{}┘", "─".repeat(input_width))));
        lines.push(Line::from(""));
        lines.push(Line::from("[Enter] Submit  [Esc] Cancel"));
    } else if modal.kind == crate::tui::contracts::TuiModalKind::Confirm {
        lines.push(Line::from("[y/Enter] Confirm    [Esc/n] Cancel"));
    }

    Paragraph::new(lines)
        .block(block)
        .style(Style::default().fg(theme.text).bg(theme.background))
}

pub fn centered_fixed_height(percent_x: u16, height: u16, r: Rect) -> Rect {
    let height = height.min(r.height.saturating_sub(2)).max(5);
    let vertical_margin = r.height.saturating_sub(height) / 2;
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(vertical_margin),
            Constraint::Length(height),
            Constraint::Min(0),
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

pub fn draw_footer<'a>(items: &'a [String], theme: &LegacyTheme) -> Paragraph<'a> {
    let content = items.join(" | ");
    Paragraph::new(content).style(Style::default().fg(theme.footer_fg).bg(theme.footer_bg))
}

fn panel_block(label: String, theme: &LegacyTheme, active: bool) -> Block<'static> {
    Block::default()
        .borders(Borders::ALL)
        .border_style(if active {
            Style::default().fg(theme.active_border)
        } else {
            Style::default().fg(theme.inactive_border)
        })
        .title(Span::styled(
            label,
            Style::default().fg(if active {
                theme.active_label
            } else {
                theme.inactive_label
            }),
        ))
}

fn styled_status_line<'a>(line: &'a str, theme: &LegacyTheme) -> Line<'a> {
    let trimmed = line.trim();
    if let Some((label, value)) = line.split_once(':') {
        return Line::from(vec![
            Span::styled(format!("{}:", label), Style::default().fg(theme.text)),
            Span::styled(value.to_string(), status_value_style(value, theme)),
        ]);
    }
    let style = if is_error_value(trimmed) {
        Style::default().fg(theme.error)
    } else if is_warning_value(trimmed) {
        Style::default().fg(theme.warning)
    } else if is_success_value(trimmed) {
        Style::default().fg(theme.success)
    } else if is_muted_value(trimmed) {
        Style::default().fg(theme.muted)
    } else {
        Style::default().fg(theme.text)
    };
    Line::from(Span::styled(line.to_string(), style))
}

fn status_value_style(value: &str, theme: &LegacyTheme) -> Style {
    let trimmed = value.trim();
    if is_error_value(trimmed) {
        Style::default().fg(theme.error)
    } else if is_warning_value(trimmed) {
        Style::default().fg(theme.warning)
    } else if is_success_value(trimmed) {
        Style::default().fg(theme.success)
    } else if is_muted_value(trimmed) {
        Style::default().fg(theme.muted)
    } else {
        Style::default().fg(theme.text)
    }
}

fn is_warning_value(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.contains("not detected")
        || lower.contains("warning")
        || lower.contains("skipped")
        || lower.contains("partial")
}

fn is_error_value(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.contains("error") || lower.contains("failed")
}

fn is_success_value(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.contains("found")
        || lower.contains("available")
        || lower.contains("installed")
        || (lower.contains("detected") && !lower.contains("not detected"))
        || value.chars().any(|c| c.is_ascii_digit())
}

fn is_muted_value(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.is_empty() || lower.contains("unknown") || lower.contains("loading")
}

fn clamp_scroll(scroll: u16, lines: usize) -> u16 {
    scroll.min(lines.saturating_sub(1) as u16)
}

fn scrollable_title(label: &str, line_count: usize, height: u16) -> String {
    if line_count > height.saturating_sub(2) as usize {
        format!("{} ↕", label)
    } else {
        label.to_string()
    }
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
