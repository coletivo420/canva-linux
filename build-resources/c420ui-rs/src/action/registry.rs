use crate::action::contracts::ActionDefinition;
use std::collections::HashSet;

pub struct ActionRegistry {
    actions: Vec<ActionDefinition>,
}

impl ActionRegistry {
    pub fn new(actions: Vec<ActionDefinition>) -> Result<Self, String> {
        let mut ids = HashSet::new();
        for action in &actions {
            if action.id.trim().is_empty() {
                return Err("Action id is required.".to_string());
            }
            if !ids.insert(action.id.clone()) {
                return Err(format!("Duplicate action id: {}", action.id));
            }
            if action.label.trim().is_empty() {
                return Err(format!("Action label is required: {}", action.id));
            }
        }
        Ok(Self { actions })
    }

    pub fn resolve_by_id(&self, action_id: &str) -> Option<&ActionDefinition> {
        self.actions
            .iter()
            .find(|action| action.id.as_str() == action_id)
    }

    pub fn resolve_by_cli_flag(&self, flag: &str) -> Option<&ActionDefinition> {
        self.actions
            .iter()
            .find(|action| action.cli_flags.iter().any(|candidate| candidate == flag))
    }
}
