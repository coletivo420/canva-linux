use c420ui_rs::tui::contracts::*;
use c420ui_rs::tui::renderer;
use c420ui_rs::tui::state::TuiRuntimeState;
use ratatui::backend::TestBackend;
use ratatui::style::Color;
use ratatui::Terminal;

fn create_test_state() -> TuiRuntimeState {
    let colors = TuiColors {
        light_blue: "#00C4CC".to_string(),
        blue: "#007C89".to_string(),
        purple: "#7D2AE8".to_string(),
        success: "#00843D".to_string(),
        warning: "#E67E22".to_string(),
        error: "#EB001B".to_string(),
        text: "#FFFFFF".to_string(),
        muted: "#9EA1A2".to_string(),
        background: "#0E1318".to_string(),
        surface: "#181D23".to_string(),
        surface_alt: "#252B33".to_string(),
        menu_selected_bg: "#7D2AE8".to_string(),
        menu_selected_fg: "#FFFFFF".to_string(),
        menu_inactive_selected_bg: "#252B33".to_string(),
        menu_inactive_selected_fg: "#00C4CC".to_string(),
        active_border: "#00C4CC".to_string(),
        inactive_border: "#252B33".to_string(),
        active_label: "#FFFFFF".to_string(),
        inactive_label: "#9EA1A2".to_string(),
        active_cell_bg: "#00C4CC".to_string(),
        active_cell_fg: "#000000".to_string(),
        footer_bg: "#181D23".to_string(),
        footer_fg: "#9EA1A2".to_string(),
    };

    let render = TuiRenderInput {
        brand: TuiBrand {
            name: "c420ui".to_string(),
            version: "0.1.4".to_string(),
            hash: None,
            logo_lines: vec!["c420ui".to_string()],
        },
        project: TuiProject {
            name: "Example Project".to_string(),
            subtitle: Some("Workspace".to_string()),
            version: "0.1.4".to_string(),
            display_version: "0.1.4".to_string(),
            phase: None,
            hash: None,
            logo_lines: vec!["Example".to_string(), "Project".to_string()],
            release_notes: "Release notes".to_string(),
            app_id: "example.app".to_string(),
            executable_name: "example".to_string(),
            repository_url: "https://example.invalid/repo".to_string(),
            launcher_command: "example".to_string(),
        },
        view: TuiView::Main,
        focus_zone: TuiFocusZone::Menu,
        menu: TuiMenu {
            label: "Main Menu".to_string(),
            items: vec![
                TuiMenuItem {
                    id: "1".to_string(),
                    label: "Install".to_string(),
                    view: None,
                    action_id: Some("install".to_string()),
                    description: Some("Install the app".to_string()),
                    warning: None,
                    dangerous: None,
                    planned: None,
                },
                TuiMenuItem {
                    id: "2".to_string(),
                    label: "Development".to_string(),
                    view: Some(TuiView::Development),
                    action_id: None,
                    description: Some("Run development tasks".to_string()),
                    warning: None,
                    dangerous: None,
                    planned: None,
                },
            ],
            selected: 0,
        },
        panels: TuiPanels {
            detected_installations: TuiPanel {
                label: "Detected Installations".to_string(),
                lines: vec![],
            },
            generated_artifacts: TuiPanel {
                label: "Generated Artifacts".to_string(),
                lines: vec![],
            },
            linux_artifacts: TuiPanel {
                label: "Linux Artifacts".to_string(),
                lines: vec![],
            },
            content: TuiPanel {
                label: "Overview".to_string(),
                lines: vec![],
            },
            logs: TuiLogPanel {
                label: "Logs".to_string(),
                lines: vec![],
            },
        },
        footer: TuiFooter {
            text_selection_mode: false,
            items: vec![
                "Tab Focus".to_string(),
                "Enter Select".to_string(),
                "q Quit".to_string(),
            ],
        },
        progress: Some(TuiProgress {
            state: "running".to_string(),
            label: Some("Running tests".to_string()),
            percent: Some(50),
        }),
        modal: None,
        layout: None,
        theme: TuiTheme {
            supports_true_color: true,
            colors,
        },
    };

    TuiRuntimeState::new(render)
}

#[test]
fn test_render_120x36_contains_labels_and_footer() {
    let backend = TestBackend::new(120, 36);
    let mut terminal = Terminal::new(backend).unwrap();
    let state = create_test_state();

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    // Check panel labels
    assert!(text.contains("Main Menu"));
    assert!(text.contains("Detected Installations"));
    assert!(text.contains("Generated Artifacts"));
    assert!(text.contains("Linux Artifacts"));
    assert!(text.contains("Overview"));
    assert!(text.contains("Logs"));

    // Check footer keys
    assert!(text.contains("Tab Focus"));
    assert!(text.contains("Enter Select"));
    assert!(text.contains("q Quit"));

    // Check progress bar elements
    assert!(text.contains("Progress:"));
    assert!(text.contains("█"));
    assert!(text.contains("░"));
}

#[test]
fn test_render_root_modal() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.set_pending_root_request(
        "req1".to_string(),
        "install".to_string(),
        "Testing".to_string(),
    );

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    assert!(text.contains("Administrator authorization"));
    assert!(text.contains("Enter your sudo password to continue."));
    assert!(text.contains("[Enter] Submit"));
    assert!(text.contains("[Esc] Cancel"));
}

#[test]
fn test_render_exit_confirmation_modal() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.set_exit_confirmation();

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    assert!(text.contains("Exit Application"));
    assert!(text.contains("Exit c420ui?"));
    assert!(text.contains("[y/Enter] Confirm"));
    assert!(text.contains("[Esc/n] Cancel"));
}

#[test]
fn test_render_preserves_logos_and_action_description() {
    let backend = TestBackend::new(120, 36);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.render.view = TuiView::Install;
    state.render.panels.detected_installations.lines = vec![
        "  Native System: not detected".to_string(),
        "  Native User: v1.0.0".to_string(),
    ];

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    assert!(text.contains("c420ui"));
    assert!(text.contains("Example"));
    assert!(text.contains("Project"));
    assert!(text.contains("Install the app"));
    assert!(text.contains("Native System"));
    assert!(text.contains("not detected"));
}

#[test]
fn test_status_panel_colors_only_values() {
    let backend = TestBackend::new(120, 36);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.render.panels.detected_installations.lines =
        vec!["Native System: not detected".to_string()];

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let label_cell = find_first_cell(buffer, "Native System").expect("status label is rendered");
    let not_detected_cell =
        find_first_cell(buffer, "not detected").expect("not detected value is rendered");

    assert_eq!(label_cell.fg, Color::Rgb(255, 255, 255));
    assert_eq!(not_detected_cell.fg, Color::Rgb(230, 126, 34));

    state.render.panels.detected_installations.lines =
        vec!["Native User: 0.1.4-15.Dev.12".to_string()];
    let mut terminal = Terminal::new(TestBackend::new(120, 36)).unwrap();
    renderer::render(&mut terminal, &state).unwrap();
    let version_cell = find_first_cell(terminal.backend().buffer(), "0.1.4-15.Dev.12")
        .expect("version value is rendered");
    assert_eq!(version_cell.fg, Color::Rgb(0, 132, 61));
}

#[test]
fn test_linux_artifacts_wraps_long_names_and_marks_scroll() {
    let backend = TestBackend::new(160, 36);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.render.panels.linux_artifacts.lines = vec![
        "Arch: x86_64".to_string(),
        "AppImage: example-linux-0.1.4-15.Dev.12-x86_64.AppImage".to_string(),
        "Checksum: example-linux-0.1.4-15.Dev.12-x86_64.AppImage.sha256".to_string(),
        "linux-unpacked: linux-x86_64-unpacked".to_string(),
        "Flatpak Bundle: not detected".to_string(),
    ];

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    assert!(text.contains("x86_64"));
    assert!(!text.contains("x64"));
    assert!(text.contains("Linux Artifacts"));
}

#[test]
fn test_progress_colors_follow_state() {
    let mut state = create_test_state();
    state.render.progress = Some(TuiProgress {
        state: "warning".to_string(),
        label: Some("Partial".to_string()),
        percent: Some(40),
    });
    let mut terminal = Terminal::new(TestBackend::new(120, 36)).unwrap();
    renderer::render(&mut terminal, &state).unwrap();
    let warning_cell = find_first_cell(terminal.backend().buffer(), "Progress:")
        .expect("warning progress is rendered");
    assert_eq!(warning_cell.fg, Color::Rgb(230, 126, 34));

    state.render.progress = Some(TuiProgress {
        state: "success".to_string(),
        label: Some("Done".to_string()),
        percent: None,
    });
    let mut terminal = Terminal::new(TestBackend::new(120, 36)).unwrap();
    renderer::render(&mut terminal, &state).unwrap();
    let buffer = terminal.backend().buffer();
    let success_cell = find_first_cell(buffer, "Progress:").expect("success progress is rendered");
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();
    assert_eq!(success_cell.fg, Color::Rgb(0, 132, 61));
    assert!(text.contains("100%"));

    state.render.progress = Some(TuiProgress {
        state: "error".to_string(),
        label: Some("Failed".to_string()),
        percent: Some(20),
    });
    let mut terminal = Terminal::new(TestBackend::new(120, 36)).unwrap();
    renderer::render(&mut terminal, &state).unwrap();
    let error_cell =
        find_first_cell(terminal.backend().buffer(), "Progress:").expect("error progress");
    assert_eq!(error_cell.fg, Color::Rgb(235, 0, 27));
}

#[test]
fn test_interrupt_modal_renders_for_running_action() {
    let backend = TestBackend::new(80, 24);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.set_running_action("install-native".to_string());
    state.request_interrupt_confirmation();

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    assert!(text.contains("Interrupt running action?"));
    assert!(text.contains("install-native"));
    assert!(text.contains("[y/Enter] Confirm"));
}

#[test]
fn test_help_description_follows_selected_item_without_action() {
    let backend = TestBackend::new(120, 36);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.render.view = TuiView::Help;
    state.render.menu = TuiMenu {
        label: "Help".to_string(),
        selected: 2,
        items: vec![
            TuiMenuItem {
                id: "help-navigation".to_string(),
                label: "Navigation".to_string(),
                view: None,
                action_id: None,
                description: None,
                warning: None,
                dangerous: None,
                planned: None,
            },
            TuiMenuItem {
                id: "help-panels".to_string(),
                label: "Panels".to_string(),
                view: None,
                action_id: None,
                description: None,
                warning: None,
                dangerous: None,
                planned: None,
            },
            TuiMenuItem {
                id: "help-logs".to_string(),
                label: "Logs".to_string(),
                view: None,
                action_id: None,
                description: None,
                warning: None,
                dangerous: None,
                planned: None,
            },
        ],
    };
    state.render.panels.content.label = "Help".to_string();

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let text: String = buffer
        .content
        .iter()
        .map(|c| c.symbol().to_string())
        .collect();

    assert!(text.contains("Logs:"));
    assert!(text.contains("F5 copies logs"));
    assert!(!text.contains("Enter selects executable actions only outside Help"));
    assert_eq!(state.selected_action_id(), None);
}

#[test]
fn test_auto_render_menu_items_use_distinct_colors() {
    let backend = TestBackend::new(120, 36);
    let mut terminal = Terminal::new(backend).unwrap();
    let mut state = create_test_state();
    state.render.view = TuiView::Help;
    state.render.menu = TuiMenu {
        label: "Help".to_string(),
        selected: 1,
        items: vec![
            TuiMenuItem {
                id: "help-navigation".to_string(),
                label: "Navigation".to_string(),
                view: None,
                action_id: None,
                description: None,
                warning: None,
                dangerous: None,
                planned: None,
            },
            TuiMenuItem {
                id: "help-logs".to_string(),
                label: "Logs".to_string(),
                view: None,
                action_id: None,
                description: None,
                warning: None,
                dangerous: None,
                planned: None,
            },
            TuiMenuItem {
                id: "back-main".to_string(),
                label: "Back to Main".to_string(),
                view: Some(TuiView::Main),
                action_id: None,
                description: None,
                warning: None,
                dangerous: None,
                planned: None,
            },
        ],
    };

    renderer::render(&mut terminal, &state).unwrap();

    let buffer = terminal.backend().buffer();
    let logs_cell = find_first_cell(buffer, "Logs").expect("Logs menu item is rendered");
    let back_cell =
        find_first_cell(buffer, "Back to Main").expect("Back to Main menu item is rendered");

    assert_eq!(logs_cell.fg, Color::Rgb(0, 196, 204));
    assert_eq!(logs_cell.bg, Color::Rgb(37, 43, 51));
    assert_eq!(back_cell.fg, Color::Rgb(255, 255, 255));
    assert_ne!(logs_cell.fg, back_cell.fg);
}

fn find_first_cell<'a>(
    buffer: &'a ratatui::buffer::Buffer,
    needle: &str,
) -> Option<&'a ratatui::buffer::Cell> {
    for y in 0..buffer.area.height {
        let mut row = String::new();
        for x in 0..buffer.area.width {
            row.push_str(buffer.get(x, y).symbol());
        }
        if let Some(index) = row.find(needle) {
            return Some(buffer.get(index as u16, y));
        }
    }
    None
}
