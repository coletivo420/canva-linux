use super::contracts::{TuiFocusZone, TuiProgress, TuiRenderInput, TuiView};

#[derive(Debug, Clone)]
pub struct PendingRootRequest {
    pub request_id: String,
    pub action_id: String,
    pub reason: String,
    pub attempts: u8,
}

#[derive(Debug)]
pub struct TuiRuntimeState {
    pub render: TuiRenderInput,
    pub status: Option<String>,
    pub pending_root_request: Option<PendingRootRequest>,
    pub modal_input: String,
    pub menu_scroll: u16,
    pub diagnostics_scroll: u16,
    pub content_scroll: u16,
    pub logs_scroll: u16,
    pub running_action: Option<String>,
    pub pending_interrupt_confirmation: bool,
}

impl TuiRuntimeState {
    pub fn new(render: TuiRenderInput) -> Self {
        Self {
            render,
            status: None,
            pending_root_request: None,
            modal_input: String::new(),
            menu_scroll: 0,
            diagnostics_scroll: 0,
            content_scroll: 0,
            logs_scroll: 0,
            running_action: None,
            pending_interrupt_confirmation: false,
        }
    }

    pub fn replace_render(&mut self, mut render: TuiRenderInput) {
        if self.render.view == render.view {
            render.focus_zone = self.render.focus_zone.clone();
            if !render.menu.items.is_empty() {
                render.menu.selected = self.render.menu.selected.min(render.menu.items.len() - 1);
            }
        } else {
            self.reset_scroll_on_view_change();
        }
        if self.render.modal.is_some() && render.modal.is_none() {
            render.modal = self.render.modal.take();
        }
        self.render = render;
    }

    pub fn selected_action_id(&self) -> Option<String> {
        self.render
            .menu
            .items
            .get(self.render.menu.selected)
            .and_then(|item| item.action_id.clone())
    }

    pub fn select_next(&mut self) {
        if self.render.menu.items.is_empty() {
            self.render.menu.selected = 0;
            return;
        }
        self.render.menu.selected =
            (self.render.menu.selected + 1).min(self.render.menu.items.len() - 1);
        self.menu_scroll = self.render.menu.selected.saturating_sub(1) as u16;
    }

    pub fn select_previous(&mut self) {
        self.render.menu.selected = self.render.menu.selected.saturating_sub(1);
        self.menu_scroll = self.render.menu.selected.saturating_sub(1) as u16;
    }

    pub fn enter_selected(&mut self) -> Option<String> {
        let item = self.render.menu.items.get(self.render.menu.selected)?;
        if self.render.view == TuiView::Help && item.view != Some(TuiView::Main) {
            return None;
        }
        if let Some(view) = &item.view {
            self.render.view = view.clone();
            self.render.menu.selected = 0;
            self.reset_scroll_on_view_change();
            None
        } else if self.render.view == TuiView::Settings {
            None
        } else {
            item.action_id.clone()
        }
    }

    pub fn go_back(&mut self) {
        if self.render.view != TuiView::Main {
            self.render.view = TuiView::Main;
            self.render.menu.selected = 0;
            self.reset_scroll_on_view_change();
        }
    }

    pub fn open_help(&mut self) {
        if self.render.view != TuiView::Help {
            self.render.view = TuiView::Help;
            self.render.menu.selected = 0;
            self.reset_scroll_on_view_change();
        }
    }

    pub fn next_focus(&mut self) {
        self.render.focus_zone = match self.render.focus_zone {
            TuiFocusZone::Menu => TuiFocusZone::Diagnostics,
            TuiFocusZone::Diagnostics => TuiFocusZone::Content,
            TuiFocusZone::Content => TuiFocusZone::Logs,
            TuiFocusZone::Logs => TuiFocusZone::Menu,
        };
    }

    pub fn previous_focus(&mut self) {
        self.render.focus_zone = match self.render.focus_zone {
            TuiFocusZone::Menu => TuiFocusZone::Logs,
            TuiFocusZone::Logs => TuiFocusZone::Content,
            TuiFocusZone::Content => TuiFocusZone::Diagnostics,
            TuiFocusZone::Diagnostics => TuiFocusZone::Menu,
        };
    }

    pub fn set_progress(&mut self, progress: TuiProgress) {
        self.render.progress = Some(progress);
    }

    pub fn set_status(&mut self, status: impl Into<String>) {
        self.status = Some(status.into());
    }

    pub fn set_pending_root_request(
        &mut self,
        request_id: String,
        action_id: String,
        reason: String,
    ) {
        self.status = Some(format!("Root confirmation requested for {}", action_id));
        self.pending_root_request = Some(PendingRootRequest {
            request_id,
            action_id: action_id.clone(),
            reason: reason.clone(),
            attempts: 0,
        });
        self.render.modal = Some(super::contracts::TuiModal {
            kind: super::contracts::TuiModalKind::Input,
            title: "Administrator authorization".to_string(),
            message: format!(
                "{}\n\nEnter your sudo password to continue.\nReason: {}",
                action_id, reason
            ),
            dangerous: Some(false),
            secret: Some(true),
        });
        self.modal_input.clear();
    }

    pub fn take_pending_root_request(&mut self) -> Option<PendingRootRequest> {
        self.render.modal = None;
        self.pending_root_request.take()
    }

    pub fn pending_root_request(&self) -> Option<PendingRootRequest> {
        self.pending_root_request.clone()
    }

    pub fn root_request_succeeded(&mut self, request_id: &str) {
        if self
            .pending_root_request
            .as_ref()
            .is_some_and(|request| request.request_id == request_id)
        {
            self.pending_root_request = None;
            self.render.modal = None;
            self.modal_input.clear();
        }
    }

    pub fn root_request_failed(&mut self, request_id: &str, message: Option<String>) {
        if let Some(request) = self.pending_root_request.as_mut() {
            if request.request_id != request_id {
                return;
            }
            request.attempts = request.attempts.saturating_add(1);
            self.modal_input.clear();
            let remaining = 3u8.saturating_sub(request.attempts);
            if remaining == 0 {
                self.status = Some("Root access failed after 3 attempts.".to_string());
                self.pending_root_request = None;
                self.render.modal = None;
                return;
            }
            let warning = message.unwrap_or_else(|| "Root authentication failed.".to_string());
            self.render.modal = Some(super::contracts::TuiModal {
                kind: super::contracts::TuiModalKind::Input,
                title: "Administrator authorization".to_string(),
                message: format!(
                    "{}\n\n{}\nAttempts remaining: {}\n\nEnter your sudo password to continue.\nReason: {}",
                    request.action_id, warning, remaining, request.reason
                ),
                dangerous: Some(false),
                secret: Some(true),
            });
        }
    }

    pub fn set_exit_confirmation(&mut self) {
        self.render.modal = Some(super::contracts::TuiModal {
            kind: super::contracts::TuiModalKind::Confirm,
            title: "Exit Application".to_string(),
            message: "Exit c420ui?\n\nRunning actions will be canceled.".to_string(),
            dangerous: Some(false),
            secret: Some(false),
        });
    }

    pub fn clear_modal(&mut self) {
        self.render.modal = None;
        self.modal_input.clear();
    }

    pub fn is_exit_confirmation(&self) -> bool {
        self.pending_root_request.is_none()
            && self
                .render
                .modal
                .as_ref()
                .is_some_and(|modal| modal.kind == super::contracts::TuiModalKind::Confirm)
    }

    pub fn selected_setting_id(&self) -> Option<&str> {
        if self.render.view != TuiView::Settings {
            return None;
        }
        self.render
            .menu
            .items
            .get(self.render.menu.selected)
            .map(|item| item.id.as_str())
    }

    pub fn scroll_focused_panel(&mut self, delta: i16) {
        let max = self.focused_scroll_max();
        let offset = self.focused_scroll_mut();
        if delta.is_negative() {
            *offset = offset.saturating_sub(delta.unsigned_abs());
        } else {
            *offset = offset.saturating_add(delta as u16);
        }
        *offset = (*offset).min(max);
    }

    pub fn scroll_content_panel(&mut self, delta: i16) {
        let max = self.panel_scroll_max(&self.render.panels.content.lines);
        if delta.is_negative() {
            self.content_scroll = self.content_scroll.saturating_sub(delta.unsigned_abs());
        } else {
            self.content_scroll = self.content_scroll.saturating_add(delta as u16);
        }
        self.content_scroll = self.content_scroll.min(max);
    }

    pub fn scroll_focused_to_top(&mut self) {
        *self.focused_scroll_mut() = 0;
    }

    pub fn scroll_focused_to_bottom(&mut self) {
        *self.focused_scroll_mut() = self.focused_scroll_max();
    }

    pub fn reset_scroll_on_view_change(&mut self) {
        self.menu_scroll = 0;
        self.diagnostics_scroll = 0;
        self.content_scroll = 0;
        self.logs_scroll = 0;
    }

    fn focused_scroll_mut(&mut self) -> &mut u16 {
        match self.render.focus_zone {
            TuiFocusZone::Menu => &mut self.menu_scroll,
            TuiFocusZone::Diagnostics => &mut self.diagnostics_scroll,
            TuiFocusZone::Content => &mut self.content_scroll,
            TuiFocusZone::Logs => &mut self.logs_scroll,
        }
    }

    fn focused_scroll_max(&self) -> u16 {
        match self.render.focus_zone {
            TuiFocusZone::Menu => self.render.menu.items.len().saturating_sub(1) as u16,
            TuiFocusZone::Diagnostics => {
                let total = self.render.panels.detected_installations.lines.len()
                    + self.render.panels.generated_artifacts.lines.len()
                    + self.render.panels.linux_artifacts.lines.len();
                total.saturating_sub(1) as u16
            }
            TuiFocusZone::Content => self.panel_scroll_max(&self.render.panels.content.lines),
            TuiFocusZone::Logs => self.render.panels.logs.lines.len().saturating_sub(1) as u16,
        }
    }

    fn panel_scroll_max(&self, lines: &[String]) -> u16 {
        lines.len().saturating_sub(1) as u16
    }

    pub fn set_running_action(&mut self, action_id: String) {
        self.running_action = Some(action_id);
        self.pending_interrupt_confirmation = false;
    }

    pub fn clear_running_action(&mut self) {
        self.running_action = None;
        self.pending_interrupt_confirmation = false;
    }

    pub fn request_interrupt_confirmation(&mut self) {
        if let Some(action_id) = &self.running_action {
            self.pending_interrupt_confirmation = true;
            self.render.modal = Some(super::contracts::TuiModal {
                kind: super::contracts::TuiModalKind::Confirm,
                title: "Interrupt running action?".to_string(),
                message: format!(
                    "Action `{}` is still running.\n\nInterrupt it now?",
                    action_id
                ),
                dangerous: Some(true),
                secret: Some(false),
            });
        }
    }

    pub fn is_interrupt_confirmation(&self) -> bool {
        self.pending_interrupt_confirmation
            && self
                .render
                .modal
                .as_ref()
                .is_some_and(|modal| modal.kind == super::contracts::TuiModalKind::Confirm)
    }

    pub fn interrupt_action_id(&self) -> Option<String> {
        self.running_action.clone()
    }

    pub fn push_char(&mut self, c: char) {
        if self.render.modal.is_some() {
            self.modal_input.push(c);
        }
    }

    pub fn pop_char(&mut self) {
        if self.render.modal.is_some() {
            self.modal_input.pop();
        }
    }
}
