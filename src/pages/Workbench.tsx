import "@/App.css";
import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir } from "@tauri-apps/api/path";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Change,
  TrackedRemoteFile,
  ProjectState,
  WorkbenchLoaderProps,
  SyncOutput,
} from "@/lib/types";
import {
  BASE_COMMIT_FILE,
  COMPARE_DAT_FILE,
  S3KEY_DAT_FILE,
  cn,
  isClientCurrent,
  updateAppDataFile,
} from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { open } from "@tauri-apps/api/shell";
import { useToast } from "@/components/ui/use-toast";
import { trace, info } from "tauri-plugin-log-api";
import { listen } from "@tauri-apps/api/event";
import { Store } from "tauri-plugin-store-api";

interface WorkbenchProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Workbench({ className }: WorkbenchProps) {
  const loaderData: WorkbenchLoaderProps =
    useLoaderData() as WorkbenchLoaderProps;
  const [upload, setUpload] = useState<Change[]>(loaderData.toUpload);
  const [download, setDownload] = useState<TrackedRemoteFile[]>(
    loaderData.toDownload,
  );
  const [syncing, setSyncing] = useState(false);
  const [conflict, setConflict] = useState<string[]>(loaderData.conflict);
  const [conflictExists, setConflictExists] = useState(
    loaderData.conflict.length > 0,
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  async function getChanges() {
    // time function
    const startTime = performance.now();
    const dataDir = await appLocalDataDir();
    const storePath = await resolve(dataDir, S3KEY_DAT_FILE);
    const store = new Store(storePath);

    trace("starting to sync with server...");
    setSyncing(true);
    if (!(await isClientCurrent())) {
      setSyncing(false);
      toast({
        title: "New glassyPDM version available!",
        description: "Talk to your team lead for the new installer.",
      });
      return;
    }

    let serverUrl: string = await invoke("get_server_url");

    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, COMPARE_DAT_FILE);
    await invoke("hash_dir", { resultsPath: path, ignoreList: [] });
    try {
      const data = await fetch(serverUrl + "/info/project");
      const remote: ProjectState = await data.json();

      // write remote commit into some file
      const commit: string = remote.commit?.toString() || "0";
      await updateAppDataFile(BASE_COMMIT_FILE, commit);

      const unlistenS3Event = await listen("updateKeyStore", (event: any) => {
        const data = event.payload;
        store.set(data.rel_path, data.key);
      });

      const syncStatus: SyncOutput = await invoke("sync_server", {
        remoteFiles: remote.files,
      });

      unlistenS3Event();
      setUpload(syncStatus.upload);
      setDownload(syncStatus.download);
      setConflict(syncStatus.conflict);
      setConflictExists(syncStatus.conflict.length > 0);
      await store.save();
    } catch (err: any) {
      console.error(err);
    }

    // stop timing function
    const endTime = performance.now();
    const delta =
      Math.round((endTime - startTime + Number.EPSILON) * 100) / 100;

    toast({
      title: `Sync took ${delta} milliseconds to complete`,
    });
    info(`Sync took ${delta} milliseconds`);
    trace("Sync action complete");
    setSyncing(false);
  }

  async function openFolder() {
    const projDir: string = await invoke("get_project_dir");
    await open(projDir);
  }

  async function openWebsite() {
    await open("https://pdm.18x18az.org/");
  }

  async function navigateDownload() {
    if (!(await isClientCurrent())) {
      toast({
        title: "New glassyPDM version available!",
        description: "Talk to your team lead for the new installer.",
      });
      return;
    }
    navigate("/download");
  }

  async function navigateUpload() {
    if (!(await isClientCurrent())) {
      toast({
        title: "New glassyPDM version available!",
        description: "Talk to your team lead for the new installer.",
      });
      return;
    }
    navigate("/upload");
  }

  return (
    <div className={cn("", className)}>
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
            {conflict.map((value: string) => {
              return (
                <div key={value}>
                  <p>{value}</p>
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
      <h1 className="text-2xl">SDM-24</h1>
      <div className="grid grid-cols-3 gap-6 p-4 h-48">
        <div className="flex flex-col gap-4">
          <Button
            className="grow"
            onClick={navigateDownload}
            disabled={download.length === 0 ? true : false}
          >
            {download.length === 0
              ? "Up to date"
              : download.length + " files ready to download"}
          </Button>
          <Button className="" onClick={openWebsite} variant="outline">
            Open Website
          </Button>
        </div>
        <Button className="flex h-full" onClick={getChanges} disabled={syncing}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sync"}
        </Button>
        <div className="flex flex-col gap-4">
          <Button
            className="grow"
            onClick={navigateUpload}
            disabled={upload.length === 0 ? true : false}
          >
            {upload.length === 0
              ? "Up to date"
              : upload.length + " files ready for upload"}
          </Button>
          <Button className="" onClick={openFolder} variant="outline">
            Open Project Folder
          </Button>
        </div>
      </div>
    </div>
  );
}
