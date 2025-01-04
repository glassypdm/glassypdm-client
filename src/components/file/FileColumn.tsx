import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";

export interface File {
  change_type: number;
  filepath: string;
  size: number;
  hash: string;
  commit_id: number;
}

export const columns: ColumnDef<File>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: any) =>
          table.toggleAllPageRowsSelected(!!value)
        }
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
    filterFn: (row, id, value) => {
      id;
      const file: File = row.original;
      return file.filepath.includes(value);
    },
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
        <div className="flex flex-row items-center space-x-2 w-[525px]">
          <div className={cn(color, "text-xs text-wrap break-all w-full")}>
            {symbol} {file.filepath}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "size",
    header: "File size",
    cell: ({ row }) => {
      const file: File = row.original;
      let size = file.size / 1024 / 1024; // mb
      let type = "MB";
      if (size < 1) {
        size = file.size / 1024; // kb
        type = "KB";
      }
      if (size < 1) {
        size = file.size;
        type = size > 1 ? "bytes" : "byte";
      }
      return (
        <p>
          {type == "bytes" || type == "byte" ? size : size.toFixed(2)} {type}
        </p>
      );
    },
  },
];
