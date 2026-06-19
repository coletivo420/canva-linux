use crate::tui::contracts::{TuiLogLine, TuiMenuItem, TuiPanel};
use crate::tui::legacy_theme::LegacyTheme;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, List, ListItem, Paragraph};

pub fn draw_header<'a>(
    title: &'a str,
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

    Paragraph::new("").block(block).style(style)
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
            ListItem::new(item.label.clone()).style(style)
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

    let lines: Vec<Line> = panel.lines.iter().map(|l| Line::from(l.clone())).collect();

    Paragraph::new(lines).block(block)
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
