import { useAuth } from "@clerk/clerk-react"
import { Button } from "../ui/button"
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface DFRButtonProps {
    projectId: number
    path: string
    commitId: number
}

function DownloadFileRevisionButton(props: DFRButtonProps) {
    const { userId } = useAuth();
    const [downloading, setDownloading] = useState(false)



    function hehez() {
        setDownloading(true)
        // prompt user for download location, default to downloads folder
        // download things to cache if needed
        // assemble file to download location
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