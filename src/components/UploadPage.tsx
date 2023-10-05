import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DownloadTable } from "@/components/DownloadTable";
import { UploadLoaderProps, columns } from "@/components/DownloadColumns";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { LocalCADFile } from "@/lib/types";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "./ui/textarea";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "./ui/use-toast";

interface UploadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UploadPage({ className }: UploadPageProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { toast } = useToast();
  const files: UploadLoaderProps = useLoaderData() as UploadLoaderProps;
  const [selection, setSelection] = useState<RowSelectionState>(
    files.selectionList,
  );
  const [action, setAction] = useState("Upload");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  async function handleClick() {
    let serverUrl: string = await invoke("get_server_url");

    console.log(action);
    console.log(message);
    const authorID: string = user?.id || "null";

    // get paths for upload/reset
    let toUpload: LocalCADFile[] = [];
    for (let i = 0; i < Object.keys(selection).length; i++) {
      let key: string = Object.keys(selection)[i];
      const idx = parseInt(key);
      toUpload.push({
        path: files.files[idx].file.path,
        size: files.files[idx].file.size,
        hash: files.files[idx].file.hash,
        change: files.files[idx].file.change,
      });
    }

    console.log(toUpload);
    if (action === "Reset") {
      // TODO
    } else if (action === "Upload") {
      // 1. post to /commit
      const commitStr = await readTextFile("basecommit.txt", {
        dir: BaseDirectory.AppLocalData,
      });
      let newCommit: number = parseInt(commitStr) + 1;
      const fileCount: number = toUpload.length;
      const rawResponse = await fetch(serverUrl + "/commit", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        // TODO spin into some interface in types.tsx
        body: JSON.stringify({
          commitid: newCommit,
          projectID: 0, // TODO don't hardcode
          authorID: authorID,
          message: message,
          fileCount: fileCount,
        }),
      });
      const response = await rawResponse.json();

      // 2. if successful, invoke upload file
      if (!response["isCommitFree"]) {
        toast({
          title: "File upload rejected",
          description: "Re-sync and download new files from the server.",
        });
      } else {
        // do the file upload stuff
        for (let i = 0; i < fileCount; i++) {
          await invoke("upload_changes", {
            file: {
              path: toUpload[i].path,
              size: toUpload[i].size,
              hash: toUpload[i].hash,
            },
            commit: newCommit,
            serverUrl: serverUrl,
          });

          setProgress((100 * (i + 1)) / fileCount);
        }

        console.log("finish uploading");

        // remove items that were in toUpload from toUpload.json
        const str = await readTextFile("toUpload.json", {
          dir: BaseDirectory.AppLocalData,
        });
        let initUpload: LocalCADFile[] = JSON.parse(str);
        for (let i = 0; i < toUpload.length; i++) {
          const downloadedPath: string = toUpload[i].path;
          let j = initUpload.length;
          while (j--) {
            if (initUpload[j].path == downloadedPath) {
              initUpload.splice(j, 1);
            }
          }
        }
        // ignore files that we did not upload
        let ignoreList: string[] = [];
        for (let i = 0; i < initUpload.length; i++) {
          ignoreList.push(initUpload[i].path);
        }
        console.log(ignoreList);

        // afterwards update base.json and basecommit.txt
        const appdata = await appLocalDataDir();
        const path = await resolve(appdata, "base.json");
        await invoke("hash_dir", { resultsPath: path, ignoreList: ignoreList });
        await writeTextFile("basecommit.txt", newCommit.toString(), {
          dir: BaseDirectory.AppLocalData,
        });

        // update toUpload
        await writeTextFile("toUpload.json", JSON.stringify(initUpload), {
          dir: BaseDirectory.AppLocalData,
        });
      }
    }
  }

  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">Upload Changes</h1>
      <div className="flex m-2">
        <Button className="left-0" onClick={() => navigate(-1)}>
          Close
        </Button>
        <Button
          className="absolute right-20"
          disabled={Object.keys(selection).length == 0 || progress == 100}
          onClick={handleClick}
          variant={action === "Reset" ? "destructive" : "default"}
        >
          {progress == 100 ? action + " Complete" : action + " Selected"}
        </Button>
        <Select onValueChange={(e) => setAction(e)}>
          <SelectTrigger className="w-[40px] absolute right-10"></SelectTrigger>
          <SelectContent>
            <SelectItem value="Upload">Upload</SelectItem>
            <SelectItem value="Reset">Reset</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Textarea
          placeholder="Type your commit message here."
          onChange={(e) => setMessage(e.target.value)}
        />
        <Progress className="" value={progress} />
      </div>
      <div className="container mx-auto py-1">
        <DownloadTable
          columns={columns}
          data={files.files}
          selection={selection}
          setSelection={setSelection}
        />
      </div>
    </div>
  );
}
