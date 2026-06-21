use crate::tui::contracts::TuiColors;
use ratatui::style::Color;

pub struct LegacyTheme {
    pub light_blue: Color,
    pub blue: Color,
    pub purple: Color,
    pub success: Color,
    pub warning: Color,
    pub error: Color,
    pub text: Color,
    pub muted: Color,
    pub background: Color,
    pub surface: Color,
    pub surface_alt: Color,
    pub menu_selected_bg: Color,
    pub menu_selected_fg: Color,
    pub menu_inactive_selected_bg: Color,
    pub menu_inactive_selected_fg: Color,
    pub active_border: Color,
    pub inactive_border: Color,
    pub active_label: Color,
    pub inactive_label: Color,
    pub active_cell_bg: Color,
    pub active_cell_fg: Color,
    pub footer_bg: Color,
    pub footer_fg: Color,
}

impl LegacyTheme {
    pub fn from_contract(colors: &TuiColors) -> Self {
        Self {
            light_blue: parse_color(&colors.light_blue),
            blue: parse_color(&colors.blue),
            purple: parse_color(&colors.purple),
            success: parse_color(&colors.success),
            warning: parse_color(&colors.warning),
            error: parse_color(&colors.error),
            text: parse_color(&colors.text),
            muted: parse_color(&colors.muted),
            background: parse_color(&colors.background),
            surface: parse_color(&colors.surface),
            surface_alt: parse_color(&colors.surface_alt),
            menu_selected_bg: parse_color(&colors.menu_selected_bg),
            menu_selected_fg: parse_color(&colors.menu_selected_fg),
            menu_inactive_selected_bg: parse_color(&colors.menu_inactive_selected_bg),
            menu_inactive_selected_fg: parse_color(&colors.menu_inactive_selected_fg),
            active_border: parse_color(&colors.active_border),
            inactive_border: parse_color(&colors.inactive_border),
            active_label: parse_color(&colors.active_label),
            inactive_label: parse_color(&colors.inactive_label),
            active_cell_bg: parse_color(&colors.active_cell_bg),
            active_cell_fg: parse_color(&colors.active_cell_fg),
            footer_bg: parse_color(&colors.footer_bg),
            footer_fg: parse_color(&colors.footer_fg),
        }
    }
}

fn parse_color(value: &str) -> Color {
    let value = value.trim();
    match value {
        "black" => return Color::Black,
        "red" => return Color::Red,
        "green" => return Color::Green,
        "yellow" => return Color::Yellow,
        "blue" => return Color::Blue,
        "magenta" => return Color::Magenta,
        "cyan" => return Color::Cyan,
        "gray" | "grey" => return Color::Gray,
        "white" => return Color::White,
        _ => {}
    }

    let hex = value.trim_start_matches('#');
    if hex.len() == 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
        Color::Rgb(r, g, b)
    } else {
        Color::Reset
    }
}
