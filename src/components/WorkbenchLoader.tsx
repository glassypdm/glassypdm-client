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

  return null;
}
