import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DownloadTable } from "./DownloadTable";
import { DownloadLoaderProps, columns } from "./DownloadColumns";
import { Progress } from "./ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { CADFile, DownloadFile } from "@/lib/types";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";

interface DownloadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DownloadPage(props: DownloadPageProps) {
  const files: DownloadLoaderProps = useLoaderData() as DownloadLoaderProps;
  const [selection, setSelection] = useState<RowSelectionState>(
    files.selectionList,
  );
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  async function handleDownload() {
    const serverUrl: string = await invoke("get_server_url");
    console.log("downloading files");
    console.log(selection);

    // get paths for download
    let toDownload: DownloadFile[] = [];
    for (let i = 0; i < Object.keys(selection).length; i++) {
      let key: string = Object.keys(selection)[i];
      const idx = parseInt(key);
      toDownload.push({
        path: files.files[idx].file.path,
        size: files.files[idx].file.size,
      });
    }

    // download files
    console.log(toDownload);
    const length = toDownload.length;
    for (let i = 0; i < length; i++) {
      const file: DownloadFile = toDownload[i];
      if (file.size != 0) {
        const key: string = file.path.replaceAll("\\", "|");
        console.log(key);
        // get s3 url
        const response = await fetch(serverUrl + "/download/file/" + key);
        const s3Url = (await response.json())["s3Url"];
        console.log(s3Url);

        // have rust backend download the file
        await invoke("download_s3_file", {
          link: {
            path: file.path,
            url: s3Url,
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
    // after download, hash dir to base.json
    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });

    // remove items that were in toDownload from toDownload.json
    const str = await readTextFile("toDownload.json", {
      dir: BaseDirectory.AppLocalData,
    });
    let initDownload: CADFile[] = JSON.parse(str);
    for (let i = 0; i < toDownload.length; i++) {
      const downloadedPath: string = toDownload[i].path;
      let j = initDownload.length;
      while (j--) {
        if (initDownload[j].path == downloadedPath) {
          initDownload.splice(j, 1);
        }
      }
    }

    // update toDownload
    await writeTextFile("toDownload.json", JSON.stringify(initDownload), {
      dir: BaseDirectory.AppLocalData,
    });
  }

  return (
    <div className={cn("", props.className)}>
      <h1 className="text-2xl">Download Changes</h1>
      <div className="m-2">
        {/** page header */}
        <Button className="left-0" onClick={() => navigate(-1)}>
          Close
        </Button>
        <Button
          className="absolute right-10"
          onClick={handleDownload}
          disabled={Object.keys(selection).length == 0 || progress == 100}
        >
          {progress == 100 ? "Download Complete" : "Download Selected"}
        </Button>
      </div>
      <Progress className="" value={progress} />
      <div className="container mx-auto py-10">
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
