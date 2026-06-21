use std::fs;
use std::path::{Path, PathBuf};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub fn find_command_in_path(command: &str, path_env: &str) -> Option<PathBuf> {
    let command_path = Path::new(command);
    if command_path.is_absolute() {
        if is_executable(command_path) {
            return Some(command_path.to_path_buf());
        }
        return None;
    }

    for dir in std::env::split_paths(path_env) {
        let full_path = dir.join(command);
        if is_executable(&full_path) {
            return Some(full_path);
        }
    }
    None
}

fn is_executable(path: &Path) -> bool {
    if let Ok(metadata) = fs::metadata(path) {
        if !metadata.is_file() {
            return false;
        }
        #[cfg(unix)]
        {
            let permissions = metadata.permissions();
            // Check if any executable bit is set (user, group, or other)
            return permissions.mode() & 0o111 != 0;
        }
        #[cfg(not(unix))]
        {
            return true;
        }
    }
    false
}
