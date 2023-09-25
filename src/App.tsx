import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/api/fs";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface CADFile {
  path: string,
  commit: number,
  size: number,
  hash: string,
};

interface LocalCADFile {
  path: string,
  size: number,
  hash: string
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

  async function getChanges() {
    console.log("click sync");

    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "compare.json");
    console.log(path);
    await invoke("hash_dir", { resultsPath: path });
    try {
      //const data = await fetch("http://localhost:5000/info/project");
      const data = await fetch(serverUrl + "/info/project");
      const remote: ProjectState = await data.json();
      console.log(remote);

      // write remote commit into some file
      const commit: string = remote.commit.toString();
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
            const localPath: string = local.path.replace(projectPath, "");
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
            const localPath: string = local.path.replace(projectPath, "");
            if (file.path === localPath) {
              found = true;
              if (local.hash !== file.hash || local.size != file.size) {
                toDownload.push(file); // file has been updated
              }
            }
          });
          if (!found) {
            toDownload.push(file); // file not downloaded locally
          }
        }
      });
      console.log(toDownload);
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
            hash: bFile.hash
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
          toUpload.push(cFile);
        }
      });

      console.log(toUpload);
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

    // after download, hash dir to base.json
    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });
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
    await invoke("upload_changes", {
      files: files,
      commit: newCommit,
    });

    // update base.json
    const path = await resolve(appdata, "base.json");
    await invoke("hash_dir", { resultsPath: path });
  }

  // TODO: implement
  // could probably just download everything from server/info/project
  async function resetChanges() {
    console.log("click resetChanges");
  }

  async function onSetServerUrlClick() {
    console.log(serverUrl)
    await invoke("update_server_url", { newUrl: serverUrl });
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
      <Stack spacing={2} sx={{ m: 2 }}>
        <p>Project Directory: {projDir}</p>
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
    </ThemeProvider>
  );
}

export default App;
