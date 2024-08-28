import { ColumnDef } from "@tanstack/react-table";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { Settings2 } from "lucide-react";

export type PermissionGroup = {
    pgroupid: number,
    name: string,
    count: number
}

export const columns: ColumnDef<PermissionGroup>[] = [
    {
        accessorKey: "name",
        header: "Group Name"
    },
    {
        accessorKey: "count",
        header: "# Users"
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const group = row.original

            return (
                <Popover>
                    <PopoverTrigger>
                        <Settings2 className="w-6 h-6 hover:bg-gray-600 rounded-md transition-colors" />
                    </PopoverTrigger>
                    <PopoverContent>
                        content!
                    </PopoverContent>
                </Popover>
            )
        }
    }
]