use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct LocalCADFile {
    pub path: String,
    pub size: u64,
    pub hash: String
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