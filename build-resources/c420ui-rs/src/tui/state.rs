use super::contracts::{TuiProgress, TuiRenderInput};

#[derive(Debug)]
pub struct PendingRootRequest {
    pub request_id: String,
    pub action_id: String,
    pub reason: String,
}

#[derive(Debug)]
pub struct TuiRuntimeState {
    pub render: TuiRenderInput,
    pub selected: usize,
    pub status: Option<String>,
    pub pending_root_request: Option<PendingRootRequest>,
}

impl TuiRuntimeState {
    pub fn new(render: TuiRenderInput) -> Self {
        Self {
            render,
            selected: 0,
            status: None,
            pending_root_request: None,
        }
    }

    pub fn replace_render(&mut self, render: TuiRenderInput) {
        self.render = render;
        self.clamp_selection();
    }

    pub fn selected_action_id(&self) -> Option<String> {
        self.render
            .actions
            .get(self.selected)
            .map(|action| action.id.clone())
    }

    pub fn select_next(&mut self) {
        if self.render.actions.is_empty() {
            self.selected = 0;
            return;
        }
        self.selected = (self.selected + 1).min(self.render.actions.len() - 1);
    }

    pub fn select_previous(&mut self) {
        self.selected = self.selected.saturating_sub(1);
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
            action_id,
            reason,
        });
    }

    pub fn take_pending_root_request(&mut self) -> Option<PendingRootRequest> {
        self.pending_root_request.take()
    }

    fn clamp_selection(&mut self) {
        if self.render.actions.is_empty() {
            self.selected = 0;
        } else if self.selected >= self.render.actions.len() {
            self.selected = self.render.actions.len() - 1;
        }
    }
}
