import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Separator } from "./ui/separator";
import { SettingsLoaderProps } from "./SettingsLoader";
import { useLoaderData } from "react-router-dom";
import { useToast } from "./ui/use-toast";

interface SettingsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Settings({ className }: SettingsProps) {
  const defaults: SettingsLoaderProps = useLoaderData() as SettingsLoaderProps;
  const [serverURL, setServerURL] = useState(defaults.serverURL);
  const [projDir, setProjDir] = useState(defaults.projectDir);
  const { toast } = useToast();

  async function findProjectDir() {
    const selected = await open({
      multiple: false,
      directory: true,
    });

    if (selected !== null) {
      // user cancelled selection
      setProjDir(selected as string);
    }
  }

  async function saveChanges() {
    let newUrl: string = serverURL;
    if (serverURL.endsWith("/")) {
      newUrl = serverURL.substring(0, serverURL.length - 1);
      setServerURL(newUrl);
    }

    await invoke("update_server_url", { newUrl: newUrl });
    await invoke("update_project_dir", { dir: projDir as string });

    toast({
      title: "Settings saved.",
    });
  }

  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">Client Settings</h1>
      <h2 className="text-xl">Set Project Directory</h2>
      <p>Selected Project Directory: {projDir}</p>
      <Button onClick={findProjectDir}>Set Project Directory</Button>
      <Separator className="my-5" />
      <h2 className="text-xl">Set Server URL</h2>
      <Input
        className="w-3/4"
        id="server_url"
        onChange={(e: any) => setServerURL(e.target.value)}
        value={serverURL}
      />
      <Separator className="my-5" />
      <Button onClick={saveChanges}>Save Changes</Button>
    </div>
  );
}
