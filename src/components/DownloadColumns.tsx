"use client";

import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  CADFileColumn,
  UpdatedCADFile,
  ChangeType,
  CADFile,
} from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { invoke } from "@tauri-apps/api/tauri";
import { BaseDirectory, readTextFile } from "@tauri-apps/api/fs";
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
          symbol = "(-)";
          break;
        default:
          symbol = "(?)";
          break;
      }
      return (
        <p className={color}>
          {symbol} {file.relativePath}
        </p>
      );
    },
  },
];

export async function downloadPageLoader() {
  let output: DownloadLoaderProps = {
    files: [],
    selectionList: {},
  };
  const str = await readTextFile("toDownload.json", {
    dir: BaseDirectory.AppLocalData,
  });
  const data: CADFile[] = JSON.parse(str);
  console.log(data);

  for (let i = 0; i < data.length; i++) {
    // enable selected by default
    output.selectionList[i.toString()] = true;

    // path, relativePath, change
    output.files.push({
      file: {
        path: data[i].path,
        size: data[i].size,
        relativePath: data[i].path,
        change: data[i].change,
      },
    });
  }

  return output;
}

export interface DownloadLoaderProps {
  files: CADFileColumn[];
  selectionList: RowSelectionState;
}
