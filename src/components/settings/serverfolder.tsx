import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { open } from "@tauri-apps/plugin-dialog";
import { sep, join } from "@tauri-apps/api/path";
import { mkdir, exists } from "@tauri-apps/plugin-fs"; 
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "../ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useToast } from "../ui/use-toast";
import { Loader2 } from "lucide-react";

interface ServerFolderProps {
    dir: string
    cache: number
}
function ServerFolder(props: ServerFolderProps) {
    const [changeMade, setChangeMade] = useState(false)
    const [selectedFolder, setSelectedFolder] = useState(props.dir)
    const [moveFiles, setMoveFiles] = useState(true)
    const { toast } = useToast();
    const [cacheSize, setCacheSize] = useState(props.cache)
    const [progressing, setProgressing] = useState(false)
    const [completed, setCompleted] = useState(false)

    async function selectFolder() {
        const folder = await open({
            canCreateDirectories: true,
            multiple: false,
            directory: true,
        });

        if(folder) {
            setChangeMade(true);
            setCompleted(false)
            setSelectedFolder(folder)
        }
        else if (!folder){
        }
    }

    function cancelChanges() {
        setSelectedFolder(props.dir)
        setChangeMade(false);
    }

    async function clearCache() {
        setProgressing(true)
        let res = await invoke("delete_cache");
        if(res) {
            toast({
                title: "Cache cleared successfully."
            })
        }
        else {
            toast({
                title: "An error occured while clearing the cache.",
                description: "Please create an issue on the GitHub repository."
            })
        }
        setCacheSize(await invoke("get_cache_size"))
        setProgressing(false)
    }

    async function confirmChanges() {
        // make folder, but check if it exists first
        const newFolder = await join(selectedFolder, "glassyPDM")
        const folderExists: boolean = await exists(newFolder);
        if(folderExists) {
            toast({ title: "glassyPDM folder already exists; select a different location."});
            return;
        }
        await mkdir(newFolder);

        // update database and move files if applicable
        setProgressing(true)
        const res = await invoke("set_local_dir", { parentDir: selectedFolder, dir: newFolder, moveFiles: moveFiles });
        if(res) {
            setSelectedFolder(newFolder);
            toast({ title: "glassyPDM folder location set."});
        }
        else {
            toast({ title: "An error occurred while setting the new folder location."})
        }
        setProgressing(false)
        setCompleted(true)
        setChangeMade(false);
    }


    let size = cacheSize / 1024 / 1024 / 1024;
    let type = "GB"
    if (size < 1) {
        size = cacheSize / 1024 / 1024 // mb
        type = "MB"
      }
    if (size < 1) {
      size = cacheSize / 1024 // kb
      type = "KB"
    }
    if (size < 1) {
      size = cacheSize;
      type = "bytes"
    }
    let cache_size = size.toFixed(1) + " " + type

  return (
    <div className="flex flex-col space-y-4 w-full">
    <Card>
    <CardHeader>
        <CardTitle>Server Folder Location</CardTitle>
        <CardDescription>Where your project files are stored and synced.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
        <div className="flex flex-row space-x-4 items-center">
            <Button onClick={selectFolder} variant={"outline"} type="button">Set Server Folder Location</Button>
            <Label>{ changeMade ? <p>{selectedFolder}<span className="text-gray-400">{selectedFolder.charAt(selectFolder.length - 1) == sep() ? sep() : ""}glassyPDM</span></p> : <>{selectedFolder}</>}</Label>
        </div>
        <div className="flex flex-row space-x-4 items-center">
            <Switch defaultChecked={moveFiles} onCheckedChange={(e) => setMoveFiles(e)}/>
            <Label>Move project files to new location</Label>
        </div>
    </CardContent>
    <CardFooter className='flex flex-row space-x-4 items-center justify-end'>
        <Button variant={'outline'} disabled={!changeMade} onClick={cancelChanges}>Cancel Changes</Button>
        <Dialog>
            <DialogTrigger asChild>
                <Button disabled={!changeMade}>Save Changes</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>{ moveFiles ? "" : "You will need to redownload your project files."}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={confirmChanges} disabled={progressing || completed}>{progressing ? <Loader2 className="h-4 w-4 animate-spin"/> : completed ? "Done" : "Set Folder Location"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </CardFooter>
</Card>
<Card>
    <CardHeader>
        <CardTitle>File Cache</CardTitle>
        <CardDescription>Cache size: {cache_size}</CardDescription>
    </CardHeader>
    <CardContent>
    <Dialog>
        <DialogTrigger asChild>
            <Button variant={"outline"} disabled={props.cache == 0}>Clear Cache</Button>               
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Are you sure you want to clear the cache?</DialogTitle>
            <DialogDescription>Resetting files may take longer.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant={'destructive'} onClick={clearCache} disabled={progressing}>{progressing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Clear Cache"}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </CardContent>
</Card>
</div>
  )
}

export default ServerFolder