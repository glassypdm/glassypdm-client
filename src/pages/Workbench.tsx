import "@/App.css";
import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LocalCADFile,
  CADFile,
  ProjectState,
  ChangeType,
  WorkbenchLoaderProps,
} from "@/lib/types";
import { cn, deleteFileIfExist, isClientCurrent } from "@/lib/utils";
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

interface WorkbenchProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Workbench({ className }: WorkbenchProps) {
  const loaderData: WorkbenchLoaderProps =
    useLoaderData() as WorkbenchLoaderProps;
  const [upload, setUpload] = useState<LocalCADFile[]>(loaderData.toUpload);
  const [download, setDownload] = useState<CADFile[]>(loaderData.toDownload);
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<string[]>(loaderData.conflict);
  const [conflictExists, setConflictExists] = useState(
    loaderData.conflict.length > 0,
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  async function getChanges() {
    console.log("click sync");
    setLoading(true);
    if (!(await isClientCurrent())) {
      setLoading(false);
      toast({
        title: "New glassyPDM version available!",
        description: "Talk to your team lead for the new installer.",
      });
      // TODO we probably want to force users to update to the newest client
      // version until client is a bit more stable in terms of
      // update frequency
      return;
    }
    let serverUrl: string = await invoke("get_server_url");
    let projDir: string = await invoke("get_project_dir");

    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "compare.json");
    console.log(path);
    await invoke("hash_dir", { resultsPath: path, ignoreList: [] });
    try {
      const data = await fetch(serverUrl + "/info/project");
      const remote: ProjectState = await data.json();
      console.log(remote);

      // write remote commit into some file
      const commit: string = remote.commit?.toString() || "0";
      await deleteFileIfExist("basecommit.txt");
      await writeTextFile("basecommit.txt", commit, {
        dir: BaseDirectory.AppLocalData,
        append: false,
      });

      let contents = await readTextFile("base.json", {
        dir: BaseDirectory.AppLocalData,
      });
      const base = JSON.parse(contents);

      contents = await readTextFile("compare.json", {
        dir: BaseDirectory.AppLocalData,
      });
      const compare = JSON.parse(contents);

      // for getting what to download
      let toDownload: CADFile[] = [];
      // for each file in remote:
      remote.files.forEach((file: CADFile) => {
        if (file.size === 0) {
          let found: boolean = false;
          base.every((local: any) => {
            // adjust path
            const localPath: string = local.path.replace(projDir, "");
            if (file.path === localPath) {
              found = true;
              return false;
            }
            return true;
          });
          if (found) {
            file.change = ChangeType.DELETE;
            toDownload.push(file); // file not deleted locally
          }
        } else {
          let found: boolean = false;
          base.forEach((local: any) => {
            // adjust path
            const localPath: string = local.path.replace(projDir, "");
            if (file.path === localPath) {
              found = true;
              if (local.hash !== file.hash || local.size != file.size) {
                file.change = ChangeType.UPDATE;
                toDownload.push(file); // file has been updated
              }
            }
          });
          if (!found) {
            console.log("not found locally");
            file.change = ChangeType.CREATE;
            toDownload.push(file); // file not downloaded locally
          }
        }
      });
      console.log(toDownload);
      setDownload(toDownload);
      await deleteFileIfExist("toDownload.json");
      await writeTextFile("toDownload.json", JSON.stringify(toDownload), {
        dir: BaseDirectory.AppLocalData,
        append: false,
      });

      // for getting what to upload, compare base.json with compare.json
      let toUpload: LocalCADFile[] = [];

      base.forEach((bFile: LocalCADFile) => {
        // if base && compare, add toUpload if size, hash is different
        let found: boolean = false;
        compare.every((cFile: LocalCADFile) => {
          if (bFile.path === cFile.path) {
            found = true;
            if (bFile.hash !== cFile.hash) {
              cFile.change = ChangeType.UPDATE;
              toUpload.push(cFile);
            }
            return false;
          }
          return true;
        });

        // if base && !compare, add toUpload w/ size 0
        if (!found) {
          toUpload.push({
            path: bFile.path,
            size: 0,
            hash: bFile.hash,
            change: ChangeType.DELETE,
          });
        }
      });

      // if !base && compare, add toUpload
      compare.forEach((cFile: LocalCADFile) => {
        let found: boolean = false;
        base.every((bFile: LocalCADFile) => {
          if (bFile.path == cFile.path) {
            found = true;
            return false;
          }
          return true;
        });

        if (!found) {
          cFile.change = ChangeType.CREATE;
          toUpload.push(cFile);
        }
      });

      console.log(toUpload);
      setUpload(toUpload);
      await deleteFileIfExist("toUpload.json");
      await writeTextFile("toUpload.json", JSON.stringify(toUpload), {
        dir: BaseDirectory.AppLocalData,
        append: false,
      });

      // compare download and upload lists
      // intersection is conflicted files
      let conflict: string[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        const file: string = toUpload[i].path.replace(projDir, "");
        for (let j = 0; j < toDownload.length; j++) {
          if (file === toDownload[j].path) {
            console.log("conflict!");
            console.log(file);
            conflict.push(file);
            setConflictExists(true);
          }
        }
      }
      setConflict(conflict);
    } catch (err: any) {
      console.error(err.message);
    }

    setLoading(false);
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
      // TODO we probably want to force users to update to the newest client
      // version until project is a bit more stable in terms of
      // update frequency and bugs
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
      // TODO we probably want to force users to update to the newest client
      // version until client is a bit more stable in terms of
      // update frequency
      return;
    }
    navigate("/upload");
  }

  return (
    <div className={cn("", className)}>
      <Dialog defaultOpen={conflictExists} open={conflictExists}>
        <DialogContent>
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
                <div>
                  <li>{value}</li>
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
      <div className="space-x-4">
        <Button
          onClick={navigateDownload}
          disabled={download.length === 0 ? true : false}
        >
          {download.length === 0
            ? "Up to date"
            : download.length + " files ready to download"}
        </Button>
        <Button onClick={getChanges} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sync"}
        </Button>
        <Button
          onClick={navigateUpload}
          disabled={upload.length === 0 ? true : false}
        >
          {upload.length === 0
            ? "Up to date"
            : upload.length + " files ready for upload"}
        </Button>
      </div>
      <Button className="my-4" onClick={openFolder}>
        Open Project Folder
      </Button>
      <Button className="m-4" onClick={openWebsite}>
        Open Website
      </Button>
    </div>
  );
}
