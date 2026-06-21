use std::fs;
use std::io;
use std::path::Path;

pub fn remove_path(path: &Path) -> io::Result<()> {
    let metadata = fs::symlink_metadata(path)?;
    if metadata.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
}

pub fn is_permission_denied(error: &io::Error) -> bool {
    matches!(error.kind(), io::ErrorKind::PermissionDenied)
}
