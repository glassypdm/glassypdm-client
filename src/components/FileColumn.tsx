"use client";

import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  CADFileColumn,
  UpdatedCADFile,
  ChangeType,
  TrackedRemoteFile,
  Change,
} from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { BaseDirectory, readTextFile } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/tauri";
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
  const data: TrackedRemoteFile[] = JSON.parse(str);
  console.log(data);

  for (let i = 0; i < data.length; i++) {
    // enable selected by default
    output.selectionList[i.toString()] = true;
    let change: ChangeType = ChangeType.UNIDENTIFIED;
    switch (data[i].change) {
      case "Create":
        change = ChangeType.CREATE;
        break;
      case "Update":
        change = ChangeType.UPDATE;
        break;
      case "Delete":
        change = ChangeType.DELETE;
        break;
      default:
        change = ChangeType.UNIDENTIFIED;
        break;
    }

    output.files.push({
      file: {
        path: data[i].file.path,
        size: data[i].file.size,
        hash: data[i].file.hash,
        relativePath: data[i].file.path,
        change: change,
      },
    });
  }

  return output;
}

export interface DownloadLoaderProps {
  files: CADFileColumn[];
  selectionList: RowSelectionState;
}

export async function uploadPageLoader() {
  let output: DownloadLoaderProps = {
    files: [],
    selectionList: {},
  };
  const str = await readTextFile("toUpload.json", {
    dir: BaseDirectory.AppLocalData,
  });
  const projDir: string = await invoke("get_project_dir");
  const data: Change[] = JSON.parse(str);
  console.log(data);

  for (let i = 0; i < data.length; i++) {
    // enable selected by default
    output.selectionList[i.toString()] = true;
    output.files.push({
      file: {
        path: data[i].file.path,
        size: data[i].file.size,
        hash: data[i].file.hash,
        relativePath: data[i].file.path.replace(projDir, ""),
        change: data[i].change,
      },
    });
  }

  return output;
}

export interface UploadLoaderProps {
  files: CADFileColumn[];
  selectionList: RowSelectionState;
}
