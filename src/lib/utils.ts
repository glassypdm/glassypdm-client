import { getVersion } from "@tauri-apps/api/app";
import { BaseDirectory, exists, removeFile } from "@tauri-apps/api/fs";
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

export async function isClientCurrent() {
  const serverURL = await invoke("get_server_url");
  const response = await fetch(serverURL + "/version");
  const data = await response.json();
  const version = data["version"];
  const localVersion = await getVersion();
  //return false;
  return localVersion === version;
}
