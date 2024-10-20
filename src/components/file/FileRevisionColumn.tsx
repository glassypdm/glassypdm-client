import { ColumnDef } from "@tanstack/react-table"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"
import DownloadFileRevisionButton from "./DownloadFileRevisionButton"


export type FileRevision = {
    filerevision_id: number
    path: string
    filerevision_number: number
    changetype: number
    filesize: number
    commit_id: number
    project_id: number
}

export const columns: ColumnDef<FileRevision>[] = [
    {
        accessorKey: "path",
        header: "File",
        cell: ({ row }) => {
            const fr = row.original
            let color: string = "";
            let symbol: string = "";
            switch (fr.changetype) {
              case 1:
                color = "text-green-400";
                symbol = "(+)";
                break;
              case 2:
                color = "text-blue-200";
                symbol = "(+/-)";
                break;
              case 3:
                color = "text-red-400";
                symbol = "(-)";
                break;
              default:
                symbol = "(?)";
                break;
            }
            return (
                <div className="flex flex-row items-center space-x-2 w-[525px]">
                    <Badge variant={'secondary_no_hover'}>v{fr.filerevision_number}</Badge>
                    <div className={cn(color, "text-xs  text-wrap break-words")}>{symbol} {fr.path}</div>
                </div>
            )
        }
    },
    {
        accessorKey: "filesize",
        header: "File size",
        cell: ({ row }) => {
            const fr = row.original;
            let size = fr.filesize >> 20;
            let unit = "MB"
            if (size < 1) {
              size = Math.round(fr.filesize / 1024) // kb
              unit = "KB"
            }
            if (size < 1) {
              size = fr.filesize;
              unit = "bytes"
            }
            return (
              <p>
                {size} {unit}
              </p>
            );
          },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const fr = row.original

            return (
                <div className="flex flex-row space-x-2 w-full justify-center">
                    <DownloadFileRevisionButton projectId={fr.project_id} commitId={fr.commit_id} path={fr.path} frno={fr.filerevision_number}/>
                </div>
            )
        }
    }
]