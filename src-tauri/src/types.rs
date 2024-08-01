use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize, PartialEq)]
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

#[derive(Serialize, Deserialize)]
pub struct UpdatedFile {
    // relative
    pub path: String,
    pub hash: String,
    pub size: i32,
    pub change: ChangeType
}

#[derive(Serialize, Deserialize)]
pub struct RemoteFile {
    pub frid: i32,
    pub path: String,
    pub commitid: i32,
    pub hash: String,
    pub changetype: i32, // TODO changetype
    pub size: i32
}