use serde::{Deserialize, Serialize};


pub enum ChangeType {
    NoChange = 0,
    Create,
    Update,
    Delete
}

#[derive(Serialize, Deserialize)]
pub struct SettingsOptions {
    pub local_dir: String,
    pub debug_active: i32
}