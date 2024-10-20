import { useAuth } from "@clerk/clerk-react"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { useToast } from "../ui/use-toast";
import { invoke } from "@tauri-apps/api/core";

interface DFRButtonProps {
    projectId: number
    path: string
    commitId: number
    frno: number
}

function DownloadFileRevisionButton(props: DFRButtonProps) {
    const { userId } = useAuth();
    const [downloading, setDownloading] = useState(false)
    const { toast } = useToast();



    async function hehez() {
        setDownloading(true)
        const filename = props.path.split('\\')[props.path.split('\\').length - 1]
        // prompt user for download location, default to downloads folder
        console.log(filename)
        let filters = []
        if(filename.split('.').length > 1) {
            filters.push({
                name: "",
                extensions: [ filename.split('.')[filename.split('.').length - 1] ]
            })
        }

        const downloadPath = await save({
            canCreateDirectories: true,
            defaultPath: filename,
            filters: filters
        })
        if(!downloadPath) {
            setDownloading(false)
            toast({
                title: "File not downloaded",
                description: "No path was selected."
            })
            return;
        }
        console.log(downloadPath)

        let res = await invoke("download_single_file", {
            pid: props.projectId,
            path: props.path,
            commitId: props.commitId,
            userId: userId,
            downloadPath: downloadPath
        })
        if(!res) {
            toast({
                title: "An error occurred"
            });
            return;
        }
        toast({
            title: `Revision ${props.frno} of ${filename} successfully downloaded to ${downloadPath}`
        });
        setDownloading(false)
    }

    if(userId == null || userId == "") {
        return <Button variant={'outline'} size={'sm'} className="text-xs font-normal" onClick={hehez} disabled><Loader2 className="w-4 h-4 animate-spin"/></Button>;
    }
    return (
        <Button variant={'outline'} size={'sm'} className="text-xs font-normal" onClick={hehez} disabled={downloading}>
            { downloading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Download"}
        </Button>
    )
}

export default DownloadFileRevisionButton