import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Button, LinearProgress, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import { open } from '@tauri-apps/api/dialog';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// TODO combine CADFile and LocalCADFile
interface CADFile {
  path: string,
  commit: number,
  size: number,
  hash: string,
};

enum ChangeType {
  CREATE,
  UPDATE,
  DELETE,
  UNIDENTIFIED
}

interface LocalCADFile {
  path: string,
  size: number,
  hash: string
  change?: ChangeType
}

interface ProjectState {
  commit: number,
  files: CADFile[]
};

const projectPath: string = await invoke("get_project_dir");
const initServerUrl: string = await invoke("get_server_url");
function App() {
  const [projDir, setProjDir] = useState(projectPath);
  const [serverUrl, setServerUrl] = useState(initServerUrl);
  const [upload, setUpload] = useState<LocalCADFile[]>([]);
  const [download, setDownload] = useState<CADFile[]>([]);
  const [progress, setProgress] = useState(0);

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
      setUpload(toUpload);
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
      setProgress(i * 100/ length);
    }

    console.log("finish downloading");
    // after download, hash dir to base.json
    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });
    setDownload([]);
    setProgress(0);
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
      console.log(files[i]);
      await invoke("upload_changes", {
        file: {
          path: files[i].path,
          size: files[i].size,
          hash: files[i].hash
        },
        commit: newCommit,
        serverUrl: serverUrl
      });
      setProgress(i * 100 / length);
    }

    // update base.json
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });

    setUpload([]);
    setProgress(0);
  }

  // TODO: implement
  // could probably just download everything from server/info/project
  async function resetChanges() {
    console.log("click resetChanges");
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
      <Stack spacing={2} sx={{ m: 2 }}>
        <Stack direction="row" spacing={2} sx={{ m: 2 }}>
          <p>Project Directory: {projDir}</p>
          <Button variant="contained" onClick={setProjectDir}>Set Project Directory</Button>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ m: 2 }}>
          <TextField fullWidth id="server_url" value={serverUrl} onChange={(event: any) => {setServerUrl(event.target.value)}}label="Server URL" variant="outlined" />
          <Button onClick={onSetServerUrlClick}>Set Server URL</Button>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={3} justifyContent="center" alignItems="stretch">
        <Button variant="contained" onClick={downloadChanges}>Download</Button>
        <Button variant="contained" onClick={getChanges}>Sync</Button>
        <Button variant="contained" onClick={uploadChanges}>Upload</Button>
        <Button variant="contained" color="warning" onClick={resetChanges}>Reset Changes</Button>
      </Stack>
      <LinearProgress variant="determinate" value={progress} />
      <Stack>
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
      <p>to upload:</p>
      <ul>
        {
          upload.map((file: LocalCADFile) => {
            let output: string = file.path.replace(projDir, "");
            let type: string = "";
            switch(file.change) {
              case ChangeType.CREATE:
                type = "(+)";
                break;
              case ChangeType.UPDATE:
                type = "(+/-)";
                break;
              case ChangeType.DELETE:
                type = "(-)";
                break;
            }
            return(
              <li>{output} {type}</li>
            )
          })
        }
      </ul>
    </Stack>
    </ThemeProvider>
  );
}

export default App;
