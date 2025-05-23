import { File } from "@/components/file/FileColumn";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/_app/_workbench/projects/$pid/sync")({
  component: () => <SyncPage />,
  loader: async ({ params }) => {
    const pid = parseInt(params.pid);
    const uploadOutput: File[] = await invoke("get_uploads", { pid: pid });
    const downloadOutput: File[] = await invoke("get_downloads", { pid: pid });
    const conflict: File[] = await invoke("get_conflicts", { pid: pid });
    const url: string = await invoke("get_server_url");

    return {
      upload: uploadOutput.length,
      download: downloadOutput.length,
      url: url,
      conflict: conflict,
    };
  },
  gcTime: 0, // do not cache this route's data after its unloaded per docs
  shouldReload: false, // only reload the route when dependencies change or user navigates to it (per docs)
});

interface RemoteFile {
  frid: number;
  path: string;
  commitid: number;
  hash: string;
  changetype: number;
  size: number;
}

interface ProjectStateOutput {
  response: string;
  body: RemoteFile[];
}

function SyncPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { upload, download, url, conflict } = Route.useLoaderData();
  const { pid } = Route.useParams();
  const [uploadSize, setUploadSize] = useState(upload);
  const [downloadSize, setDownloadSize] = useState(download);
  const [conflictList, setConflictList] = useState(conflict);
  const [conflictExists, setConflictExists] = useState(conflict.length > 0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncCommit, setSyncCommit] = useState("latest");
  const { toast } = useToast();

  async function doSync() {
    await syncChanges("latest");
  }

  async function syncChanges(bop: string) {
    setSyncInProgress(true);
    const pid_number = parseInt(pid);

    const start = performance.now();

    let data;
    let latestCommit;
    try {
      data = await fetch(url + "/project/status/by-id/" + pid + "/" + bop, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: "GET",
        mode: "cors",
      });
      const hehez = await fetch(url + "/project/latest" + "?pid=" + pid, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: "GET",
        mode: "cors",
      });
      latestCommit = (await hehez.json()).body
      console.log(latestCommit)
    } catch(err) {
      console.log(err);
      toast({
        title: "Couldn't sync",
        description: "Check your Internet connection and try again in a few minutes."
      });
      setSyncInProgress(false);
      return;
    }
    const remote: ProjectStateOutput = await data.json();
    if (remote.response != "success") {
      toast({
        title: "Failed to sync with the server",
        description: "Please create an issue on the GitHub repository."
      })
      console.log("sync error");
      setSyncInProgress(false);
      return;
    }

    let project: RemoteFile[] = [];
    console.log(remote);
    if (remote.body != null) {
      project = remote.body;
    }

    await invoke("sync_changes", { pid: pid_number, remote: project, latestCommit: latestCommit });

    // TODO type this so its not any
    const uploadOutput: any = await invoke("get_uploads", { pid: pid_number });
    console.log(uploadOutput);

    const downloadOutput: any = await invoke("get_downloads", {
      pid: pid_number,
    });
    console.log(downloadOutput);
    const conflictOutput: any = await invoke("get_conflicts", {
      pid: pid_number,
    });
    console.log(conflictOutput);

    setConflictList(conflictOutput);
    setConflictExists(conflictOutput.length > 0);
    setDownloadSize(downloadOutput.length);
    setUploadSize(uploadOutput.length);
    setSyncInProgress(false);

    const end = performance.now();
    toast({
      title: "Sync complete",
      description: `Action took ${(end - start)/1000} seconds`
    })
  }

  async function devSync() {
    await syncChanges(syncCommit);
  }

  async function devHehez() {
    if(syncCommit == "latest") {
      return;
    }

    // get commit id from commit number
    const endpoint = url + "/project/commit" + "?pid=" + pid + "&cno=" + syncCommit;
    const resp = await fetch(endpoint, {
      method: "GET",
      mode: "cors",
      headers: { Authorization: `Bearer ${await getToken()}` }
    })
    const data = await resp.json();
    console.log(data)
    if(data.response != 'success') {
      toast({ title: "unsuccesful"})
      return;
    }

    // do the file table clearing
    await invoke("clear_file_table", {pid: parseInt(pid), commit: syncCommit })

    toast({ title: "success"})
  }

  async function navigateUpload() {
    navigate({
      to: "/upload",
      search: { pid: pid },
    });
  }

  async function navigateDownload() {
    navigate({
      to: "/download",
      search: { pid: pid },
    });
  }

  async function openFolder() {
    await invoke("open_project_dir", { pid: parseInt(pid) });
  }

  return (
    <div>
    <div className="grid grid-cols-3 gap-8 p-4 h-64 w-[600px]">
      <Dialog defaultOpen={conflictExists} open={conflictExists}>
        <DialogContent className="h-4/5">
          <DialogHeader>
            <DialogTitle>File conflicts detected!</DialogTitle>
            <DialogDescription>
              Please backup these files elsewhere before downloading/uploading
              changes.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea>
            {conflictList.map((value: File) => {
              return (
                <div key={value.hash}>
                  <p>{value.filepath}</p>
                  <Separator />
                </div>
              );
            })}
          </ScrollArea>
          <Button
            onClick={() => setConflictExists(false)}
            variant="destructive"
          >
            I understand
          </Button>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col gap-4">
        <Button
          className="grow text-wrap"
          onClick={navigateDownload}
          disabled={downloadSize == 0 ? true : false || syncInProgress}
        >
          {downloadSize == 0
            ? "Up to date"
            : downloadSize + " files ready to download"}
        </Button>
      </div>
      <div className="flex flex-col gap-4">
      <Button
        className="flex h-full"
        onClick={doSync}
        disabled={syncInProgress}
      >
        {syncInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />: "Sync"}
      </Button>
      <Button variant={"outline"} onClick={openFolder}>
          Open Project Folder
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        <Button
          className="grow text-wrap"
          onClick={navigateUpload}
          disabled={uploadSize == 0 ? true : false || syncInProgress}
        >
          {uploadSize == 0
            ? "Up to date"
            : uploadSize + " files ready to upload"}
        </Button>
      </div>
    </div>
    {
      import.meta.env.DEV ?
      <div className="flex flex-col gap-y-2">
      <div className="text-2xl font-semibold"> Dev Options</div>
      <div className="flex flex-row gap-x-2">
        <Input onChange={(e) => {setSyncCommit(e.target.value)}} value={syncCommit}/>
        <Button
        onClick={devSync}
        disabled={syncInProgress}
        >Sync at commit</Button>
        <Button
        onClick={devHehez}
        variant={'secondary'}>
          Set file table to commit
        </Button>
      </div>
      <div className="flex flex-row gap-x-2">
        <Button onClick={async() => { await invoke("clear_file_table", {pid: parseInt(pid), commit: "latest" })}}>Clear File Table</Button>
        <Button onClick={async() => { await invoke("delete_project", {pid: parseInt(pid) })}} variant={'destructive'}>Delete Project</Button>
        </div>
      </div>
    : <></>
    }
    </div>
  );
}
