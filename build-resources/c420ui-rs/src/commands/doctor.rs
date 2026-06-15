use crate::json::CommandEnvelope;
use serde::Serialize;

#[derive(Serialize)]
pub struct DoctorInfo {
    pub checks: Vec<DoctorCheck>,
}

#[derive(Serialize)]
pub struct DoctorCheck {
    pub id: &'static str,
    pub ok: bool,
    pub message: &'static str,
}

pub fn execute(json_flag: bool) -> Result<(), &'static str> {
    if !json_flag {
        return Err("dry run / non-JSON output for doctor not implemented");
    }

    let data = DoctorInfo {
        checks: vec![DoctorCheck {
            id: "host",
            ok: true,
            message: "c420ui Rust host is available",
        }],
    };

    let envelope = CommandEnvelope {
        ok: true,
        command: "doctor",
        version: "0.1.0",
        data,
    };

    match serde_json::to_string_pretty(&envelope) {
        Ok(json) => {
            println!("{}", json);
            Ok(())
        }
        Err(_) => Err("Failed to serialize doctor response"),
    }
}
