use std::fs::{self, File};
use std::io::{self, BufReader, BufWriter, Write};
use std::path::Path;
use std::sync::Arc;
use futures::{stream, StreamExt};
use reqwest::Client;
use sqlx::{Pool, Sqlite};
use tauri::{AppHandle, State};
use crate::types::{DownloadInformation, DownloadRequest, DownloadRequestMessage, DownloadServerOutput, FileChunk, ReqwestError};
use crate::util::{delete_trash, get_cache_dir, get_trash_dir};
use crate::util::{get_current_server, get_project_dir};
use tauri::Emitter;
use tokio::sync::Mutex;

const CONCURRENT_SERVER_REQUESTS: usize = 6;
const CONCURRENT_AWS_REQUESTS: usize = 6;

#[tauri::command]
pub async fn download_files(pid: i32, files: Vec<DownloadRequestMessage>, user: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>, app_handle: AppHandle) -> Result<bool, ReqwestError> {
    let pool = state_mutex.lock().await;
    let server_url = get_current_server(&pool).await.unwrap();
    let project_dir = get_project_dir(pid, &pool).await.unwrap();
    let cache_dir = get_cache_dir(&pool).await.unwrap();
    let trash_dir = get_trash_dir(&pool).await.unwrap();

    if project_dir == "" || cache_dir == "" || server_url == "" || trash_dir == "" {
        println!("download files: project or cache dir is invalid");
        return Ok(false);
    }

    // sort files into delete and download piles
    let mut to_download: Vec<DownloadRequestMessage> = Vec::new();
    let mut to_copy: Vec<DownloadRequestMessage> = Vec::new();
    let mut to_delete: Vec<DownloadRequestMessage> = Vec::new();
    for file in files.clone() {
        if file.download {
            let cached_path = cache_dir.clone() + "\\" + &file.hash;

            to_copy.push(file.clone());
            if verify_cache(&cached_path).unwrap() {
                println!("hash exists in cache");
                //let _ = app_handle.emit("downloadedFile", 4);
            }
            else {
                to_download.push(file.clone());
            }
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
            let auth = user.clone();
            let g_client = &glassy_client;
            async move {
                // send a request for the chunk urls, await
                let body: DownloadRequest = DownloadRequest {
                    project_id: pid.to_owned().into(),
                    path: download.rel_path,
                    commit_id: download.commit_id,
                    user_id: auth
                };
                let response = g_client
                    .post(cloned_endpoint)
                    .json(&body)
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
    let error_flag = Arc::new(Mutex::new(false));
    let moved_error_flag = Arc::clone(&error_flag);
    outputs.for_each(|output| {
        let cloned_boi = Arc::clone(&moved_chunk_downloads);
        let cloned_error_flag = Arc::clone(&moved_error_flag);
        let cache = cache_dir.clone();
        async move {
            let mut error = cloned_error_flag.lock().await;
            if output.response == "success" {
                let info = output.body.unwrap();
                let _ = save_filechunkmapping(&cache, &info).unwrap();
                for chunk in info.file_chunks {
                    cloned_boi.lock().await.push(chunk);
                }
            }
            else {
                *error = false;
                println!("error TODO something L159 download.rs: response= {}", output.response);
            }
        }
    }).await;

    if *error_flag.lock().await {
        println!("issue getting download link");
        return Ok(false);
    }

    let num_chunks = chunk_downloads.lock().await.len();
    println!("s3 urls obtained, downloading {} chunks...", num_chunks);
    
    // download chunks
    let copy = (*chunk_downloads).lock().await.clone();
    let aws_client: Client = reqwest::Client::new();
    let _ = stream::iter(copy.into_iter())
        .for_each_concurrent(CONCURRENT_AWS_REQUESTS, |chunk_info| {
            let cloned_error_flag = Arc::clone(&moved_error_flag);
            let handle = &app_handle;
            let client = &aws_client;
            // create cache_dir/file_hash directory
            let filehash_dir = cache_dir.clone() + "\\" + chunk_info.file_hash.as_str();
            async move {
                let res = download_with_client(&filehash_dir, chunk_info, client).await;
                let mut error = cloned_error_flag.lock().await;
                let _ = match res {
                    Ok(_) => {
                        let _ = handle.emit("downloadedFile", &num_chunks);
                    },
                    Err(err) => {
                        *error = true;
                        println!("error downloading file {}", err);
                    }
                };
            }
        }).await;

    if *error_flag.lock().await {
        println!("issue downloading file from s3");
        return Ok(false);
    }

    // verify the chunks exist
    for file in to_copy.clone() {
        let cache_str = cache_dir.clone() + "\\" + file.hash.as_str();
        let res = verify_cache(&cache_str).unwrap();
        if !res {
            println!("verifying cache failed: {}", file.hash);
            return Ok(false);
        }
    }

    // delete files
    let _ = app_handle.emit("cacheComplete", 4);

    let mut deleted = Vec::<DownloadRequestMessage>::new();
    let mut error_flag = false;
    for file in to_delete {
        let proj_path = project_dir.clone() + "\\" + file.rel_path.as_str();
        if !trash_file(&proj_path, &trash_dir, file.clone().hash).unwrap() {
            error_flag = true;
            break;
        } else {
            deleted.push(file);
        }
    }

    // if we failed to delete a file, undo delete and return early
    if error_flag {
        for file in deleted {
            let proj_dir = project_dir.clone() + "\\" + file.rel_path.as_str();
            let _ = recover_file(&trash_dir, &proj_dir).unwrap();
        }
        return Ok(false);
    }
    else {
        let _ = delete_trash(&pool).await.unwrap();
    }

    // copy over files in cache to project
    let mut oops = 0;
    for file in to_copy {
        // find the hash in the cache and copy to rel path
        let cache_str = cache_dir.clone() + "\\" + file.hash.as_str();
        let proj_str = project_dir.clone() + "\\" + file.rel_path.as_str();
        match Path::new(&cache_str).try_exists() {
            Ok(res) => {
                if res {
                    let prefix = Path::new(&proj_str).parent().unwrap();
                    fs::create_dir_all(prefix).unwrap();
                    // assemble file from chunk(s)
                    let res = assemble_file(&cache_str, &proj_str).unwrap();
                    if !res {
                        // failure
                        // how do we want to handle this? because we've already started copying files into project
                        // TODO
                    }
                }
                else {
                    println!("file {} not found in cache", cache_str);
                    oops += 1;
                    continue;
                }
            },
            Err(err) => {
                println!("error copying file: {}", err);
                oops += 1;
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

pub async fn download_with_client(dir: &String, chunk_download: FileChunk, client: &Client) -> Result<bool, ReqwestError> {
    let resp = match client
        .get(chunk_download.s3_url)
        .send()
        .await?
        .bytes()
        .await {
            Ok(r) => r,
            Err(err) => {
                println!("error downloading from s3: {}", err);
                return Ok(false);
            }
        };

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
pub fn save_filechunkmapping(cache_dir: &String, download: &DownloadInformation) -> Result<bool, ()> {
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
pub fn assemble_file(cache_dir: &String, proj_path: &String) -> Result<bool, ()> {
    // read in mapping.json
    let mapping: Vec<FileChunk> = match read_mapping(cache_dir) {
        Ok(map) => map,
        Err(_err) => {
            println!("error reading mapping for {}", cache_dir);
            Vec::<FileChunk>::new()
        }
    };

    if mapping.len() == 1 {
        // nothing to do, just copy the file
        let cache_path = cache_dir.to_owned() + "\\" + &mapping[0].block_hash;
        let _ = fs::copy(cache_path, proj_path);
        return Ok(true);
    }
    else if mapping.len() == 0 {
        println!("assemble file: empty mapping for {}", cache_dir);
        return Ok(false);
    }
    else {
        // otherwise we need to assemble the file
        let proj_file = match File::create(proj_path) {
            Ok(file) => file,
            Err(err) => {
                println!("error creating project file {}", err);
                return Ok(false);
            }
        };
        let mut writer = BufWriter::new(proj_file);
        for chunk in mapping {
            let cache_path = cache_dir.to_owned() + "\\" + &chunk.block_hash;
            let chunk_data = match fs::read(cache_path.clone()) {
                Ok(data) => data,
                Err(err) => {
                    println!("error reading chunk data from {}: {}", cache_path, err);
                    return Ok(false);
                }
            };
            let _ = writer.write_all(&chunk_data);
        }

        let _ = writer.flush();
    }
    Ok(true)
}

// cache dir should be the folder for the file in the cache dir
pub fn verify_cache(hash_dir: &String) -> Result<bool, ()> {
    // check existence of folder
    match Path::new(&hash_dir).try_exists() {
        Ok(result) => {
            if !result {
                return Ok(false);
            }
        },
        Err(err) => {
            println!("hash folder doesn't exist {}: {}", hash_dir, err);
            return Ok(false);
        }
    };

    // read mapping.json
    let mapping = match read_mapping(hash_dir) {
        Ok(mapping) => {
            if mapping.len() == 0 {
                // ???
                return Ok(false);
            }
            mapping
        },
        Err(_) => {
            println!("error reading mapping.json: {}", hash_dir);
            return Ok(false);
        }
    };

    // check existence of chunks
    for chunk in mapping {
        let cache_path = hash_dir.to_owned() + "\\" + &chunk.block_hash;
        match Path::new(&cache_path).try_exists() {
            Ok(result) => {
                if !result {
                    return Ok(false);
                }
            },
            Err(err) => {
                println!("err verifying cache {}: {}", hash_dir, err);
                return Ok(false);
            }
        };
    }

    Ok(true)
}

fn read_mapping(hash_dir: &String) -> Result<Vec<FileChunk>, ()> {
    let mapping_path = hash_dir.to_owned() + "\\mapping.json";

    let map_file = match File::open(&mapping_path) {
        Ok(file) => {
            file
        },
        Err(err) => {
            println!("read_mapping error: {}", err);
            return Err(());
        }
    };
    let reader = BufReader::new(map_file);
    let mapping: Vec<FileChunk> = match serde_json::from_reader(reader) {
        Ok(map) => {
            map
        },
        Err(err) => {
            println!("read_mapping error: {}", err);
            return Err(());
        }
    };

    Ok(mapping)
}

// assumes trash dir exists
pub fn trash_file(proj_dir: &String, trash_dir: &String, hash: String) -> Result<bool, ()> {
    let trash_path = trash_dir.to_owned() + "\\" + hash.as_str();
    match fs::rename(proj_dir, trash_path) {
        Ok(_) => {
            Ok(true)
        },
        Err(err) => {
            println!("trash_file error: {}", err);
            Ok(false)
        }
    }
}

// trash dir should be the path to the hash in the trash
pub fn recover_file(trash_dir: &String, proj_dir: &String) -> Result<bool, ()> {
    match fs::rename(trash_dir, proj_dir) {
        Ok(_) => {
            Ok(true)
        },
        Err(err) => {
            println!("recover_file error: {}", err);
            Ok(false)
        }
    }
}