import { ColumnDef } from "@tanstack/react-table"
import MemberPopover from "./MemberPopover"
import { EllipsisIcon } from "lucide-react"

export type Member = {
    name: string
    role: string
    userid: string
    teamid: string
}

export const MemberColumns: ColumnDef<Member>[] = [
    {
        accessorKey: "name",
        header: "Name"
    },
    {
        accessorKey: "role",
        header: "Role"
    },
    /*
    {
        id: "actions",
        cell: ({ row }) => {
            const member = row.original

            return (
                <MemberPopover member={member} trigger={<EllipsisIcon className="rounded h-6 w-6 hover:bg-muted" />}/>
            )
        }
    }
    */
]