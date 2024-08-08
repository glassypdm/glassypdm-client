use serde::{Deserialize, Serialize};
use thiserror;

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
    pub changetype: i32, // TODO use enum
    pub size: i32
}

#[derive(Debug, thiserror::Error)]
pub enum ReqwestError {
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
}

// we must also implement serde::Serialize
impl serde::Serialize for ReqwestError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::ser::Serializer, {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadInformation {
  pub status: String,
  pub hash: Option<String>,
  pub rel_path: Option<String>,
  pub commit_id: Option<i64>,
  pub url: Option<String>
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadRequestMessage {
    pub commit_id: i64,
    pub rel_path: String,
    pub hash: String,
    pub download: bool
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadRequest {
    pub project_id: i64,
    pub path: String,
    pub commit_id: i64
}