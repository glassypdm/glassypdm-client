import { ColumnDef } from "@tanstack/react-table";
import { User } from "lucide-react";
import { PermissionGroup, PermissionGroupConfig } from "./pgroupconfig";



export const columns: ColumnDef<PermissionGroup>[] = [
  {
    accessorKey: "name",
    header: "Group Name",
  },
  {
    accessorKey: "count",
    header: "# Users",
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          {row.original.count} <User className="h-4 w-4" />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const group = row.original;
      return (
          <PermissionGroupConfig group={group} />
      );
    },
  },
];

