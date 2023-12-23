use thiserror;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct LocalCADFile {
    pub path: String,
    pub size: u64,
    pub hash: String
}

#[derive(Serialize, Deserialize)]
pub struct DownloadFile {
    pub rel_path: String,
    pub size: u64
}

#[derive(Serialize, Deserialize)]
pub struct DownloadInformation {
  pub s3Url: String, // this is not snake_case because the server returns in camelCase
  pub key: String
}

#[derive(Clone, Serialize)]
pub struct DownloadStatusPayload {
    pub downloaded: u32,
    pub total: u32,
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

#[derive(Serialize, Deserialize)]
pub struct Change {
    pub path: String,
    pub size: u64,
    pub hash: String,
    pub change: u64
}

#[derive(Serialize, Deserialize)]
pub struct S3FileLink {
    pub path: String,
    pub url: String,
    pub key: String
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
  where
    S: serde::ser::Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}
