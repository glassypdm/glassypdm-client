use serde::{Deserialize, Serialize};
use thiserror;

#[derive(Serialize, Deserialize, PartialEq, Clone, Copy)]
pub enum ChangeType {
    NoChange = 0,
    Create,
    Update,
    Delete,
}

impl PartialEq<ChangeType> for u32 {
    fn eq(&self, other: &ChangeType) -> bool {
        *self == *other as u32
    }
}

// Optionally, you might want the reverse comparison as well
impl PartialEq<u32> for ChangeType {
    fn eq(&self, other: &u32) -> bool {
        *self as u32 == *other
    }
}

#[derive(Serialize, Deserialize)]
pub struct SettingsOptions {
    pub local_dir: String,
    pub debug_active: i32,
}

#[derive(Serialize, Deserialize)]
pub struct UpdatedFile {
    pub path: String, // relative
    pub hash: String,
    pub size: i64,
    pub change: ChangeType,
    pub in_fs: bool
}

#[derive(Serialize, Deserialize)]
pub struct RemoteFile {
    pub frid: i32,
    pub path: String,
    pub commitid: i32,
    pub filehash: String,
    pub changetype: i32, // TODO use enum
    pub blocksize: i32,
}

#[derive(Debug, thiserror::Error)]
pub enum ReqwestError {
    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
}

// we must also implement serde::Serialize
impl serde::Serialize for ReqwestError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadServerOutput {
    pub response: String,
    pub body: Option<DownloadInformation>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadInformation {
    pub file_hash: String,
    pub file_path: String,
    pub commit_id: i64,
    pub file_chunks: Vec<FileChunk>,
}

#[derive(Clone, Serialize, Deserialize)]

pub struct FileChunk {
    pub s3_url: String,
    pub block_hash: String,
    pub chunk_index: i64,
    pub file_hash: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadRequestMessage {
    pub commit_id: i64,
    pub rel_path: String,
    pub hash: String,
    pub download: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadRequest {
    pub project_id: i64,
    pub path: String,
    pub commit_id: i64,
    pub user_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct LocalProject {
    pub pid: i32,
    pub title: String,
    pub team_name: String,
}