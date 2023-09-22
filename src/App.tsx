import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Button, Stack } from "@mui/material";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir } from "@tauri-apps/api/path";
import { readTextFile, BaseDirectory } from "@tauri-apps/api/fs";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  RedirectToSignIn,
} from "@clerk/clerk-react";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const pubkey = "";
const owo = await invoke("get_project_dir");
function App() {
  const [projDir, setProjDir] = useState(owo);

  async function getChanges() {
    console.log("click sync");

    const appdata = await appLocalDataDir();
    const path = await resolve(appdata, "compare.json");
    console.log(path);
    await invoke("get_changes", { resultsPath: path });
    
    // TODO: make a GET call for info/state, store files into remote.json, compare w/ base.json
    // for each file in remote.json:
    // - if size == zero and it exists in base.json, then we need to delete the local copy
    // - if size == zero and it does NOT exist locally, then we can skip it
    // - if a file is present in remote.json but missing in base.json, then we need to download it
    // - if a file is different (size/hash) between remote and base, then we need to download it
  }

  async function downloadChanges() {
    console.log("click downloadChanges");
    const tmp: string = await invoke("get_project_dir");
    console.log(tmp);
    setProjDir(tmp);

    // TODO: before downloading, ensure that base.json == current.json
  }

  async function uploadChanges() {
    console.log("click uploadChanges");
    const appdata = await appLocalDataDir();
    console.log(appdata);
    const contents = await readTextFile("compare.json", { dir: BaseDirectory.AppLocalData });
    const files = JSON.parse(contents);

    invoke("upload_changes", {
      files: files,
      commit: 0,
    });
  }

  async function resetChanges() {
    console.log("click resetChanges");
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
      <p>Project Directory: {projDir}</p>
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
