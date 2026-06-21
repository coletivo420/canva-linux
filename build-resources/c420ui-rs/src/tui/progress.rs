use crate::tui::legacy_theme::LegacyTheme;
use ratatui::style::{Color, Style};
use ratatui::widgets::Paragraph;

pub struct RenderedProgress {
    pub text: String,
    pub color: Color,
}

pub fn render_progress(
    state: &str,
    label: Option<&str>,
    percent: Option<u8>,
    theme: &LegacyTheme,
) -> RenderedProgress {
    let normalized = normalize_progress_state(state);
    let percent = normalize_progress_percent(normalized, percent);
    let filled = (percent as f32 / 5.0).round() as usize;
    let empty = 20usize.saturating_sub(filled);
    let label_text = label
        .map(|value| format!(" - {}", value))
        .unwrap_or_default();

    RenderedProgress {
        text: format!(
            "Progress: [{}{}] {}%{}",
            "█".repeat(filled),
            "░".repeat(empty),
            percent,
            label_text
        ),
        color: progress_color(normalized, theme),
    }
}

pub fn draw_progress<'a>(
    state: &'a str,
    label: Option<&'a str>,
    percent: Option<u8>,
    theme: &LegacyTheme,
) -> Paragraph<'a> {
    let progress = render_progress(state, label, percent, theme);
    Paragraph::new(progress.text).style(Style::default().fg(progress.color))
}

fn normalize_progress_state(state: &str) -> &str {
    match state {
        "pending" | "running" | "building" | "installing" => "running",
        "warning" | "partial" | "skipped" => "warning",
        "success" | "completed" | "done" => "success",
        "error" | "failed" => "error",
        "canceled" | "interrupted" => "canceled",
        _ => "idle",
    }
}

fn normalize_progress_percent(state: &str, percent: Option<u8>) -> u8 {
    match state {
        "success" => 100,
        "running" => percent.unwrap_or(10).min(99),
        _ => percent.unwrap_or(0).min(100),
    }
}

fn progress_color(state: &str, theme: &LegacyTheme) -> Color {
    match state {
        "success" => theme.success,
        "error" | "canceled" => theme.error,
        "warning" | "running" => theme.warning,
        _ => theme.muted,
    }
}
