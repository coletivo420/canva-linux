pub fn parse_major_version(version_str: &str) -> Option<u32> {
    let cleaned = version_str.trim().trim_start_matches('v');
    let part = cleaned.split('.').next()?;
    part.parse::<u32>().ok()
}
