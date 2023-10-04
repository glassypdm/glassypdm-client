import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DownloadTable } from "@/components/DownloadTable";
import { UploadLoaderProps, columns } from "@/components/DownloadColumns";
import { Progress } from "@/components/ui/progress";
import { invoke } from "@tauri-apps/api/tauri";
import { resolve, appLocalDataDir, BaseDirectory } from "@tauri-apps/api/path";
import { CADFile, DownloadFile } from "@/lib/types";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "./ui/textarea";

interface UploadPageProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UploadPage({ className }: UploadPageProps) {
  const files: UploadLoaderProps = useLoaderData() as UploadLoaderProps;
  const [selection, setSelection] = useState<RowSelectionState>(
    files.selectionList,
  );
  const [action, setAction] = useState("Upload");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  function handleClick() {
    console.log(action);
    console.log(message);
  }

  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">Upload Changes</h1>
      <div className="flex m-2">
        <Button className="left-0" onClick={() => navigate(-1)}>
          Close
        </Button>
        <Button
          className="absolute right-20"
          disabled={Object.keys(selection).length == 0 || progress == 100}
          onClick={handleClick}
          variant={action === "Reset" ? "destructive" : "default"}
        >
          {progress == 100 ? action + " Complete" : action + " Selected"}
        </Button>
        <Select onValueChange={(e) => setAction(e)}>
          <SelectTrigger className="w-[40px] absolute right-10"></SelectTrigger>
          <SelectContent>
            <SelectItem value="Upload">Upload</SelectItem>
            <SelectItem value="Reset">Reset</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Textarea
          placeholder="Type your commit message here."
          onChange={(e) => setMessage(e.target.value)}
        />
        <Progress className="" value={progress} />
      </div>
      <div className="container mx-auto py-1">
        <DownloadTable
          columns={columns}
          data={files.files}
          selection={selection}
          setSelection={setSelection}
        />
      </div>
    </div>
  );
}
