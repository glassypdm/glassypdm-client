import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import {
  BASE_COMMIT_FILE,
  BASE_JSON_FILE,
  S3KEY_DAT_FILE,
  cn,
  updateAppDataFile,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileTable } from "@/components/FileTable";
import { UploadLoaderProps, columns } from "@/components/FileColumn";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { CADFile, Change } from "@/lib/types";
import { readTextFile } from "@tauri-apps/api/fs";
import { listen } from "@tauri-apps/api/event";
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
import { error, info, trace } from "tauri-plugin-log-api";

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

  async function handleAction() {
    let serverUrl: string = await invoke("get_server_url");
    let projDir: string = await invoke("get_project_dir");
    const dataDir = await appLocalDataDir();
    const storePath = await resolve(dataDir, S3KEY_DAT_FILE);
    const store = new Store(storePath);

    const authorID: string = user?.id || "null";

    const startTime = performance.now();

    // get paths for upload/reset
    let toUpload: Change[] = [];
    for (let i = 0; i < Object.keys(selection).length; i++) {
      let key: string = Object.keys(selection)[i];
      const idx = parseInt(key);
      toUpload.push({
        file: {
          path: files.files[idx].file.path,
          size: files.files[idx].file.size,
          hash: files.files[idx].file.hash,
        },
        change: files.files[idx].file.change,
      });
    }

    setDisabled(true);

    console.log(toUpload);
    if (action === "Reset") {
      info("resetting files");
      // if file is not in base.json, then we just need to delete the file
      // otherwise, get the s3 url from the server and download the file
      const baseStr = await readTextFile(BASE_JSON_FILE, {
        dir: BaseDirectory.AppLocalData,
      });
      const base: CADFile[] = JSON.parse(baseStr);
      for (let i = 0; i < toUpload.length; i++) {
        const relPath: string = toUpload[i].file.path.replace(projDir, "");
        let found: boolean = false;
        for (let j = 0; j < base.length; j++) {
          if (base[j].path === toUpload[i].file.path) {
            info("resetting" + relPath);
            found = true;
            // from datastore, grab s3key
            // TODO properly type the store stuff
            const s3Key = (await store.get(relPath)) as any;
            console.log(s3Key);
            if (!s3Key) {
              error(`s3key for ${relPath} is not found in cache.`);
              toast({
                title: "Issue resetting a file",
                description: `Couldn't reset ${relPath}. Try re-syncing.`,
              });
              setDisabled(false);
              return;
            }
            trace("found s3 key");

            // then fetch /download/s3/:key path
            console.log(serverUrl + "/download/s3/" + s3Key);
            const response = await fetch(serverUrl + "/download/s3/" + s3Key);
            const data = await response.json();
            const s3Url = data["s3Url"];
            trace("found s3 url");

            // and download the file
            const result = await invoke("download_s3_file", {
              link: {
                relPath: relPath,
                s3Url: s3Url,
                key: s3Key,
              },
            });
            if (!result) {
              error("couldn't download previous revision");
              toast({
                title: "Error encountered",
                description:
                  "Couldn't reset file. Try exiting any programs that have opened your file and try again.",
              });
              setDisabled(false);
              return;
            }
            info("downloaded previous revision");
            break;
          }
        }

        if (!found) {
          // delete file
          info(`deleting file ${toUpload[i].file.path}`);
          await invoke("delete_file", { file: relPath });
        }

        setDescription(`${i + 1} of ${toUpload.length} files reset`);
        setProgress((100 * (i + 1)) / toUpload.length);
      }

      // update toUpload.json
      await invoke("update_upload_list", { changes: toUpload });
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
      const commitStr = await readTextFile(BASE_COMMIT_FILE, {
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
      // TODO type the response
      const response = await rawResponse.json();

      // 2. if successful, invoke upload file
      if (!response["isCommitFree"]) {
        toast({
          title: "File upload rejected",
          description: "Re-sync and download new files from the server.",
        });
        setDisabled(false);
        return;
      }

      const unlisten = await listen("uploadStatus", (event) => {
        console.log(event.payload);
        const output: any = event.payload; // TODO type the payload
        if (output.s3 !== "oops" || output.s3 !== "delete") {
          store.set(output.rel_path, output.s3);
          store.save();
        }

        setDescription(
          `${output.uploaded} of ${output.total} files uploaded...`,
        );
        setProgress((100 * output.uploaded) / output.total);
      });

      await invoke("upload_files", {
        commit: newCommit,
        serverUrl: serverUrl,
        files: toUpload,
      });

      info("finished uploading files");

      // update toUpload.json
      let initUpload: Change[] = await invoke("update_upload_list", {
        changes: toUpload,
      });

      // ignore files that we did not upload
      let ignoreList: string[] = [];
      for (let i = 0; i < initUpload.length; i++) {
        ignoreList.push(initUpload[i].file.path);
      }

      // afterwards update base.json and basecommit.txt
      const appdata = await appLocalDataDir();
      const path = await resolve(appdata, BASE_JSON_FILE);
      await invoke("hash_dir", { resultsPath: path, ignoreList: ignoreList });

      await updateAppDataFile(BASE_COMMIT_FILE, newCommit.toString());

      unlisten();
    }

    const endTime = performance.now();
    const delta =
      Math.round((endTime - startTime + Number.EPSILON) * 100) / 100;
    toast({
      title: `${action} took ${delta} milliseconds to complete`,
    });
    info(`${action} took ${delta} milliseconds`);
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
          onClick={handleAction}
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
