"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CADFileColumn, UpdatedCADFile, ChangeType } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";

export const columns: ColumnDef<CADFileColumn>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
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
      const file: UpdatedCADFile = row.getValue("file");
      let color: string = "";
      let symbol: string = "";
      switch (file.change) {
        case ChangeType.CREATE:
          color = "text-green-400";
          symbol = "(+)";
          break;
        case ChangeType.UPDATE:
          color = "text-blue-200";
          symbol = "(+/-)";
          break;
        case ChangeType.DELETE:
          color = "text-red-400";
          symbol = "(-)\t";
          break;
      }
      return (
        <p className={color}>
          {symbol} {file.path}{" "}
        </p>
      );
    },
  },
];
