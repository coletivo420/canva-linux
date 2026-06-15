use crate::input::InputNode;

pub enum NodeCheckResult {
    Success,
    Failed { message: String },
}

pub fn check_node(node_config: &InputNode) -> NodeCheckResult {
    if let Some(true) = node_config.required {
        let current_version = match &node_config.version {
            Some(v) => v,
            None => {
                return NodeCheckResult::Failed {
                    message: "Node.js version not provided in input.".to_string(),
                };
            }
        };

        let current_major = match crate::host::node_version::parse_major_version(current_version) {
            Some(major) => major,
            None => {
                return NodeCheckResult::Failed {
                    message: format!("Failed to parse Node.js version: '{}'.", current_version),
                };
            }
        };

        if let Some(min_major) = node_config.minimum_major {
            if current_major < min_major {
                return NodeCheckResult::Failed {
                    message: format!(
                        "Node.js major version {} or newer is required. Current version: {}.",
                        min_major, current_version
                    ),
                };
            }
        }
    }

    NodeCheckResult::Success
}
