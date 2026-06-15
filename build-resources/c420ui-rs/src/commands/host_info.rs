use crate::json::CommandEnvelope;
use serde::Serialize;

#[derive(Serialize)]
pub struct HostInfo {
    pub host: HostDetails,
}

#[derive(Serialize)]
pub struct HostDetails {
    pub os: &'static str,
    pub arch: &'static str,
}

pub fn execute(json_flag: bool) -> Result<(), &'static str> {
    if !json_flag {
        return Err("dry run / non-JSON output for host-info not implemented");
    }

    let data = HostInfo {
        host: HostDetails {
            os: std::env::consts::OS,
            arch: std::env::consts::ARCH,
        },
    };

    let envelope = CommandEnvelope {
        ok: true,
        command: "host-info",
        version: "0.1.0",
        data,
    };

    match serde_json::to_string_pretty(&envelope) {
        Ok(json) => {
            println!("{}", json);
            Ok(())
        }
        Err(_) => Err("Failed to serialize host-info response"),
    }
}
