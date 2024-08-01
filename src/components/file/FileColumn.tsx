import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "../ui/checkbox";

export interface File {
    change_type: number
    filepath: string
    size: number
    hash: string
}

export const columns: ColumnDef<File>[] = [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: any) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "file",
        header: "File",
        cell: ({ row }) => {
          const file: File = row.original;
          let color: string = "";
          let symbol: string = "";
          switch (file.change_type) {
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
            <p className={color}>
              {symbol} {file.filepath}
            </p>
          );
        },
      },
      {
        accessorKey: "size",
        header: "File size",
        cell: ({ row }) => {
          const file: File = row.original;
          let size = file.size >> 20;
          let type = "MB"
          if (size < 1) {
            size = file.size / 1024 // kb
            type = "KB"
          }
          if (size < 1) {
            size = file.size;
            type = "bytes"
          }
          return (
            <p>
              {size} {type}
            </p>
          );
        },
      }
    ];