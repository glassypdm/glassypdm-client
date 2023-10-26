import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn, getAbsolutePath, updateApplicationDataFile } from "@/lib/utils";
import { Button } from "../components/ui/button";
import { FileTable } from "../components/FileTable";
import { DownloadLoaderProps, columns } from "../components/FileColumn";
import { Progress } from "../components/ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { CADFile, DownloadFile, LocalCADFile } from "@/lib/types";
import { readTextFile } from "@tauri-apps/api/fs";
import { Store } from "tauri-plugin-store-api";

interface DownloadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DownloadPage(props: DownloadPageProps) {
  const files: DownloadLoaderProps = useLoaderData() as DownloadLoaderProps;
  const [selection, setSelection] = useState<RowSelectionState>(
    files.selectionList,
  );
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const navigate = useNavigate();

  async function handleDownload() {
    const serverUrl: string = await invoke("get_server_url");
    const dataDir = await appLocalDataDir();
    const storePath = await resolve(dataDir, "s3key.dat");
    const store = new Store(storePath);
    console.log(storePath);
    console.log("downloading files");
    console.log(selection);
    setDisabled(true);

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
    console.log(selectedDownload);
    const length = selectedDownload.length;
    for (let i = 0; i < length; i++) {
      const file: DownloadFile = selectedDownload[i];
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
      setProgress((100 * (i + 1)) / length);
    }

    console.log("finish downloading");

    // determine which files to ignore whilst hashing
    const uploadStr = await readTextFile("toUpload.json", {
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
    await updateApplicationDataFile(
      "toUpload.json",
      JSON.stringify(newUploadList),
    );

    // remove items that were in toDownload from toDownload.json
    const str = await readTextFile("toDownload.json", {
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
    await updateApplicationDataFile(
      "toDownload.json",
      JSON.stringify(selectedDownload),
    );

    // save store
    await store.save();
    setDisabled(false);
  }

  return (
    <div className={cn("", props.className)}>
      <h1 className="text-2xl">Download Changes</h1>
      <div className="m-2">
        {/** page header */}
        <Button
          className="left-0"
          onClick={() => navigate(-1)}
          disabled={disabled}
        >
          Close
        </Button>
        <Button
          className="absolute right-10"
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
