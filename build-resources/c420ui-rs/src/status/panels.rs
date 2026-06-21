use crate::status::artifacts::{generated_artifacts, loading_generated_artifacts};
use crate::status::contracts::{
    StatusPanel, StatusPanels, StatusPanelsRequest, StatusPanelsResponse,
};
use crate::status::detection::{detected_installations, loading_installations};
use crate::status::overview::{content_lines, linux_artifacts, loading_linux_artifacts};

pub fn build_status_panels(request: StatusPanelsRequest) -> StatusPanelsResponse {
    let _ = (&request.root_dir, &request.project_config_root);
    let overview = request.overview_status.as_ref();
    let panels = match overview {
        Some(value) if !value.is_null() => StatusPanels {
            detected_installations: StatusPanel::new(
                "Detected Installations",
                detected_installations(value),
            ),
            generated_artifacts: StatusPanel::new(
                "Generated Artifacts",
                generated_artifacts(value),
            ),
            linux_artifacts: StatusPanel::new("Linux Artifacts", linux_artifacts(value)),
            content: StatusPanel::new("Overview", content_lines(Some(value))),
        },
        _ => StatusPanels {
            detected_installations: StatusPanel::new(
                "Detected Installations",
                loading_installations(),
            ),
            generated_artifacts: StatusPanel::new(
                "Generated Artifacts",
                loading_generated_artifacts(),
            ),
            linux_artifacts: StatusPanel::new("Linux Artifacts", loading_linux_artifacts()),
            content: StatusPanel::new("Overview", content_lines(None)),
        },
    };

    StatusPanelsResponse {
        ok: true,
        command: "status-panels",
        panels,
        diagnostics: vec![],
    }
}
