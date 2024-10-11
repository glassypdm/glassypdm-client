import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { sep, join } from "@tauri-apps/api/path";
import { mkdir, exists } from "@tauri-apps/plugin-fs"; 
import { invoke } from "@tauri-apps/api/core";

interface ServerFolderProps {
    dir: string
}
function ServerFolder(props: ServerFolderProps) {
    const [changeMade, setChangeMade] = useState(false)
    const [selectedFolder, setSelectedFolder] = useState(props.dir)

    async function selectFolder() {
        const folder = await open({
            multiple: false,
            directory: true,
        });

        if(folder) {
            setChangeMade(true);
            setSelectedFolder(folder)
        }
        else if (!folder){
        }
    }

    function cancelChanges() {
        setSelectedFolder(props.dir)
        setChangeMade(false);
    }

    async function confirmChanges() {
        // make folder, but check if it exists first
        const newFolder = await join(selectedFolder, "glassyPDM")
        const folderExists: boolean = await exists(newFolder);
        if(folderExists) {
            toast("glassyPDM folder already exists; select a different location.");
            return;
        }
        
        await mkdir(newFolder);
        setSelectedFolder(newFolder);
        setChangeMade(false);

        // update database
        // TODO handle error
        await invoke("set_local_dir", { dir: newFolder });
        toast("glassyPDM folder location set.");

    }

  return (
    <Card>
    <CardHeader>
        <CardTitle>Server Folder Location</CardTitle>
        <CardDescription>Where your project files are stored and synced.</CardDescription>
    </CardHeader>
    <CardContent>
        <div className="flex flex-row space-x-4 items-center">
            <Button onClick={selectFolder} variant={"outline"} type="button">Set Server Folder Location</Button>
            <Label>{ changeMade ? <p>{selectedFolder}<span className="text-gray-400">{sep()}glassyPDM</span></p> : <>{selectedFolder}</>}</Label>
        </div>
    </CardContent>
    <CardFooter className='flex flex-row space-x-4 items-center justify-end'>
        <Button variant={'outline'} disabled={!changeMade} onClick={cancelChanges}>Cancel Changes</Button>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button disabled={!changeMade}>Save Changes</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>You will likely need to redownload your project files.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={cancelChanges}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmChanges}>Set Folder Location</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </CardFooter>
</Card>
  )
}

export default ServerFolder