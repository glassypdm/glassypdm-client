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

const pubkey = "temp, lol";

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

    // TODO: on download, regenerate base.json
  }

  async function uploadChanges() {
    console.log("click uploadChanges");
    const appdata = await appLocalDataDir();
    console.log(appdata);
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline/>
      <ClerkProvider publishableKey={pubkey}>
      <Stack direction="row" spacing={3} justifyContent="center" alignItems="stretch">
        <Button variant="contained" onClick={downloadChanges}>Download</Button>
        <Button variant="contained" onClick={getChanges}>Sync</Button>
        <Button variant="contained" onClick={uploadChanges}>Upload</Button>
      </Stack>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      </ClerkProvider>

    </ThemeProvider>
  );
}

export default App;
