use super::contracts::{TuiFocusZone, TuiProgress, TuiRenderInput, TuiView};

#[derive(Debug)]
pub struct PendingRootRequest {
    pub request_id: String,
    pub action_id: String,
    pub reason: String,
}

#[derive(Debug)]
pub struct TuiRuntimeState {
    pub render: TuiRenderInput,
    pub status: Option<String>,
    pub pending_root_request: Option<PendingRootRequest>,
    pub modal_input: String,
}

impl TuiRuntimeState {
    pub fn new(render: TuiRenderInput) -> Self {
        Self {
            render,
            status: None,
            pending_root_request: None,
            modal_input: String::new(),
        }
    }

    pub fn replace_render(&mut self, render: TuiRenderInput) {
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
    }

    pub fn select_previous(&mut self) {
        self.render.menu.selected = self.render.menu.selected.saturating_sub(1);
    }

    pub fn enter_selected(&mut self) -> Option<String> {
        let item = self.render.menu.items.get(self.render.menu.selected)?;
        if let Some(view) = &item.view {
            self.render.view = view.clone();
            self.render.menu.selected = 0;
            None
        } else {
            item.action_id.clone()
        }
    }

    pub fn go_back(&mut self) {
        if self.render.view != TuiView::Main {
            self.render.view = TuiView::Main;
            self.render.menu.selected = 0;
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
        });
        self.render.modal = Some(super::contracts::TuiModal {
            kind: super::contracts::TuiModalKind::Input,
            title: "Administrator authorization".to_string(),
            message: format!("Action: {}\nReason: {}", action_id, reason),
            dangerous: Some(true),
            secret: Some(true),
        });
        self.modal_input.clear();
    }

    pub fn take_pending_root_request(&mut self) -> Option<PendingRootRequest> {
        self.render.modal = None;
        self.pending_root_request.take()
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
