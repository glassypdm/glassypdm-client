use crate::{
    file::translate_filepath, types::RemoteFile, util::open_directory, dal::DataAccessLayer
};
use bincode::{config, Decode, Encode};
use merkle_hash::{bytes_to_hex, Algorithm, MerkleNode, MerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use std::io::Write;
use std::path::PathBuf;
use std::fs::{self, OpenOptions};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use tokio::sync::Mutex;

#[derive(Encode, Decode)]
struct CachedTree {
    tree: MerkleTree,
    timestamp: u64
}

pub async fn hash_dir(pid: i32, dir_path: PathBuf, pool: &Pool<Sqlite>) {
    log::info!("starting hashing directory");
    log::info!("directory: {}", dir_path.display());
    let dal = DataAccessLayer::new(pool);

    let _ = dal.reset_fs_state(pid).await;

    let mut treepath = dir_path.clone();
    treepath.push(".glassytree");

    let tree = MerkleTree::builder(dir_path.display().to_string())
        .algorithm(Algorithm::Blake3)
        .hash_names(false)
        .build()
        .unwrap();

    log::info!("merkle tree created");

    // get the current time
    let start = SystemTime::now();
    let since_the_epoch = start.duration_since(UNIX_EPOCH).unwrap();
    let in_s = since_the_epoch.as_secs();
    let time_last_synced = dal.get_last_synced_for_project(pid).await.unwrap();

    // read cached tree if it exists
    let owowo = fs::read(&treepath);
    let config = config::standard();
    let mut cached_tree: Option<CachedTree> = Option::None;
    let use_cache= match owowo {
        Ok(bytes) => {
            match bincode::decode_from_slice::<CachedTree, bincode::config::Configuration>(&bytes[..], config) {
                Ok(res) => {
                    if res.0.timestamp == time_last_synced {
                        // cached tree is valid
                        cached_tree = Option::Some(res.0);
                        true
                    } else {
                        false
                    }
                },
                Err(err) => {
                    log::error!("decoding error when reading cached tree: {}", err);
                    false
                }
            }
        },
        Err(err) => {
            log::error!("failed to read cache tree: {}", err);
            false
        }
    };
    if use_cache {
        // if reading the cache was successful, use it to compare
        log::info!("comparing the merkle tree with cached tree");
        let cached_children = cached_tree.unwrap().tree.root.children;
        let current_children = tree.root.clone().children;

        // TODO measure how long the differences take
        // hypothesis: shows modified and deleted entries
        // actual: shows deleted entries
        let ca_cu = cached_children.difference(&current_children).flatten();
        println!("ca - cu");
        for node in ca_cu {
            println!("{}", node.path.relative);
        }

        // hypothesis: shows modified and created entries
        // actual: shows created entries
        let cu_ca = current_children.difference(&cached_children).flatten();
        println!("");
        println!("cu - ca");
        for node in cu_ca {
            println!("{}", node.path.relative);
        }

        // hypothesis: should show everything
        // actual: shows everything, old hashes
        let mut intersection = cached_children.intersection(&current_children).flatten();
        println!("");
        println!("intersection ca(cu)");
        for node in intersection {
            if node.path.relative == "newfile.txt" {
                println!("{}: {}", node.path.relative, bytes_to_hex(node.clone().hash));
            }
        }

        // this might have the new hashes?
        // actual: shows everything, new hashes
        intersection = current_children.intersection(&cached_children).flatten();
        println!("");
        println!("intersection cu(ca)");
        for node in intersection {
            if node.path.relative == "newfile.txt" {
                println!("{}: {}", node.path.relative, bytes_to_hex(node.clone().hash));
            }
        }

    } else {
        // iterate through entire tree
        log::info!("couldn't read cached tree, so iterating through entire merkle tree");
        for file in tree.iter().cloned() {
            // store paths as 'windows' paths
            let rel_path;
            #[cfg(target_os = "windows")]
            {
                rel_path = file.path.relative.into_string();
            }
            #[cfg(target_os = "linux")]
            {
                rel_path = translate_filepath(&(file.path.relative.into_string()), false);
            }
            let metadata = std::fs::metadata(file.path.absolute.clone()).unwrap();
            let hash = bytes_to_hex(file.hash);
            let filesize = metadata.len();
            // ignore folders
            if metadata.is_dir() {
                continue;
            }

            // ignore tree file
            // TODO unwrap ?? test this LOL
            if file.path.absolute.into_string() == treepath.to_str().unwrap() {
                log::info!("ignoring .glassytree");
                continue;
            }

            // ignore temp solidworks files
            if rel_path.contains("~$") {
                continue;
            }
            // root directory is empty
            else if rel_path == "" {
                continue;
            }

            if filesize == 0 {
                //log::trace!("skiping empty file");
                continue;
            }

            // write to sqlite
            let _ = dal.insert_local_file(rel_path, pid, hash, filesize).await;
        }
    }


    log::info!("files parsed");
    // TODO un comment this
    //let _ = dal.update_change_types(pid).await;


    // save cache tree
    let cache: CachedTree = CachedTree { tree: tree, timestamp: in_s };
    let _ = dal.set_last_synced_for_project(pid, in_s).await.unwrap();

    let serialized = bincode::encode_to_vec(&cache, config).unwrap();
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(treepath).unwrap();
    let _ = file.write_all(&serialized);
    // TODO don't ignore the result and don't unwrap 
    // TODO we'll need to overwrite tree file if it exists already


    log::info!("hashing directory complete");
}

// precondition: we have a server_url
#[tauri::command]
pub async fn sync_changes(
    pid: i32,
    remote: Vec<RemoteFile>,
    latest_commit: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<bool, ()> {
    log::info!("syncing changes for project {}", pid);

    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let project_dir = dal.get_project_dir(pid).await.unwrap();

    // create folder if it does not exist
    let _ = fs::create_dir_all(&project_dir);

    // hash local files
    hash_dir(pid, project_dir.into(), &pool).await;
    let tracked = dal.get_tracked_commit_for_project(pid).await.unwrap();
    if tracked == latest_commit {
        // skip updating remote files
        log::info!("skipping updating remote files");
        return Ok(true);
    }
    let _ = dal.set_tracked_commit_for_project(pid, latest_commit).await;
    log::info!("updating db with remote files...");
    // update table with remote files
    for file in remote {
        // write to sqlite
        // TODO check result
        let _ = dal.insert_remote_file(file.path, pid, file.commitid, file.filehash, file.changetype, file.blocksize).await;
    }
    log::info!("remote files updated");
    Ok(true)
}

#[tauri::command]
pub async fn update_project_info(
    pid: i32,
    title: String,
    team_name: String,
    init_commit: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<(), ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let _ = dal.add_project(pid, title, team_name, init_commit).await;

    Ok(())
}

#[derive(sqlx::FromRow, Serialize, Deserialize, Clone)]
pub struct FileChange {
    pub filepath: String,
    pub size: u32,
    pub change_type: u32,
    pub hash: String,
    pub commit_id: i32,
}

#[tauri::command]
pub async fn get_uploads(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    log::info!("querying db for uploads");
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let output: Vec<FileChange> = dal.get_uploads(pid).await.unwrap();
    log::info!("finished querying db for uploads");
    Ok(output)
}

#[tauri::command]
pub async fn get_downloads(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    log::info!("querying db for downloads");
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    let output = dal.get_downloads(pid).await.unwrap();

    log::info!("finished querying db for downloads");
    Ok(output)
}

#[tauri::command]
pub async fn get_conflicts(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<Vec<FileChange>, ()> {
    log::info!("querying db for file conflicts in project {}", pid);
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);

    let output: Vec<FileChange> = dal.get_conflicts(pid).await.unwrap();
    log::info!(
        "found {} conflicting files for project {}",
        output.len(),
        pid
    );
    Ok(output)
}

#[tauri::command]
pub async fn get_project_name(
    pid: i32,
    state_mutex: State<'_, Mutex<Pool<Sqlite>>>,
) -> Result<String, ()> {
    let pool = state_mutex.lock().await;
    let dal = DataAccessLayer::new(&pool);
    dal.get_project_name(pid).await
}