use std::fs::{File, self};
use std::io::{Read};
use std::path::PathBuf;
use crate::types::LocalCADFile;

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

// TODO generalize
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

// TODO ?????
pub fn vec_lcf_intersection(v1: Vec<LocalCADFile>, v2: &Vec<LocalCADFile>) -> Vec<LocalCADFile> {
    let mut output: Vec<LocalCADFile> = Vec::new();

    for a in &v1 {
        for b in v2 {
            if a.path == b.path && (a.hash != b.hash || a.size != b.size) {
                output.push(a.clone());
            }
        }
    }

    return output;
}