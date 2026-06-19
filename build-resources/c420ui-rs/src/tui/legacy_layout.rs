use ratatui::layout::{Constraint, Direction, Layout, Rect};

pub struct LegacyLayout {
    pub c420ui_header: Rect,
    pub project_header: Rect,
    pub menu: Rect,
    pub detected_installations: Rect,
    pub generated_artifacts: Rect,
    pub linux_artifacts: Rect,
    pub overview: Rect,
    pub logs: Rect,
    pub progress: Rect,
    pub footer: Rect,
    pub mode: LegacyLayoutMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LegacyLayoutMode {
    SideBySide,
    Stacked,
}

impl LegacyLayout {
    pub fn compute(area: Rect) -> Self {
        let mode = if area.width >= 80 {
            LegacyLayoutMode::SideBySide
        } else {
            LegacyLayoutMode::Stacked
        };

        let main_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // Headers
                Constraint::Min(10),   // Content
                Constraint::Length(1), // Progress
                Constraint::Length(1), // Footer
            ])
            .split(area);

        let footer = main_chunks[3];
        let progress = main_chunks[2];
        let header_chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Length(28), // c420ui
                Constraint::Min(40),    // Project
            ])
            .split(main_chunks[0]);

        let (c420ui_header, project_header) = (header_chunks[0], header_chunks[1]);

        let content_chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(32), // Left
                Constraint::Percentage(68), // Right
            ])
            .split(main_chunks[1]);

        let left_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage(68), // Menu
                Constraint::Percentage(16), // Detected
                Constraint::Percentage(8),  // Generated
                Constraint::Percentage(8),  // Linux
            ])
            .split(content_chunks[0]);

        let right_chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(8), // Overview
                Constraint::Min(1),    // Logs
            ])
            .split(content_chunks[1]);

        Self {
            c420ui_header,
            project_header,
            menu: left_chunks[0],
            detected_installations: left_chunks[1],
            generated_artifacts: left_chunks[2],
            linux_artifacts: left_chunks[3],
            overview: right_chunks[0],
            logs: right_chunks[1],
            progress,
            footer,
            mode,
        }
    }
}
