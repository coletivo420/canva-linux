use serde::Serialize;

#[derive(Serialize)]
pub struct CommandEnvelope<T: Serialize> {
    pub ok: bool,
    pub command: &'static str,
    pub version: &'static str,
    #[serde(flatten)]
    pub data: T,
}
