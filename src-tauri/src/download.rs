use crate::config::get_cache_setting;
use crate::file::{sep, translate_filepath};
use crate::types::{
    DownloadInformation, DownloadRequest, DownloadRequestMessage, DownloadServerOutput, FileChunk,
    ReqwestError,
};
use crate::util::{delete_cache, delete_trash, get_cache_dir, get_trash_dir};
use crate::dal::DataAccessLayer;
use futures::{stream, StreamExt};
use log::{info, trace, warn};
use reqwest::Client;
use sqlx::{Pool, Sqlite};
use std::cmp::Ordering;
use std::collections::HashSet;
use std::fs::{self, remove_dir, File};
use std::io::{self, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::Emitter;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

const CONCURRENT_SERVER_REQUESTS: usize = 6;
const CONCURRENT_AWS_REQUESTS: usize = 6;

#[tauri::command]
pub async fn download_files(
    pid: i32,
    files: Vec<DownloadRequestMessage>,
    user: String,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
    app_handle: AppHandle,
) -> Result<bool, ReqwestError> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    let server_url = dal.get_current_server().await.unwrap();
    let project_dir = dal.get_project_dir(pid).await.unwrap();
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
            let cached_path = cache_dir.clone() + &(sep().to_string()) + &file.hash;

            to_copy.push(file.clone());
            if verify_cache(&cached_path).unwrap() {
                println!("hash exists in cache");
                //let _ = app_handle.emit("downloadedFile", 4);
            } else {
                to_download.push(file.clone());
            }
        } else {
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
                    user_id: auth,
                };
                let response = g_client.post(cloned_endpoint).json(&body).send().await;

                match response {
                    Ok(res) => res
                        .json::<DownloadServerOutput>()
                        .await
                        .unwrap_or_else(|_| DownloadServerOutput {
                            response: "server error".to_string(),
                            body: None,
                        }),
                    Err(err) => {
                        log::error!("error: {}", err);
                        DownloadServerOutput {
                            response: "reqwest error".to_string(),
                            body: None,
                        }
                    }
                }
            }
        })
        .buffer_unordered(CONCURRENT_SERVER_REQUESTS);

    let chunk_downloads = Arc::new(Mutex::new(Vec::<FileChunk>::new()));
    let moved_chunk_downloads = Arc::clone(&chunk_downloads);
    let error_flag = Arc::new(Mutex::new(false));
    let moved_error_flag = Arc::clone(&error_flag);
    outputs
        .for_each(|output| {
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
                } else {
                    *error = false;
                    log::error!(
                        "error TODO something L159 download.rs: response= {}",
                        output.response
                    );
                }
            }
        })
        .await;

    if *error_flag.lock().await {
        log::error!("issue getting download link");
        return Ok(false);
    }

    let num_chunks = chunk_downloads.lock().await.len();
    log::info!("s3 urls obtained, downloading {} chunks...", num_chunks);

    // download chunks
    let copy = (*chunk_downloads).lock().await.clone();
    let aws_client: Client = reqwest::Client::new();
    let _ = stream::iter(copy.into_iter())
        .for_each_concurrent(CONCURRENT_AWS_REQUESTS, |chunk_info| {
            let cloned_error_flag = Arc::clone(&moved_error_flag);
            let handle = &app_handle;
            let client = &aws_client;
            // create cache_dir/file_hash directory
            let filehash_dir = cache_dir.clone() + &(sep().to_string()) + chunk_info.file_hash.as_str();
            async move {
                let res = download_with_client(&filehash_dir, chunk_info, client).await;
                let mut error = cloned_error_flag.lock().await;
                let _ = match res {
                    Ok(_) => {
                        let _ = handle.emit("downloadedFile", &num_chunks);
                    }
                    Err(err) => {
                        *error = true;
                        log::error!("error downloading file {}", err);
                    }
                };
            }
        })
        .await;

    if *error_flag.lock().await {
        log::error!("issue downloading file from s3");
        return Ok(false);
    }

    // verify the chunks exist
    for file in to_copy.clone() {
        let cache_str = cache_dir.clone() + &(sep().to_string()) + file.hash.as_str();
        let res = verify_cache(&cache_str).unwrap();
        if !res {
            log::error!("verifying cache failed: {}", file.hash);
            return Ok(false);
        }
    }

    // delete files
    let _ = app_handle.emit("cacheComplete", 4);

    let mut deleted = Vec::<DownloadRequestMessage>::new();
    let mut error_flag = false;
    for file in to_delete.clone() {
        let proj_path = project_dir.clone() + &(sep().to_string()) + file.rel_path.as_str();
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
            let proj_dir = project_dir.clone() + &(sep().to_string()) + file.rel_path.as_str();
            let _ = recover_file(&trash_dir, &proj_dir).unwrap();
        }
        return Ok(false);
    } else {
        // sort to_delete by # of directories in path, descending
        let mut directories = Vec::from_iter(get_directories(&to_delete));
        directories.sort_by(|a, b| compare_directory_deep(a, b) );
        info!("deleting directories");
        
        for folder in directories {
            info!("{}", folder);
            let proj_dir = project_dir.clone() + &(sep().to_string()) + &folder;
            let path = PathBuf::from(proj_dir);
            // if file's folder is empty, delete it (ie use remove_dir() which will delete only if it is empty)
            match remove_dir(path) {
                Ok(()) => info!("successful delete"),
                Err(_e) => warn!("no delete")
            };
        }

        let _ = delete_trash(&pool).await.unwrap();
    }

    // copy over files in cache to project
    let mut oops = 0;
    for file in to_copy {
        // find the hash in the cache and copy to rel path
        let cache_str = cache_dir.clone() + &(sep().to_string()) + file.hash.as_str();
        let proj_str = project_dir.clone() + &(sep().to_string()) + file.rel_path.as_str();
        match Path::new(&cache_str).try_exists() {
            Ok(res) => {
                if res {
                    let prefix = Path::new(&proj_str).parent().unwrap();
                    fs::create_dir_all(prefix).unwrap();
                    // assemble file from chunk(s)
                    let res = assemble_file(&cache_str, &proj_str).unwrap();
                    if !res {
                        log::error!("error assembling file")
                        // failure
                        // how do we want to handle this? because we've already started copying files into project
                        // TODO
                    }
                } else {
                    println!("file {} not found in cache", cache_str);
                    oops += 1;
                    continue;
                }
            }
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
                ",
            )
            .bind(pid.clone())
            .bind(file.rel_path)
            .execute(&*pool)
            .await;
        } else {
            // file.download == delete
            let _ = dal.delete_file_entry(pid, file.rel_path).await;
        }
    }

    // if configured, delete cache
    let should_delete_cache = get_cache_setting(&pool).await.unwrap();
    if should_delete_cache {
        let _ = delete_cache(&pool).await;
    }

    Ok(true)
}

pub async fn download_with_client(
    dir: &String,
    chunk_download: FileChunk,
    client: &Client,
) -> Result<bool, ReqwestError> {
    let resp = match client
        .get(chunk_download.s3_url)
        .send()
        .await?
        .bytes()
        .await
    {
        Ok(r) => r,
        Err(err) => {
            println!("error downloading from s3: {}", err);
            return Ok(false);
        }
    };

    // temp path: cache + hash(.glassy?)
    let path = dir.to_owned() + &(sep().to_string()) + &chunk_download.block_hash;
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
pub fn save_filechunkmapping(
    cache_dir: &String,
    download: &DownloadInformation,
) -> Result<bool, ()> {
    let abs_path = cache_dir.to_owned() + &(sep().to_string()) + &download.file_hash + &(sep().to_string()) + "mapping.json";
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
    let file_path;
    #[cfg(target_os = "windows")]
    {
        file_path = proj_path.to_string();
    }
    #[cfg(target_os = "linux")]
    {
        file_path = translate_filepath(proj_path, true);
    }

    if mapping.len() == 1 {
        // nothing to do, just copy the file
        let cache_path = cache_dir.to_owned() + &(sep().to_string()) + &mapping[0].block_hash;
        let _ = fs::copy(cache_path, file_path);
        return Ok(true);
    } else if mapping.len() == 0 {
        log::error!("assemble file: empty mapping for {}", cache_dir);
        return Ok(false);
    }

    // otherwise we need to assemble the file
    let proj_file = match File::create(file_path) {
        Ok(file) => file,
        Err(err) => {
            log::error!("error creating project file {}", err);
            return Ok(false);
        }
    };
    let mut writer = BufWriter::new(proj_file);
    for chunk in mapping {
        let cache_path = cache_dir.to_owned() + &(sep().to_string()) + &chunk.block_hash;
        let chunk_data = match fs::read(cache_path.clone()) {
            Ok(data) => data,
            Err(err) => {
                log::error!("error reading chunk data from {}: {}", cache_path, err);
                return Ok(false);
            }
        };
        let _ = writer.write_all(&chunk_data);
    }

    let _ = writer.flush();
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
        }
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
        }
        Err(_) => {
            println!("error reading mapping.json: {}", hash_dir);
            return Ok(false);
        }
    };

    // check existence of chunks
    for chunk in mapping {
        let cache_path = hash_dir.to_owned() + &(sep().to_string()) + &chunk.block_hash;
        match Path::new(&cache_path).try_exists() {
            Ok(result) => {
                if !result {
                    return Ok(false);
                }
            }
            Err(err) => {
                println!("err verifying cache {}: {}", hash_dir, err);
                return Ok(false);
            }
        };
    }

    Ok(true)
}

fn read_mapping(hash_dir: &String) -> Result<Vec<FileChunk>, ()> {
    let mapping_path = hash_dir.to_owned() + &(sep().to_string()) + "mapping.json";

    let map_file = match File::open(&mapping_path) {
        Ok(file) => file,
        Err(err) => {
            println!("read_mapping error: {}", err);
            return Err(());
        }
    };
    let reader = BufReader::new(map_file);
    let mapping: Vec<FileChunk> = match serde_json::from_reader(reader) {
        Ok(map) => map,
        Err(err) => {
            println!("read_mapping error: {}", err);
            return Err(());
        }
    };

    Ok(mapping)
}

// assumes trash dir exists
pub fn trash_file(proj_dir: &String, trash_dir: &String, hash: String) -> Result<bool, ()> {
    let trash_path;
    #[cfg(target_os = "windows")]
    {
        trash_path = trash_dir.to_owned() + &(sep().to_string()) + hash.as_str();
    }
    #[cfg(target_os = "linux")]
    {
        trash_path = translate_filepath(&(trash_dir.to_owned() + &(sep().to_string()) + hash.as_str()), true);
    }

    match fs::rename(proj_dir, trash_path) {
        Ok(_) => Ok(true),
        Err(err) => {
            println!("trash_file error: {}", err);
            Ok(false)
        }
    }
}

// trash dir should be the path to the hash in the trash
pub fn recover_file(trash_dir: &String, proj_dir: &String) -> Result<bool, ()> {
    match fs::rename(trash_dir, proj_dir) {
        Ok(_) => Ok(true),
        Err(err) => {
            println!("recover_file error: {}", err);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn download_single_file(pid: i64, path: String, commit_id: i64, user_id: String, download_path: String, state_mutex: State<'_, Mutex<Pool<Sqlite>>>) -> Result<bool, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let server_url = dal.get_current_server().await.unwrap();
    let cache_dir = get_cache_dir(&pool).await.unwrap();

    // request download links from glassy server
    let endpoint = server_url + "/store/download";
    let glassy_client: Client = reqwest::Client::new();
    let body: DownloadRequest = DownloadRequest {
        project_id: pid,
        path: path.clone(),
        commit_id: commit_id,
        user_id: user_id,
    };
    let response = glassy_client.post(endpoint).json(&body).send().await;

    let server_output: DownloadServerOutput = match response {
        Ok(res) => res
            .json::<DownloadServerOutput>()
            .await
            .unwrap_or_else(|_| DownloadServerOutput {
                response: "server error".to_string(),
                body: None,
            }),
        Err(err) => {
            log::warn!("couldn't fetch download information for {} at commit {} in project {}: {}", path, commit_id, pid, err);
            DownloadServerOutput {
                response: "reqwest error".to_string(),
                body: None,
            }
        }
    };

    if server_output.response != "success" {
        log::error!("couldn't download file {}", path);
        return Ok(false);
    }
    let download_info = match server_output.body {
        Some(a) => a,
        None => {
        log::error!("download information missing for {}", path);
            return Ok(false);
        }
    };

    // if file is cached, assemble file to download path
    let hash_dir = cache_dir.clone() + &(sep().to_string()) + download_info.file_hash.as_str();
    if verify_cache(&hash_dir).unwrap() {
        log::info!("hash exists in cache");
        let out = assemble_file(&hash_dir, &download_path).unwrap();
        // just need to assemble path and return true
        return Ok(out)
    }

    let _ = match save_filechunkmapping(&cache_dir, &download_info) {
        Ok(res) => {
            if !res {
                log::warn!("couldn't save filechunk mapping for file hash {}", download_info.file_hash);
            }
        },
        Err(_err) => {
            log::error!("encountered error when writing file chunk mapping for ifle hash {}", download_info.file_hash);
        }
    };

    // otherwise we need to download the chunks and assemble them
    let aws_client: Client = reqwest::Client::new();
    let error_flag = Arc::new(Mutex::new(false));
    let moved_error_flag = Arc::clone(&error_flag);
    let cloned_cache = cache_dir.clone();
    let _ = stream::iter(download_info.file_chunks.into_iter())
        .for_each_concurrent(CONCURRENT_AWS_REQUESTS, |chunk_info| {
            let cloned_error_flag = Arc::clone(&moved_error_flag);
            let client = &aws_client;
            // create cache_dir/file_hash directory
            let filehash_dir = cloned_cache.clone() + &(sep().to_string()) + chunk_info.file_hash.as_str();
            async move {
                let res = download_with_client(&filehash_dir, chunk_info, client).await;
                let mut error = cloned_error_flag.lock().await;
                let _ = match res {
                    Ok(_) => {
                        log::info!("chunk downloaded successfully");
                    }
                    Err(err) => {
                        *error = true;
                        log::error!("error downloading chunk {}", err);
                    }
                };
            }
        })
        .await;

    if *error_flag.lock().await {
        log::error!("issue downloading file from s3");
        return Ok(false);
    }

    // verify the new downloaded chunks exist
    let cache = cache_dir + &(sep().to_string()) + download_info.file_hash.as_str();
    let res = verify_cache(&cache).unwrap();
    if !res {
        log::error!("verifying cache failed: {}", download_info.file_hash);
        return Ok(false);
    }

    // assemble file
    let out = assemble_file(&hash_dir, &download_path).unwrap();

    // if configured, delete cache
    let should_delete_cache = get_cache_setting(&pool).await.unwrap();
    if should_delete_cache {
        let _ = delete_cache(&pool).await;
    }

    Ok(out)
}

pub fn compare_directory_deep(path_a: &String, path_b: &String) -> Ordering {
    if count_separators(path_a) < count_separators(path_b) {
        return Ordering::Greater;
    }
    else if count_separators(path_a) > count_separators(path_b) {
        return Ordering::Less;
    }

    return Ordering::Equal;
}

fn count_separators(path: &String) -> usize {
    let out = path.chars().filter(|c| *c == sep()).count();
    out
}

pub fn get_directories(deleted: &Vec<DownloadRequestMessage>) -> HashSet<String> {
    let mut output: HashSet<String> = HashSet::new();
    for file in deleted {
        let path = PathBuf::from(file.rel_path.clone());
        let parent = match path.parent() {
            Some(a) => a,
            None => continue
        };
        // TODO lol ???
        let components: Vec<String> = parent.components().map(|comp| comp.as_os_str().to_str().unwrap().to_string()).collect();
        let mut working: String = "".to_string();
        for component in components {
            working = working + &(sep().to_string()) + &component;
            trace!("adding {} to list of directories to try to delete", working);
            output.insert(working.clone());
        }
    }
    output
}