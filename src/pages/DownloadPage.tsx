import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import {
  DOWNLOAD_JSON_FILE,
  S3KEY_DAT_FILE,
  UPLOAD_JSON_FILE,
  cn,
  delay,
  getAbsolutePath,
  updateAppDataFile,
} from "@/lib/utils";
import { Button } from "../components/ui/button";
import { FileTable } from "../components/FileTable";
import { DownloadLoaderProps, columns } from "../components/FileColumn";
import { Progress } from "../components/ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { CADFile, DownloadFile, LocalCADFile } from "@/lib/types";
import { readTextFile } from "@tauri-apps/api/fs";
import { Store } from "tauri-plugin-store-api";
import { useToast } from "@/components/ui/use-toast";

interface DownloadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DownloadPage(props: DownloadPageProps) {
  const files: DownloadLoaderProps = useLoaderData() as DownloadLoaderProps;
  const [selection, setSelection] = useState<RowSelectionState>(
    files.selectionList,
  );
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleDownload() {
    const serverUrl: string = await invoke("get_server_url");
    const dataDir = await appLocalDataDir();
    const storePath = await resolve(dataDir, S3KEY_DAT_FILE);
    const store = new Store(storePath);
    console.log(storePath);
    console.log("downloading files");
    console.log(selection);
    setDisabled(true);

    // time function
    const startTime = performance.now();

    // get paths for download
    let selectedDownload: DownloadFile[] = [];
    for (let i = 0; i < Object.keys(selection).length; i++) {
      let key: string = Object.keys(selection)[i];
      const idx = parseInt(key);
      selectedDownload.push({
        path: files.files[idx].file.path,
        size: files.files[idx].file.size,
      });
    }

    // download files
    const length = selectedDownload.length;
    let cnt = 0;
    await Promise.all(
      selectedDownload.map(async (file: DownloadFile) => {
        if (file.size != 0) {
          const key: string = file.path.replaceAll("\\", "|");
          console.log(key);

          // get s3 url
          const response = await fetch(serverUrl + "/download/file/" + key);
          const data = await response.json();
          const s3Url = data["s3Url"];
          const s3Key = data["key"];
          console.log(s3Url);
          console.log(s3Key);

          // save key in store
          await store.set(key, { value: s3Key });

          // have rust backend download the file
          await invoke("download_s3_file", {
            link: {
              path: file.path,
              url: s3Url,
              key: s3Key,
            },
          });
        } else {
          console.log("deleting file " + file.path);
          await invoke("delete_file", { file: file.path });
        }
        // handle progress bar
        setProgress((100 * ++cnt) / length);
        setDescription(`${cnt} of ${length} downloaded...`);
        await delay(2);
      }),
    );

    console.log("finish downloading");

    setDescription("Updating local data...");
    // determine which files to ignore whilst hashing
    const uploadStr = await readTextFile(UPLOAD_JSON_FILE, {
      dir: BaseDirectory.AppLocalData,
    });
    const toUpload: LocalCADFile[] = JSON.parse(uploadStr);
    const newUploadList: LocalCADFile[] = [];
    let ignoreList: string[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      let found = false;

      // iterate through selected download list
      for (let j = 0; j < selectedDownload.length; j++) {
        const absolute: string = await getAbsolutePath(
          selectedDownload[j].path,
        );
        if (absolute === toUpload[i].path) {
          found = true;
          break;
        }
      }

      // if not found, add it to ignore list
      if (!found) {
        newUploadList.push(toUpload[i]);
        ignoreList.push(toUpload[i].path);
      }
    }

    // after download, hash dir to base.json
    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path, ignoreList: ignoreList });

    // update toUpload.json
    await updateAppDataFile(UPLOAD_JSON_FILE, JSON.stringify(newUploadList));

    // remove items that were in toDownload from toDownload.json
    const str = await readTextFile(DOWNLOAD_JSON_FILE, {
      dir: BaseDirectory.AppLocalData,
    });
    let initDownload: CADFile[] = JSON.parse(str);
    for (let i = 0; i < selectedDownload.length; i++) {
      const downloadedPath: string = selectedDownload[i].path;
      let j = initDownload.length;
      while (j--) {
        if (initDownload[j].path == downloadedPath) {
          initDownload.splice(j, 1);
        }
      }
    }

    // update toDownload
    await updateAppDataFile(DOWNLOAD_JSON_FILE, JSON.stringify(initDownload));

    // save store
    await store.save();
    setDisabled(false);

    // stop timing function
    const endTime = performance.now();
    toast({
      title: `Download took ${endTime - startTime} milliseconds`,
    });
    setDescription("Complete!");
  }

  return (
    <div className={cn("", props.className)}>
      <h1 className="text-2xl mx-4">Download Changes</h1>
      <div className="flex flex-row justify-items-center m-3">
        {/** page header */}
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
          onClick={handleDownload}
          disabled={
            disabled || Object.keys(selection).length == 0 || progress == 100
          }
        >
          {progress == 100 ? "Download Complete" : "Download Selected"}
        </Button>
      </div>
      <Progress className="" value={progress} />
      <div className="container mx-auto py-10">
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
