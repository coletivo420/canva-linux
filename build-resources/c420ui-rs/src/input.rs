use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
pub struct InputNode {
    pub required: Option<bool>,
    #[serde(rename = "minimumMajor")]
    pub minimum_major: Option<u32>,
    pub version: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[allow(dead_code)]
pub struct InputCommand {
    pub id: String,
    pub command: String,
    pub required: Option<bool>,
    #[serde(rename = "requiredFor")]
    pub required_for: Option<Vec<String>>,
    #[serde(rename = "installHint")]
    pub install_hint: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CheckInput {
    pub node: Option<InputNode>,
    pub commands: Option<Vec<InputCommand>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Deserialize, Debug)]
pub struct RunProcessInput {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub cwd: String,
    pub env: Option<HashMap<String, String>>,
    #[allow(dead_code)]
    pub label: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct CancelInput {
    pub event: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RemovePathsInput {
    pub root_dir: String,
    #[serde(default)]
    pub targets: Vec<String>,
    #[serde(default)]
    pub dry_run: bool,
    #[serde(default)]
    pub allow_sudo: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FixPermissionsInput {
    pub root_dir: String,
    #[serde(default)]
    pub targets: Vec<String>,
    pub user: String,
    pub group: Option<String>,
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SudoValidateInput {
    pub root_dir: String,
    #[serde(default)]
    pub non_interactive: bool,
    pub timeout_seconds: Option<u64>,
    #[serde(default)]
    pub refuse_user_scope: bool,
    pub action_scope: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "kebab-case", tag = "kind")]
pub enum FsOperationInput {
    EnsureDir {
        path: String,
    },
    CopyTree {
        from: String,
        to: String,
    },
    CopyFile {
        from: String,
        to: String,
        mode: Option<u32>,
    },
    InstallFile {
        from: String,
        to: String,
        mode: Option<u32>,
    },
    WriteFile {
        path: String,
        content: String,
        mode: Option<u32>,
    },
    Remove {
        path: String,
        #[serde(default)]
        recursive: bool,
        #[serde(default)]
        force: bool,
    },
    Symlink {
        from: String,
        to: String,
        #[serde(default)]
        force: bool,
    },
    Chmod {
        path: String,
        mode: String,
        #[serde(default)]
        #[allow(dead_code)]
        recursive: bool,
    },
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FsOpsInput {
    pub root_dir: String,
    #[serde(default)]
    pub operations: Vec<FsOperationInput>,
    #[serde(default)]
    pub dry_run: bool,
    #[serde(default)]
    #[allow(dead_code)]
    pub allow_sudo: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EnsureLinuxUnpackedInput {
    pub dist_dir: String,
    pub canonical_name: String,
    pub candidate_contains: String,
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactFindInput {
    pub starts_with: String,
    pub ends_with: String,
    pub expect: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactFileOpsInput {
    pub dist_dir: String,
    #[serde(default)]
    pub cleanup: Vec<String>,
    pub find: Option<ArtifactFindInput>,
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardWriteInput {
    pub text: String,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub preferred_backends: Vec<String>,
}
