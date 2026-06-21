use crate::host::fs_ops::{is_permission_denied, remove_path};
use crate::host::safe_paths::resolve_safe_target;
use crate::host::sudo::run_sudo;
use crate::input::RemovePathsInput;
use crate::json::CommandEnvelope;
use serde::Serialize;

#[derive(Serialize)]
struct RemovedTarget {
    target: String,
    status: &'static str,
}

#[derive(Serialize)]
struct RemovePathsData {
    removed: Vec<RemovedTarget>,
}

pub fn execute() -> Result<(), String> {
    let input: RemovePathsInput = serde_json::from_reader(std::io::stdin())
        .map_err(|e| format!("Invalid JSON input: {}", e))?;
    let mut removed = Vec::new();

    for target in input.targets {
        let (root, absolute) = resolve_safe_target(&input.root_dir, &target)?;
        if !absolute.exists() {
            removed.push(RemovedTarget {
                target,
                status: "missing",
            });
            continue;
        }
        if input.dry_run {
            removed.push(RemovedTarget {
                target,
                status: "planned",
            });
            continue;
        }

        match remove_path(&absolute) {
            Ok(()) => removed.push(RemovedTarget {
                target,
                status: "removed",
            }),
            Err(error) if is_permission_denied(&error) && input.allow_sudo => {
                let args = vec!["-rf".to_string(), absolute.to_string_lossy().to_string()];
                let status = run_sudo(&root, false, "rm", &args)?;
                if status != 0 {
                    return Err(format!(
                        "sudo rm failed for {} with status {}",
                        target, status
                    ));
                }
                removed.push(RemovedTarget {
                    target,
                    status: "removed",
                });
            }
            Err(error) => return Err(format!("failed to remove {}: {}", target, error)),
        }
    }

    let envelope = CommandEnvelope {
        ok: true,
        command: "remove-paths",
        version: "0.1.0",
        data: RemovePathsData { removed },
    };
    println!("{}", serde_json::to_string_pretty(&envelope).unwrap());
    Ok(())
}
