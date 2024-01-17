use merkle_hash::{bytes_to_hex, Algorithm, MerkleTree};
use tauri::Runtime;
use std::fs::{File, self};
use serde_json::{json, Value, from_value};
use tauri_plugin_store::StoreBuilder;
use std::io::Read;
use log::{info, trace, error};
use std::path::PathBuf;
use crate::{types::LocalCADFile, settings::{get_project_dir, get_app_local_data_dir}};

pub fn pathbuf_to_string(path: PathBuf) -> String {
    let output: String = path.into_os_string().into_string().unwrap();
    return output;
}

pub fn is_key_in_list(key: String, list: Vec<String>) -> bool {
    for str in list {
        if key == str {
            return true;
        }
    }
    return false;
}

pub fn get_file_as_byte_vec(filename: &String) -> Vec<u8> {
    let mut f = File::open(&filename).expect("no file found");
    let metadata = fs::metadata(&filename).expect("unable to read metadata");
    let mut buffer = vec![0; metadata.len() as usize];
    f.read(&mut buffer).expect("buffer overflow");

    buffer
}

pub fn store_to_vec<'a>(iter: impl Iterator<Item = &'a Value>) -> Vec<LocalCADFile> {
    let mut output: Vec<LocalCADFile> = Vec::new();

    for val in iter {
        output.push(from_value(val.clone()).unwrap());
    }
    return output;
}

// TODO generalize (or find the rust way to do this, lol)
// i.e., LocalCADFile should implement some equal thing
// v1 - v2
pub fn vec_lcf_diff(v1: Vec<LocalCADFile>, v2: &Vec<LocalCADFile>) -> Vec<LocalCADFile> {
    let mut output: Vec<LocalCADFile> = Vec::new();

    for a in v1 {
        let mut found: bool = false;
        for b in v2 {
            if a.path == b.path {
                found = true;
                break;
            }
        }

        if !found {
            output.push(a.clone());
        }
    }

    return output;
}

// hash a specific file
pub fn hash_file(file_abs_path: &str) -> LocalCADFile {
    let tree = MerkleTree::builder(file_abs_path)
    .algorithm(Algorithm::Blake3)
    .hash_names(true)
    .build().unwrap();

    let metadata = std::fs::metadata(file_abs_path).unwrap();
    let file_size = metadata.len();
    
    // return object with size and hash (and path)
    let output: LocalCADFile = LocalCADFile {
        path: file_abs_path.to_string(),
        size: file_size,
        hash: bytes_to_hex(tree.root.item.hash)
    };
    return output;
}

pub fn upsert_into_base_store(app_handle: tauri::AppHandle, file: LocalCADFile) -> bool {
    trace!("upserting into base.dat...");
    let mut base_path = get_app_local_data_dir(&app_handle);
    base_path.push("base.dat");
    let mut store = StoreBuilder::new(app_handle, base_path).build();
    let _ = store.load();
    match store.insert(file.clone().path, json!(file)) {
        Ok(()) => {},
        Err(e) => {error!("encountered error {}", e); return false;}
    };

    let res = store.save();
    match res {
        Ok(()) => {},
        Err(e) => {error!("encountered error {}", e); return false;}
    };

    return true;
}

pub fn delete_from_base_store(app_handle: tauri::AppHandle, rel_path: &str) -> bool {
    trace!("deleting from base.dat...");
    let mut base_path = get_app_local_data_dir(&app_handle);
    base_path.push("base.dat");
    let abs_path = get_project_dir(app_handle.clone()) + rel_path;
    let mut store = StoreBuilder::new(app_handle, base_path).build();
    let _ = store.load();
    let mut output = true;
    match store.delete(abs_path) {
        Ok(res) => {output = res},
        Err(e) => {error!("encountered error {}", e); return false;}
    };

    let res = store.save();
    match res {
        Ok(()) => {},
        Err(e) => {error!("encountered error {}", e); return false;}
    };
    return output;
}