import { Change, TrackedRemoteFile, WorkbenchLoaderProps } from "@/lib/types";
import { BaseDirectory, readTextFile } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";
import { redirect } from "react-router-dom";

export async function workbenchLoader() {
  const projectDir: string = await invoke("get_project_dir");
  const serverUrl = await invoke("get_server_url");

  if (
    serverUrl === "http://example.com/" ||
    projectDir === "no project directory set"
  ) {
    return redirect("/settings");
  }

  let output: WorkbenchLoaderProps = {
    toDownload: [],
    toUpload: [],
    conflict: [],
  };

  try {
    const downloadStr = await readTextFile("toDownload.json", {
      dir: BaseDirectory.AppLocalData,
    });
    const downloadData: TrackedRemoteFile[] = JSON.parse(downloadStr);
    output.toDownload = downloadData;

    const uploadStr = await readTextFile("toUpload.json", {
      dir: BaseDirectory.AppLocalData,
    });
    const uploadData: Change[] = JSON.parse(uploadStr);
    output.toUpload = uploadData;

    for (let i = 0; i < output.toUpload.length; i++) {
      const file: string = output.toUpload[i].file.path.replace(projectDir, "");
      for (let j = 0; j < output.toDownload.length; j++) {
        if (file === output.toDownload[j].file.path) {
          output.conflict.push(file);
        }
      }
    }
  } catch (err: any) {
    console.error(err);
  }
  return output;
}
