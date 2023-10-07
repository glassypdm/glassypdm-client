import { BaseDirectory, exists, removeFile } from "@tauri-apps/api/fs";
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
