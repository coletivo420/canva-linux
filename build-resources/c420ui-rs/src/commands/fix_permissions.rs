use crate::host::safe_paths::resolve_safe_target;
use crate::host::sudo::run_sudo;
use crate::input::FixPermissionsInput;
use crate::json::CommandEnvelope;
use serde::Serialize;

#[derive(Serialize)]
struct UpdatedTarget {
    target: String,
    status: &'static str,
}

#[derive(Serialize)]
struct FixPermissionsData {
    updated: Vec<UpdatedTarget>,
}

fn ownership_arg(user: &str, group: Option<&str>) -> Result<String, String> {
    let user = user.trim();
    if user.is_empty() {
        return Err("user must not be empty".to_string());
    }
    if user.contains(':') {
        return Err("user must not contain ':'".to_string());
    }
    match group.map(str::trim).filter(|value| !value.is_empty()) {
        Some(group) => {
            if group.contains(':') {
                return Err("group must not contain ':'".to_string());
            }
            Ok(format!("{}:{}", user, group))
        }
        None => Ok(user.to_string()),
    }
}

pub fn execute() -> Result<(), String> {
    let input: FixPermissionsInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    let owner = ownership_arg(&input.user, input.group.as_deref())?;
    let mut updated = Vec::new();

    for target in input.targets {
        let (root, absolute) = resolve_safe_target(&input.root_dir, &target)?;
        if !absolute.exists() {
            updated.push(UpdatedTarget {
                target,
                status: "missing",
            });
            continue;
        }
        if input.dry_run {
            updated.push(UpdatedTarget {
                target,
                status: "planned",
            });
            continue;
        }

        let args = vec![
            "-R".to_string(),
            owner.clone(),
            absolute.to_string_lossy().to_string(),
        ];
        let status = run_sudo(&root, false, "chown", &args)?;
        if status != 0 {
            return Err(format!(
                "sudo chown failed for {} with status {}",
                target, status
            ));
        }
        updated.push(UpdatedTarget {
            target,
            status: "updated",
        });
    }

    let envelope = CommandEnvelope {
        ok: true,
        command: "fix-permissions",
        version: "0.1.0",
        data: FixPermissionsData { updated },
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
