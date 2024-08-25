use std::fs::{self, File};
use std::io::{self, BufReader, BufWriter, Write};
use std::path::Path;
use std::sync::Arc;
use futures::{stream, StreamExt};
use reqwest::Client;
use sqlx::{Pool, Sqlite, Row};
use tauri::{AppHandle, State};
use crate::types::{DownloadInformation, DownloadRequest, DownloadRequestMessage, DownloadServerOutput, FileChunk, ReqwestError};
use crate::util::get_cache_dir;
use crate::util::{get_current_server, get_project_dir};
use std::path::PathBuf;
use tauri::Emitter;
use tokio::sync::Mutex;

const CONCURRENT_SERVER_REQUESTS: usize = 2;
const CONCURRENT_AWS_REQUESTS: usize = 4;

#[tauri::command]
pub async fn delete_file_cmd(pid: i32, rel_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let output = delete_file(pid, rel_path.clone(), &pool).await.unwrap();

    if output {
        let _ = sqlx::query(
            "
            DELETE FROM file
            WHERE pid = $1 AND filepath = $2
            "
        )
        .bind(pid)
        .bind(rel_path)
        .execute(&*pool);
    }

    Ok(output)
}

pub async fn delete_file(pid: i32, rel_path: String, pool: &Pool<Sqlite>) -> Result<bool, ()> {
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    if project_dir == "" {
        return Ok(false);
    }
    let path = project_dir + "\\" + &rel_path;
    println!("{}", path);
    let _ = fs::remove_file(path);
    Ok(true)
}

// download a single file
// TODO fix
#[tauri::command]
pub async fn download_s3_file(pid: i32, s3_url: String, rel_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let mut resp = reqwest::blocking::get(s3_url).unwrap();

    // generate absolute path
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let path_str = project_dir + &rel_path;
    let path: &Path = std::path::Path::new(&path_str);

    // create necessary folders for path
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    // create file
    let mut f = match File::create(&path) {
        Ok(file) => file,
        Err(err) => {
            println!("Encountered error: {err}");
            return Ok(false);
            //panic!("unable to create file object for writing");
        }
    };
    io::copy(&mut resp, &mut f).expect("Unable to download data");

    // TODO write to database

    Ok(true)
}

#[tauri::command]
pub async fn download_files(pid: i32, files: Vec<DownloadRequestMessage>, token: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>, app_handle: AppHandle) -> Result<bool, ReqwestError> {
    let pool = state_mutex.lock().await;
    let server_url = get_current_server(&pool).await.unwrap();
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let cache_dir = get_cache_dir(&pool).await.unwrap();

    if project_dir == "" || cache_dir == "" || server_url == "" {
        println!("download files: project or cache dir is invalid");
        return Ok(false);
    }

    // sort files into delete and download piles
    let mut to_download: Vec<DownloadRequestMessage> = Vec::new();
    let mut to_delete: Vec<DownloadRequestMessage> = Vec::new();
    for file in files.clone() {
        if file.download {
            let _cached_path = cache_dir.clone() + "\\" + &file.hash;

            // TODO if we have the file in the cache already,
            // we should include it in the list to assemble and copy

            //if Path::new(&cached_path).exists() {
            //    println!("hash exists in cache");
            //    let payload = 4;
            //    let _ = app_handle.emit("downloadedFile", payload);
            //}
            //else {
                to_download.push(file.clone());
            //}
        }
        else {
            to_delete.push(file)
        }
    }

    // request S3 presigned urls
    let endpoint = server_url + "/store/download";
    let glassy_client: Client = reqwest::Client::new();
    let outputs = stream::iter(to_download.clone())
        .map(|download| {
            let cloned_endpoint = endpoint.clone();
            let auth = token.clone();
            let g_client = &glassy_client;
            async move {
                // send a request for the chunk urls, await
                let body: DownloadRequest = DownloadRequest {
                    project_id: pid.to_owned().into(),
                    path: download.rel_path,
                    commit_id: download.commit_id
                };
                let response = g_client
                    .post(cloned_endpoint)
                    .json(&body)
                    .bearer_auth(auth)
                    .send().await;
    
                match response {
                    Ok(res) => {
                        res.json::<DownloadServerOutput>().await.unwrap_or_else(
                            |_| DownloadServerOutput { response: "server error".to_string(), body: None })
                    },
                    Err(err) => {
                        println!("error: {}", err);
                        DownloadServerOutput { response: "reqwest error".to_string(), body: None }
                    }
                }
            }
        }).buffer_unordered(CONCURRENT_SERVER_REQUESTS);
    
    let chunk_downloads = Arc::new(Mutex::new(Vec::<FileChunk>::new()));
    let moved_chunk_downloads = Arc::clone(&chunk_downloads);
    outputs.for_each(|output| {
        let cloned_boi = Arc::clone(&moved_chunk_downloads);
        let cache = cache_dir.clone();

        async move {
            if output.response == "success" {
                let info = output.body.unwrap();
                let _ = save_filechunkmapping(&cache, &info);
                for chunk in info.file_chunks {
                    cloned_boi.lock().await.push(chunk);
                }
            }
            else {
                // TODO handle error
                println!("error TODO something L159 download.rs: response= {}", output.response);
            }
        }
    }).await;

    let num_chunks = chunk_downloads.lock().await.len();
    println!("s3 urls obtained, downloading {} chunks...", num_chunks);
    
    // download chunks
    let copy = (*chunk_downloads).lock().await.clone();
    let aws_client: Client = reqwest::Client::new();
    let _ = stream::iter(copy.into_iter())
        .for_each_concurrent(CONCURRENT_AWS_REQUESTS, |chunk_info| {
            let handle = &app_handle;
            let client = &aws_client;
            // create cache_dir/file_hash directory
            let filehash_dir = cache_dir.clone() + "\\" + chunk_info.file_hash.as_str();
            // download using download_with_Client
            async move {
                // TODO handle error
                let _res = download_with_client(&filehash_dir, chunk_info, client).await;
                let _ = handle.emit("downloadedFile", &num_chunks);
            }
        }).await;

    // delete files
    let _ = app_handle.emit("cacheComplete", 4);

    for file in to_delete {
        if !delete_file(pid, file.rel_path.clone(), &pool).await.unwrap() {
            // TODO handle error
        }
    }
    let mut oops = 0;
    for file in to_download {
        // find the hash in the cache and copy to rel path
        let cache_str = cache_dir.clone() + "\\" + file.hash.as_str();
        let proj_str = project_dir.clone() + "\\" + file.rel_path.as_str();
        match Path::new(&cache_str).try_exists() {
            Ok(res) => {
                if res {
                    let prefix = Path::new(&proj_str).parent().unwrap();
                    fs::create_dir_all(prefix).unwrap();
                    // assemble file from chunk(s)
                    let _ = assemble_file(&cache_str, &proj_str);
                }
                else {
                    println!("file {} not found in cache", cache_str);
                    oops += 1;
                    continue;
                    // TODO we should emit something
                }
            },
            Err(err) => {
                println!("error copying file: {}", err);
                oops += 1;
                // TODO we should emit something
                continue;
            }
        }
    }
    println!("download files: {} files not found in cache", oops);

    // update database (iterate over files parameter)
    for file in files {
        if file.download {
            // TODO instead of using the tracked values
            // should we compute them instead?
            let _ = sqlx::query(
                "
                UPDATE file SET
                base_hash = tracked_hash,
                curr_hash = tracked_hash,
                base_commitid = tracked_commitid,
                size = tracked_size,
                in_fs = 1,
                change_type = 0
                WHERE pid = $1 AND filepath = $2
                "
            )
            .bind(pid.clone())
            .bind(file.rel_path)
            .execute(&*pool).await;
        }
        else { // file.download == delete
            let _ = sqlx::query(
                "DELETE FROM file
                WHERE pid = $1 AND filepath = $2"
            )
            .bind(pid.clone())
            .bind(file.rel_path)
            .execute(&*pool).await;
        }
    }
    Ok(true)
}

// TODO error handle if client couldnt get
pub async fn download_with_client(dir: &String, chunk_download: FileChunk, client: &Client) -> Result<bool, ReqwestError> {
    let resp = client
        .get(chunk_download.s3_url)
        .send()
        .await?
        .bytes()
        .await?;

    // temp path: cache + hash(.glassy?)
    let path = dir.to_owned() + "\\" + &chunk_download.block_hash;
    println!("downloading to {}", path);

    // create cache folder if it doesnt exist
    let p: &Path = std::path::Path::new(&path);
    let prefix = p.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    // save to cache
    let mut f = File::create(&path).expect("Unable to create file");
    io::copy(&mut &resp[..], &mut f).expect("Unable to copy data");

    Ok(true)
}

// TODO refactor unwrap, lmao
fn save_filechunkmapping(cache_dir: &String, download: &DownloadInformation) -> Result<bool, ()> {
    // TODO linux support, create path the proper way
    let abs_path = cache_dir.to_owned() + "\\" + &download.file_hash + "\\mapping.json";
    let path: &Path = std::path::Path::new(&abs_path);
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let file = File::create(path).unwrap();
    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, &download.file_chunks).unwrap();
    writer.flush().unwrap();

    Ok(true)
}

// cache dir should be the folder for the file in the cache dir
// proj dir should be the complete path to the desired file and must exist
// TODO refactor unwrap
fn assemble_file(cache_dir: &String, proj_path: &String) -> Result<bool, ()> {
    // read in mapping.json
    let mapping_path = cache_dir.to_owned() + "\\mapping.json";
    let map_file = File::open(&mapping_path).unwrap();
    let reader = BufReader::new(map_file);
    let mapping: Vec<FileChunk> = serde_json::from_reader(reader).unwrap();

    if mapping.len() == 1 {
        // nothing to do, just copy the file
        let cache_path = cache_dir.to_owned() + "\\" + &mapping[0].block_hash;
        let _ = fs::copy(cache_path, proj_path);
        return Ok(true);
    }
    else if mapping.len() == 0 {
        println!("assemble file: mapping was 0 for {}", mapping_path);
        return Ok(false);
    }
    else {
        // otherwise we need to assemble the file
        let proj_file = File::create(proj_path).unwrap();
        let mut writer = BufWriter::new(proj_file);
        for chunk in mapping {
            let cache_path = cache_dir.to_owned() + "\\" + &chunk.block_hash;
            let chunk_data = fs::read(cache_path).unwrap();
            let _ = writer.write_all(&chunk_data);
            //let chunk_file = File::open(cache_path).unwrap();
            //let chunk_reader = BufReader::new(chunk_file);
        }

        let _ = writer.flush();
    }


    Ok(true)
}