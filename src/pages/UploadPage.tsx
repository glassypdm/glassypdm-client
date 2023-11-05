import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn, deleteFileIfExist } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileTable } from "@/components/FileTable";
import { UploadLoaderProps, columns } from "@/components/FileColumn";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { CADFile, LocalCADFile } from "@/lib/types";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "../components/ui/use-toast";
import { Store } from "tauri-plugin-store-api";

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
  const [disabled, setDisabled] = useState(false);
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  async function handleClick() {
    let serverUrl: string = await invoke("get_server_url");
    let projDir: string = await invoke("get_project_dir");
    const dataDir = await appLocalDataDir();
    const storePath = await resolve(dataDir, "s3key.dat");
    const store = new Store(storePath);

    const authorID: string = user?.id || "null";

    const startTime = performance.now();

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

    setDisabled(true);

    // TODO we definitely have duplicate code here we can refactor, lmao
    console.log(toUpload);
    if (action === "Reset") {
      // if file is not in base.json, then we just need to delete the file
      // otherwise, get the s3 url from the server and download the file
      const baseStr = await readTextFile("base.json", {
        dir: BaseDirectory.AppLocalData,
      });
      const base: CADFile[] = JSON.parse(baseStr);
      for (let i = 0; i < toUpload.length; i++) {
        const relPath: string = toUpload[i].path.replace(projDir, "");
        let found: boolean = false;
        for (let j = 0; j < base.length; j++) {
          if (base[j].path === toUpload[i].path) {
            found = true;
            // from datastore, grab s3key
            // TODO properly type the store stuff
            const s3Key = (
              (await store.get(relPath.replaceAll("\\", "|"))) as any
            )["value"];

            // then fetch /download/s3/:key path
            const response = await fetch(serverUrl + "/download/s3/" + s3Key);
            const data = await response.json();
            const s3Url = data["s3Url"];

            // and download the file
            await invoke("download_s3_file", {
              link: {
                path: relPath,
                url: s3Url,
                key: s3Key,
              },
            });
            break;
          }
        }

        if (!found) {
          // delete file
          console.log("deleting a file " + toUpload[i].path);
          await invoke("delete_file", { file: relPath });
        }

        setDescription(`${i + 1} of ${i + 1} files reset`);
        setProgress((100 * (i + 1)) / toUpload.length);
      }

      // update toUpload.json
      const initUploadStr = await readTextFile("toUpload.json", {
        dir: BaseDirectory.AppLocalData,
      });
      let initUpload: LocalCADFile[] = JSON.parse(initUploadStr);
      for (let i = 0; i < toUpload.length; i++) {
        const downloadedPath: string = toUpload[i].path;
        let j = initUpload.length;
        while (j--) {
          if (initUpload[j].path == downloadedPath) {
            initUpload.splice(j, 1);
          }
        }
      }

      await deleteFileIfExist("toUpload.json");
      await writeTextFile("toUpload.json", JSON.stringify(initUpload), {
        dir: BaseDirectory.AppLocalData,
        append: false,
      });
    } else if (action === "Upload") {
      // 0. check if we have permissions to upload
      const email = user?.primaryEmailAddress?.emailAddress as string;
      const resPermission = await fetch(
        serverUrl + "/info/permissions/" + email,
      );
      const dataPermission = await resPermission.json();
      console.log(dataPermission);
      if (!dataPermission["result"]) {
        toast({
          title: "Upload failed",
          description: "Please open an issue on the GitHub page.",
        });
        setDisabled(false);
        return;
      }
      if (dataPermission["level"] < 1) {
        toast({
          title: "Upload failed",
          description:
            "You do not have write permissions. Talk to your team lead.",
        });
        setDisabled(false);
        return;
      }

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
        setDisabled(false);
        return;
        // TODO now that we return here; we can un-nest the else body
      } else {
        // do the file upload stuff
        for (let i = 0; i < fileCount; i++) {
          const key = await invoke("upload_changes", {
            file: {
              path: toUpload[i].path,
              size: toUpload[i].size,
              hash: toUpload[i].hash,
            },
            commit: newCommit,
            serverUrl: serverUrl,
            change: toUpload[i].change,
          });
          console.log(key);
          const relPath = toUpload[i].path
            .replaceAll(projDir, "")
            .replaceAll("\\", "|");
          if (key !== "oops" && key !== "deleted") {
            store.set(relPath, { value: key });
          }
          setDescription(`${i + 1} of ${fileCount} files uploaded...`);
          setProgress((100 * (i + 1)) / fileCount);
        }

        console.log("finish uploading");

        // save datastore
        store.save();

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

        await deleteFileIfExist("basecommit.txt");
        await writeTextFile("basecommit.txt", newCommit.toString(), {
          dir: BaseDirectory.AppLocalData,
          append: false,
        });

        // update toUpload
        await deleteFileIfExist("toUpload.json");
        await writeTextFile("toUpload.json", JSON.stringify(initUpload), {
          dir: BaseDirectory.AppLocalData,
          append: false,
        });
      }
    }

    const endTime = performance.now();
    toast({
      title: `${action} took ${endTime - startTime} milliseconds`,
    });

    setDescription("Complete!");
    setDisabled(false);
  }

  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl mx-4">Upload Changes</h1>
      <div className="flex justify-items-center m-3">
        <Button
          className="flex-none"
          onClick={() => navigate(-1)}
          disabled={disabled}
        >
          Close
        </Button>
        <p className="flex-auto text-center">{description}</p>
        <Button
          className="flex-none"
          disabled={
            disabled || Object.keys(selection).length == 0 || progress == 100
          }
          onClick={handleClick}
          variant={action === "Reset" ? "destructive" : "default"}
        >
          {progress == 100 ? action + " Complete" : action + " Selected"}
        </Button>
        <Select onValueChange={(e) => setAction(e)}>
          <SelectTrigger className="w-[40px]"></SelectTrigger>
          <SelectContent>
            <SelectItem value="Upload">Upload</SelectItem>
            <SelectItem value="Reset">Reset</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 mx-4">
        <Textarea
          placeholder="Type your commit message here."
          onChange={(e) => setMessage(e.target.value)}
        />
        <Progress value={progress} />
      </div>
      <div className="container mx-auto py-1">
        <FileTable
          columns={columns}
          data={files.files}
          selection={selection}
          setSelection={setSelection}
        />
      </div>
    </div>
  );
}
