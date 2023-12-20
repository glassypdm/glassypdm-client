use std::fs::{File, self};
use std::io::{Read};
use std::path::PathBuf;

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