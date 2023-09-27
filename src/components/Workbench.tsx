import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { open } from '@tauri-apps/api/dialog';
import '@/App.css';
import { LocalChanges } from '@/components/LocalChanges';
import { Toaster } from '@/components/ui/toaster';
import { LocalCADFile, CADFile, ProjectState, ChangeType } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';


const projectPath: string = await invoke("get_project_dir");
const initServerUrl: string = await invoke("get_server_url");
export function Workbench() {
  const [projDir, setProjDir] = useState(projectPath);
  const [serverUrl, setServerUrl] = useState(initServerUrl);
  const [upload, setUpload] = useState(false);
  const [download, setDownload] = useState<CADFile[]>([]);

  async function getChanges() {
    console.log("click sync");

    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "compare.json");
    console.log(path);
    await invoke("hash_dir", { resultsPath: path });
    try {
      const data = await fetch(serverUrl + "/info/project");
      const remote: ProjectState = await data.json();
      console.log(remote);

      // write remote commit into some file
      const commit: string = remote.commit?.toString() || "0";
      await writeTextFile("basecommit.txt", commit, { dir: BaseDirectory.AppLocalData });

      let contents = await readTextFile("base.json", { dir: BaseDirectory.AppLocalData });
      const base = JSON.parse(contents);

      contents = await readTextFile("compare.json", { dir: BaseDirectory.AppLocalData });
      const compare = JSON.parse(contents);

      // for getting what to download
      let toDownload: CADFile[] = [];
      // for each file in remote:
      remote.files.forEach( (file: CADFile) => {
        if(file.size === 0) {
          let found: boolean = false;
          base.every( (local: any) => {
            // adjust path
            const localPath: string = local.path.replace(projDir, "");
            if (file.path === localPath) {
              found = true;
              return false;
            }
            return true;
          });
          if (found) {

            toDownload.push(file); // file not deleted locally
          }
        }
        else {
          let found: boolean = false;
          base.forEach( (local: any) => {
            // adjust path
            const localPath: string = local.path.replace(projDir, "");
            if (file.path === localPath) {
              found = true;
              if (local.hash !== file.hash || local.size != file.size) {
                toDownload.push(file); // file has been updated
              }
            }
          });
          if (!found) {
            console.log("not found locally")
            toDownload.push(file); // file not downloaded locally
          }
        }
      });
      console.log(toDownload);
      setDownload(toDownload);
      await writeTextFile("toDownload.json", JSON.stringify(toDownload), { dir: BaseDirectory.AppLocalData });

      // for getting what to upload, compare base.json with compare.json
      let toUpload: LocalCADFile[] = [];

      base.forEach( (bFile: LocalCADFile) => {
        // if base && compare, add toUpload if size, hash is different
        let found: boolean = false;
        compare.every( (cFile: LocalCADFile) => {
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
            change: ChangeType.DELETE
          });
        }
      });

      // if !base && compare, add toUpload
      compare.forEach( (cFile: LocalCADFile) => {
        let found: boolean = false;
        base.every( (bFile: LocalCADFile) => {
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
      setUpload(toUpload.length != 0);
      await writeTextFile("toUpload.json", JSON.stringify(toUpload), { dir: BaseDirectory.AppLocalData });
    } catch(err: any) {
      console.error(err.message);
    }
  }

  async function downloadChanges() {
    console.log("click downloadChanges");
    const projectDir: string = await invoke("get_project_dir");
    console.log(projectDir);
    setProjDir(projectDir);

    // TODO: before downloading, ensure that base.json == compare.json
    
    // download files
    // first get s3 presigned links
    const length = download.length;
    for(let i = 0; i < length; i++){
      const file: CADFile = download[i];
      if(file.size != 0) {
        const key: string = file.path.replaceAll("\\", "|");
        console.log(key);
        const response = await fetch(serverUrl + "/download/file/" + key);
        const s3Url = (await response.json())["s3Url"];
        console.log(s3Url);
        await invoke("download_s3_file", { link: {
          path: file.path,
          url: s3Url
        }});
      }
      else {
        console.log("deleting file " + file.path);
        await invoke("delete_file", { file: file.path });
      }


      // handle progress bar
    }

    console.log("finish downloading");
    // after download, hash dir to base.json
    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });
    setDownload([]);
  }

  async function uploadChanges() {
    console.log("click uploadChanges");
    const appdata = await appLocalDataDir();
    console.log(appdata);
    const contents = await readTextFile("toUpload.json", { dir: BaseDirectory.AppLocalData });
    const files = JSON.parse(contents);

    // TODO ensure base == remote before uploading
    // TODO mutex?
    
    // get commit of base
    const commitStr = await readTextFile("basecommit.txt", { dir: BaseDirectory.AppLocalData });
    let newCommit: number = parseInt(commitStr);
    newCommit += 1;

    // upload files
    const length: number = files.length;
    for(let i = 0; i < length; i++) {
      await invoke("upload_changes", {
        file: {
          path: files[i].path,
          size: files[i].size,
          hash: files[i].hash
        },
        commit: newCommit,
        serverUrl: serverUrl
      });
    }

    // update base.json
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });

    setUpload(false);
  }

  async function onSetServerUrlClick() {
    console.log(serverUrl)
    let newUrl: string = serverUrl;
    if(serverUrl.endsWith('/')) {
      newUrl = serverUrl.substring(0, serverUrl.length - 1)
      setServerUrl(newUrl);
    }
    // TODO: if the end of serverURL is /, we want to remove it
    await invoke("update_server_url", { newUrl: newUrl });
  }

  async function setProjectDir() {
    const selected = await open({
      multiple: false,
      directory: true,
    });

    if(selected === null) {
      // user cancelled selection
    }
    else {
      // user selected a directory
      console.log(selected)
      setProjDir(selected as string);
      await invoke("update_project_dir", { dir: selected as string });
    }
  }

  return (
    <div>
      <div>
        <div>
          <p>Project Directory: {projDir}</p>
          <Button onClick={setProjectDir}>Set Project Directory</Button>
        </div>
        <div>
          <Input id="server_url" value={serverUrl} onChange={(event: any) => {setServerUrl(event.target.value)}}/>
          <Button variant="secondary" onClick={onSetServerUrlClick}>Set Server URL</Button>
        </div>
      </div>
      <div>
        <Button onClick={downloadChanges}>Download</Button>
        <Button onClick={getChanges}>Sync</Button>
        <Button onClick={uploadChanges}>Upload</Button>
      </div>
      <div>
      <p>to download:</p>
      <ul>
        {
          download.map((file: CADFile) => {
            let output: string = file.path;
            return(
              <li>{output}</li>
            )
          })
        }
      </ul>
    </div>
    <LocalChanges upload={upload} />
    <Toaster/>
    </div>
  );
}