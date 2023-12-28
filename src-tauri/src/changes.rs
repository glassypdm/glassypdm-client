use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree, anyhow::Error};
use std::fs::{File, self};
use std::io::Write;
use log::{info, trace, error};
use crate::util::{is_key_in_list, vec_lcf_intersection, vec_lcf_diff};
use crate::settings::{get_project_dir, get_app_local_data_dir};
use crate::types::{LocalCADFile, Change, SyncOutput, RemoteFile, ChangeType, TrackedRemoteFile};

#[tauri::command]
pub fn hash_dir(app_handle: tauri::AppHandle, results_path: &str, ignore_list: Vec<String>) {
    trace!("hashing project directory");
    let path: String = get_project_dir(app_handle);
    if path == "no lol" {
        error!("hashing failed; invalid project directory");
        return;
    }
    
    let mut files: Vec<LocalCADFile> = Vec::new();

    // first, handle ignorelist
    let base_data: String = match fs::read_to_string(results_path) {
        Ok(content) => content,
        Err(_error) => "bruh".to_string(),
    };
    if base_data != "bruh" {
        let base_json: Vec<LocalCADFile> = serde_json::from_str(&base_data).expect("base.json not formatted");
        for ignored_file in &ignore_list {
            info!("ignoring file {}", ignored_file);
            for file in &base_json {
                if file.path == ignored_file.clone() {
                    let output: LocalCADFile = LocalCADFile {
                        path: ignored_file.clone(),
                        size: file.size,
                        hash: file.hash.clone()
                    };
                    files.push(output);
                }
            }
        }
    }
    else {
        error!("base.json DNE");
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
                path: pathbuf,
                size: filesize,
            };
            files.push(file);
        }

        let json = serde_json::to_string(&files)?;

        let mut file = File::create(results_path)?;
        file.write_all(json.as_bytes())?;
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
    base_path.push("base.json");
    let base_str = fs::read_to_string(base_path).unwrap();
    let base_files: Vec<LocalCADFile> = serde_json::from_str(&base_str).unwrap();

    // do comparisons
    let upload: Vec<Change> = get_uploads(&app_handle, &base_files);
    let download: Vec<TrackedRemoteFile> = get_downloads(&app_handle, &base_files, remote_files, &project_dir);
    let conflict: Vec<String> = get_conflicts(&upload, &download, &project_dir);

    let output: SyncOutput = SyncOutput {
        upload: upload, download, conflict
    };

    return output;
}

fn get_uploads(app_handle: &tauri::AppHandle, base_files: &Vec<LocalCADFile>) -> Vec<Change> {
    // read in compare.json
    let mut compare_path = get_app_local_data_dir(&app_handle);
    compare_path.push("compare.json");
    let compare_str = fs::read_to_string(compare_path).unwrap();
    let compare_files: Vec<LocalCADFile> = serde_json::from_str(&compare_str).unwrap();

    // populate upload list
    let mut output: Vec<Change> = Vec::new();

    // if files in base \cap compare differ, they should be uploaded
    let intersection: Vec<LocalCADFile> = vec_lcf_intersection(base_files.to_vec(), &compare_files);
    for file in intersection.clone() {
        output.push(Change {
            path: file.path,
            size: file.size,
            hash: file.hash,
            change: ChangeType::Update as u64
        })
    }
    trace!("{} files found in the intersection", intersection.len());

    // if files are in base \setminus compare, they should be deleted
    let base_diff: Vec<LocalCADFile> = vec_lcf_diff(base_files.to_vec(), &compare_files);
    for file in base_diff.clone() {
        output.push(Change {
            path: file.path,
            size: 0,
            hash: file.hash,
            change: ChangeType::Delete as u64
        })
    }
    trace!("{} files found in the base diff", base_diff.len());

    // if files are in compare \setminus base, they should be uploaded (new files)
    let compare_diff: Vec<LocalCADFile> = vec_lcf_diff(compare_files, base_files);
    for file in compare_diff.clone() {
        output.push(Change {
            path: file.path,
            size: file.size,
            hash: file.hash,
            change: ChangeType::Create as u64
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
        let mut change: ChangeType = ChangeType::Unidentified;
        let mut t_file: TrackedRemoteFile = TrackedRemoteFile {
            file: r_file.clone(),
            change: ChangeType::Unidentified
        };
        let mut found: bool = false;
        for b_file in base_files {
            let b_path: String = b_file.path.replace(project_dir, "");
            if r_file.path == b_path && r_file.size == 0 {
                found = true;
                change = ChangeType::Delete;
                t_file.change = change;
                info!("Detected file to delete: {}", t_file.file.path);
                output.push(t_file.clone());
                break;
            }
            else if r_file.path == b_path && (r_file.size != b_file.size || r_file.hash != b_file.hash) {
                found = true;
                change = ChangeType::Update;
                t_file.change = change;
                output.push(t_file.clone());
                info!("Detected file to update: {}", t_file.file.path);
                break;
            }
            else if r_file.path == b_path {
                found = true;
            }
        }

        if !found && r_file.size != 0 {
            change = ChangeType::Create;
            t_file.change = change;
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
            let u_path: String = u_file.path.replace(project_dir, "");
            if u_path == d_file.file.path {
                info!("found conflicting file: {}", u_path);
                output.push(u_path);
            }
        }
    }

    info!("{} conflicting files", output.len());
    return output;
}