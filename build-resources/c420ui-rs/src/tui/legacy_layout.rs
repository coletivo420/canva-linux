use ratatui::layout::Rect;

const HEADER_GAP: u16 = 0;
const HEADER_BOX_HORIZONTAL_PADDING: u16 = 4;
const C420UI_HEADER_MIN_WIDTH: u16 = 28;
const PROJECT_HEADER_MIN_WIDTH: u16 = 40;

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
    pub fn compute(
        area: Rect,
        brand_lines: &[String],
        project_lines: &[String],
        c420ui_version_line: &str,
    ) -> Self {
        let c420ui_header_height = brand_lines.len() as u16 + 3;
        let project_header_height = 5;
        let c420ui_content_width = brand_lines
            .iter()
            .map(|line| line.len() as u16)
            .chain(std::iter::once(c420ui_version_line.len() as u16))
            .max()
            .unwrap_or(0);
        let project_content_width = project_lines
            .iter()
            .map(|line| line.len() as u16)
            .max()
            .unwrap_or(0);
        let c420ui_min_width =
            (c420ui_content_width + HEADER_BOX_HORIZONTAL_PADDING).max(C420UI_HEADER_MIN_WIDTH);
        let project_min_width =
            (project_content_width + HEADER_BOX_HORIZONTAL_PADDING).max(PROJECT_HEADER_MIN_WIDTH);
        let mode = if area.width >= c420ui_min_width + project_min_width {
            LegacyLayoutMode::SideBySide
        } else {
            LegacyLayoutMode::Stacked
        };

        let (c420ui_header, project_header, workspace_top) = match mode {
            LegacyLayoutMode::SideBySide => {
                let c420ui_width = c420ui_min_width.min(area.width);
                let project_width = area.width.saturating_sub(c420ui_width);
                (
                    Rect::new(area.x, area.y, c420ui_width, c420ui_header_height),
                    Rect::new(
                        area.x + c420ui_width,
                        area.y,
                        project_width,
                        project_header_height,
                    ),
                    c420ui_header_height.max(project_header_height) + HEADER_GAP,
                )
            }
            LegacyLayoutMode::Stacked => (
                Rect::new(area.x, area.y, area.width, c420ui_header_height),
                Rect::new(
                    area.x,
                    area.y + c420ui_header_height,
                    area.width,
                    project_header_height,
                ),
                c420ui_header_height + project_header_height + HEADER_GAP,
            ),
        };

        let reserved_footer_rows = 2;
        let workspace_height = area
            .height
            .saturating_sub(workspace_top)
            .saturating_sub(reserved_footer_rows)
            .max(1);
        let left_width = ((area.width as f32 * 0.32).floor() as u16)
            .max(18)
            .min(area.width.saturating_sub(1).max(1));
        let right_left = area.x + left_width;
        let right_width = area.width.saturating_sub(left_width).max(1);
        let workspace_y = area.y + workspace_top;
        let menu_height = ((workspace_height as f32 * 0.68).floor() as u16).max(3);
        let diagnostics_top = workspace_y + menu_height;
        let detection_panels_height = (area.height)
            .saturating_sub(diagnostics_top.saturating_sub(area.y))
            .saturating_sub(reserved_footer_rows)
            .max(10);
        let detected_height = ((detection_panels_height as f32 * 0.34).floor() as u16).max(6);
        let generated_height = ((detection_panels_height as f32 * 0.43).floor() as u16).max(3);
        let linux_height = detection_panels_height
            .saturating_sub(detected_height)
            .saturating_sub(generated_height)
            .max(3);
        let generated_top = diagnostics_top + detected_height;
        let linux_top = generated_top + generated_height;
        let content_height = ((workspace_height as f32 * 0.36).floor() as u16).max(3);
        let logs_top = workspace_y + content_height;
        let logs_height = area
            .height
            .saturating_sub(logs_top.saturating_sub(area.y))
            .saturating_sub(reserved_footer_rows)
            .max(3);
        let footer = Rect::new(
            area.x,
            area.y + area.height.saturating_sub(1),
            area.width,
            1,
        );
        let progress = Rect::new(right_left, footer.y.saturating_sub(1), right_width, 1);

        Self {
            c420ui_header,
            project_header,
            menu: Rect::new(area.x, workspace_y, left_width, menu_height),
            detected_installations: Rect::new(area.x, diagnostics_top, left_width, detected_height),
            generated_artifacts: Rect::new(area.x, generated_top, left_width, generated_height),
            linux_artifacts: Rect::new(area.x, linux_top, left_width, linux_height),
            overview: Rect::new(right_left, workspace_y, right_width, content_height),
            logs: Rect::new(right_left, logs_top, right_width, logs_height),
            progress,
            footer,
            mode,
        }
    }
}
