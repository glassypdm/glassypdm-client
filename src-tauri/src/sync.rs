use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree, anyhow::Error};
use tauri::Manager;
use tauri_plugin_store::StoreBuilder;
use serde_json::json;
use std::fs::{File, self};
use std::io::Write;
use log::{info, trace, error};
use crate::util::{is_key_in_list, vec_lcf_diff, store_to_vec};
use crate::settings::{get_project_dir, get_app_local_data_dir};
use crate::types::{LocalCADFile, Change, SyncOutput, RemoteFile, ChangeType, TrackedRemoteFile, FileLink};

#[tauri::command]
pub fn hash_dir(app_handle: tauri::AppHandle, results_path: &str, ignore_list: Vec<String>) {
    trace!("hashing project directory");
    let path: String = get_project_dir(app_handle.clone());
    if path == "no lol" {
        error!("hashing failed; invalid project directory");
        return;
    }
    let mut store = StoreBuilder::new(app_handle, results_path.parse().unwrap()).build();
    let _ = store.clear().unwrap();

    let mut files: Vec<LocalCADFile> = Vec::new();

    info!("ignoring {} files", ignore_list.len());
    // first, handle ignorelist
    let base_json: Vec<LocalCADFile> = store_to_vec(store.values());
    for ignored_file in &ignore_list {
        info!("ignoring file {}", ignored_file);
        for file in &base_json {
            if file.path == ignored_file.clone() {
                let output: LocalCADFile = LocalCADFile {
                    path: ignored_file.clone(),
                    size: file.size,
                    hash: file.hash.clone()
                };
                let _ = store.insert(ignored_file.clone(), json!(output));
                files.push(output);
            }
        }
    }

    // build hash
    let do_steps = || -> Result<(), Error> {
        let tree = MerkleTree::builder(path)
        .algorithm(Algorithm::Blake3)
        .hash_names(true)
        .build().unwrap();

        for item in tree {
            let pathbuf = item.path.absolute.into_string();
            let s_hash = bytes_to_hex(item.hash);

            if pathbuf.as_str() == "" {
                continue;
            }
            let metadata = std::fs::metadata(pathbuf.as_str())?;
            let isthisfile = metadata.is_file();
            let filesize = metadata.len();

            // ignore if directory
            if !isthisfile {
                continue;
            }

            // if file is in ignorelist, we already handled it
            // so ignore it
            if is_key_in_list(pathbuf.clone(), ignore_list.clone()) {
                continue;
            }

            // ignore temporary solidworks files
            if pathbuf.as_str().contains("~$") {
                continue;
            }

            //println!("{}: {}", pathbuf, s_hash);
            let file = LocalCADFile {
                hash: s_hash,
                path: pathbuf.clone(),
                size: filesize,
            };
            let _ = store.insert(pathbuf, json!(file));
            files.push(file);
        }

        //let json = serde_json::to_string(&files)?;

        //let mut file = File::create(results_path)?;
        //file.write_all(json.as_bytes())?;
        let _ = store.save();
        Ok(())
    };
    let _ = do_steps();

    trace!("fn hash_dir done");
}

#[tauri::command]
pub fn sync_server(app_handle: tauri::AppHandle, remote_files: Vec<RemoteFile>) -> SyncOutput {
    // get project directory
    let project_dir: String = get_project_dir(app_handle.clone());

    // read in base.json
    let mut base_path = get_app_local_data_dir(&app_handle);
    base_path.push("base.dat");
    //let base_str = fs::read_to_string(base_path).unwrap();
    //let base_files: Vec<LocalCADFile> = serde_json::from_str(&base_str).unwrap();
    let mut store = StoreBuilder::new(app_handle.clone(), base_path).build();
    let _ = store.load();
    let base_files = store_to_vec(store.values());

    // do comparisons
    let upload: Vec<Change> = get_uploads(&app_handle, &base_files);
    let download: Vec<TrackedRemoteFile> = get_downloads(&app_handle, &base_files, remote_files, &project_dir);
    let conflict: Vec<String> = get_conflicts(&upload, &download, &project_dir);

    let output: SyncOutput = SyncOutput {
        upload, download, conflict
    };

    return output;
}

fn get_uploads(app_handle: &tauri::AppHandle, base_files: &Vec<LocalCADFile>) -> Vec<Change> {
    // read in compare.json
    let mut compare_path = get_app_local_data_dir(&app_handle);
    compare_path.push("compare.dat");
    let mut store = StoreBuilder::new(app_handle.clone(), compare_path).build();
    let _ = store.load();
    //let compare_str = fs::read_to_string(compare_path).unwrap();
    let compare_files: Vec<LocalCADFile> = store_to_vec(store.values());

    // populate upload list
    let mut output: Vec<Change> = Vec::new();

    // if files in base \cap compare differ, they should be uploaded
    for b_file in base_files {
        for c_file in compare_files.clone() {
            if b_file.path == c_file.path && (b_file.hash != c_file.hash || b_file.size != c_file.size) {
                output.push(Change {
                    file: LocalCADFile {
                        path: c_file.path,
                        size: c_file.size,
                        hash: c_file.hash
                    },
                    change: ChangeType::Update
                });
            }
        }
    }

    // if files are in base \setminus compare, they should be deleted
    let base_diff: Vec<LocalCADFile> = vec_lcf_diff(base_files.to_vec(), &compare_files);
    for file in base_diff.clone() {
        output.push(Change {
            file: LocalCADFile {
                path: file.path,
                size: 0,
                hash: file.hash
            },
            change: ChangeType::Delete
        })
    }
    trace!("{} files found in the base diff", base_diff.len());

    // if files are in compare \setminus base, they should be uploaded (new files)
    let compare_diff: Vec<LocalCADFile> = vec_lcf_diff(compare_files, base_files);
    for file in compare_diff.clone() {
        output.push(Change {
            file: LocalCADFile {
                path: file.path,
                size: file.size,
                hash: file.hash
            },
            change: ChangeType::Create
        })
    }
    trace!("{} files found in the compare diff", compare_diff.len());

    // write to toUpload.json
    let json = match serde_json::to_string(&output) {
        Ok(string) => string,
        Err(error) => {
            error!("Problem writing to toUpload.json: {}", error);
            panic!("Problem writing to toUpload.json: {}", error);
        },
    };

    let mut output_path = get_app_local_data_dir(&app_handle);
    output_path.push("toUpload.json");
    let mut file = File::create(output_path).unwrap();
    let _ = file.write_all(json.as_bytes());

    info!("{} files to upload", output.len());
    return output;
}

fn get_downloads(app_handle: &tauri::AppHandle, base_files: &Vec<LocalCADFile>, remote_files: Vec<RemoteFile>, project_dir: &String) -> Vec<TrackedRemoteFile> {
    let mut output: Vec<TrackedRemoteFile> = Vec::new();

    // populate download list
    for r_file in remote_files {
        let mut t_file: TrackedRemoteFile = TrackedRemoteFile {
            file: r_file.clone(),
            change: ChangeType::Unidentified
        };
        let mut found: bool = false;
        for b_file in base_files {
            let b_path: String = b_file.path.replace(project_dir, "");
            if r_file.path == b_path && r_file.size == 0 {
                found = true;
                t_file.change = ChangeType::Delete;
                info!("Detected file to delete: {}", t_file.clone().file.path);
                output.push(t_file.clone());
                break;
            }
            else if r_file.path == b_path && (r_file.size != b_file.size || r_file.hash != b_file.hash) {
                found = true;
                t_file.change = ChangeType::Update;
                output.push(t_file.clone());
                info!("Detected file to update: {}", t_file.clone().file.path);
                break;
            }
            else if r_file.path == b_path {
                // file exists and hasn't been changed
                found = true;
                // ensure s3key.dat is up-to-date
                let _ = match &t_file.file.s3key {
                    Some(key) => app_handle.emit_all("updateKeyStore", FileLink { rel_path: t_file.clone().file.path, key: key.to_string() }),
                    None => Ok(())
                };
            }
        }

        if !found && r_file.size != 0 {
            t_file.change = ChangeType::Create;
            info!("Detected file to create: {}", t_file.file.path);
            output.push(t_file);
        }
    }

    // write to toDownload.json
    let json = match serde_json::to_string(&output) {
        Ok(string) => string,
        Err(error) => {
            error!("Problem writing to toDownload.json: {}", error);
            panic!("Problem writing to toDownload.json: {}", error);
        },
    };

    let mut output_path = get_app_local_data_dir(&app_handle);
    output_path.push("toDownload.json");
    let mut file = File::create(output_path).unwrap();
    let _ = file.write_all(json.as_bytes());

    info!("{} files to download", output.len());
    return output;
}

fn get_conflicts(upload: &Vec<Change>, download: &Vec<TrackedRemoteFile>, project_dir: &String) -> Vec<String> {
    let mut output: Vec<String> = Vec::new();
    for u_file in upload {
        for d_file in download {
            let u_path: String = u_file.file.path.replace(project_dir, "");
            if u_path == d_file.file.path {
                info!("found conflicting file: {}", u_path);
                output.push(u_path);
            }
        }
    }

    info!("{} conflicting files", output.len());
    return output;
}