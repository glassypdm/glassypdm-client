import { invoke } from "@tauri-apps/api/tauri";

export interface SettingsLoaderProps {
  projectDir: string;
  serverURL: string;
}

export async function settingsLoader() {
  let output: SettingsLoaderProps = {
    projectDir: await invoke("get_project_dir"),
    serverURL: await invoke("get_server_url"),
  };
  return output;
}
