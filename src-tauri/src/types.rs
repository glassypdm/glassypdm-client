use thiserror;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct LocalCADFile {
    pub path: String, // absolute
    pub size: u64,
    pub hash: String
}

#[derive(Serialize, Deserialize)]
pub struct DownloadFile {
    pub rel_path: String,
    pub size: u64
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadInformation {
  pub s3Url: String, // this is not snake_case because the server returns in camelCase
  pub key: String,
  pub relPath: String // likewise as above
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FileLink {
  pub key: String,
  pub rel_path: String // likewise as above
}

#[derive(Clone, Serialize)]
pub struct DownloadStatusPayload {
    pub s3: String,
    pub rel_path: String
}

// TODO better name
#[derive(Clone, Serialize)]
pub struct UploadStatusPayload {
    pub uploaded: u32,
    pub total: u32,
    pub s3: String,
    pub rel_path: String
}

// TODO use LocalCADFile to simplify this struct
#[derive(Serialize, Deserialize, Clone)]
pub struct Change {
    pub file: LocalCADFile,
    pub change: ChangeType
}

#[derive(Serialize, Deserialize)]
pub struct FileUploadStatus {
    pub result: bool,
    pub s3key: String
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

#[derive(Serialize, Deserialize)]
pub struct SyncOutput {
    pub upload: Vec<Change>,
    pub download: Vec<TrackedRemoteFile>,
    pub conflict: Vec<String>
}

#[derive(Serialize, Deserialize, PartialEq, Clone, Copy, Default)]
pub enum ChangeType {
  Create,
  Update,
  Delete,
  #[default]
  Unidentified,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RemoteFile {
    pub path: String, // relative
    pub commitid: u64,
    pub s3key: Option<String>,
    pub size: u64,
    pub hash: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TrackedRemoteFile {
  pub file: RemoteFile,
  pub change: ChangeType
}

#[derive(Clone, serde::Serialize)]
pub struct SingleInstancePayload {
  pub args: Vec<String>,
  pub cwd: String,
}
