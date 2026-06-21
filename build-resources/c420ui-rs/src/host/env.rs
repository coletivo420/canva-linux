use std::collections::HashMap;

pub fn process_env(env: &Option<HashMap<String, String>>) -> Vec<(String, String)> {
    env.as_ref()
        .map(|values| {
            values
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect()
        })
        .unwrap_or_default()
}
