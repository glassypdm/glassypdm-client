import { HistoryLoaderProps } from "@/lib/types";
import { invoke } from "@tauri-apps/api/tauri";
import { redirect } from "react-router-dom";

export async function historyLoader() {
  const serverUrl = await invoke("get_server_url");

  if (serverUrl === "") {
    return redirect("/settings");
  }

  let output: HistoryLoaderProps = {
    recentCommits: [],
  };
  const res: Response = await fetch(serverUrl + "/info/commit/recent");
  const data = await res.json();

  // TODO update the message sent from server
  //  so that we dont have to do the for loop
  try {
    for (let i = 0; i < data.length; i++) {
      const commit = data[i];
      output.recentCommits.push({
        id: commit["id"],
        projectID: commit["projectid"],
        authorID: commit["authorID"],
        message: commit["message"],
        fileCount: commit["filecount"],
        timestamp: parseInt(commit["timestamp"]) / 1000.0,
      });
      console.log(commit["timestamp"]);
    }
  } catch (err: any) {
    console.error(err);
  }
  console.log(output);
  return output;
}
