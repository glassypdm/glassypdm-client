import { getVersion } from "@tauri-apps/api/app";
import {
  BaseDirectory,
  exists,
  removeFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function checkFile(filename: string) {
  let isPresent = await exists(filename, {
    dir: BaseDirectory.AppLocalData,
  });

  return isPresent;
}

export async function deleteFileIfExist(filename: string) {
  if (await checkFile(filename)) {
    await removeFile(filename, {
      dir: BaseDirectory.AppLocalData,
    });
  }
}

export let BASE_JSON_FILE: string = "base.json";
export let BASE_COMMIT_FILE: string = "basecommit.txt";
export let COMPARE_JSON_FILE: string = "compare.json";
export let PROJECT_DIR_FILE: string = "project_dir.txt";
export let S3KEY_DAT_FILE: string = "s3key.dat";
export let SERVER_URL_FILE: string = "server_url.txt";
export let DOWNLOAD_JSON_FILE: string = "toDownload.json";
export let UPLOAD_JSON_FILE: string = "toUpload.json";

export async function clearLocalData() {
  deleteFileIfExist(BASE_JSON_FILE);
  deleteFileIfExist(BASE_COMMIT_FILE);
  deleteFileIfExist(COMPARE_JSON_FILE);
  deleteFileIfExist(PROJECT_DIR_FILE);
  deleteFileIfExist(S3KEY_DAT_FILE);
  deleteFileIfExist(SERVER_URL_FILE);
  deleteFileIfExist(DOWNLOAD_JSON_FILE);
  deleteFileIfExist(UPLOAD_JSON_FILE);
}

export async function updateAppDataFile(filename: string, data: string) {
  await deleteFileIfExist(filename);
  await writeTextFile(filename, data, {
    dir: BaseDirectory.AppLocalData,
    append: false,
  });
}

export async function getAbsolutePath(filename: string) {
  const dir: string = await invoke("get_project_dir");
  return dir + filename;
}

export async function isClientCurrent() {
  const serverURL = await invoke("get_server_url");
  const response = await fetch(serverURL + "/version");
  const data = await response.json();
  const version = data["version"];
  const localVersion = await getVersion();
  //return false;
  return localVersion === version;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
