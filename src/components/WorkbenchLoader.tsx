import { CADFile, WorkbenchLoaderProps } from "@/lib/types";
import { BaseDirectory, readTextFile } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";
import { redirect } from "react-router-dom";

export async function workbenchLoader() {
  const projectDir = await invoke("get_project_dir");
  const serverUrl = await invoke("get_server_url");

  if (
    serverUrl === "http://example.com/" ||
    projectDir === "no project directory set"
  ) {
    return redirect("/settings");
  }

  let output: WorkbenchLoaderProps = {
    toDownload: [],
  };

  try {
    const str = await readTextFile("toDownload.json", {
      dir: BaseDirectory.AppLocalData,
    });
    const data: CADFile[] = JSON.parse(str);
    output.toDownload = data;
  } catch (err: any) {
    console.error(err);
  }
  return output;
}
