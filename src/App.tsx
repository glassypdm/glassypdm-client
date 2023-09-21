import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Button, Stack } from "@mui/material";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { appLocalDataDir } from "@tauri-apps/api/path";
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

function App() {
  const [greetMsg, setGreetMsg] = useState("hehe");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  async function getChanges() {
    console.log("click getChanges");
    await invoke("get_changes", { resultsPath: "..\\compare.json" });

    // read compare.json and base.json and compare them
  }

  async function downloadChanges() {
    console.log("click downloadChanges");
    console.log(await invoke("get_project_dir"));
    // TODO: on download, ensure that:
    // - there are no current changes (i.e. compare == base)
    // then download changes
  }

  async function uploadChanges() {
    console.log("click uploadChanges");
    const appdata = await appLocalDataDir();
    console.log(appdata);

    invoke("upload_changes", {
      files: [
        "C:\\FSAE\\24cad\\shade.SLDPRT"
      ]
    });
  }

  async function resetChanges() {
    console.log("click resetChanges");
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
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
