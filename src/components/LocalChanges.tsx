import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FileSelectForm } from "./FileSelectForm"
import { useState } from "react"
import { LocalCADFile } from "@/lib/types"
import { BaseDirectory } from "@tauri-apps/api/path"
import { readTextFile } from "@tauri-apps/api/fs"
import { invoke } from "@tauri-apps/api/tauri"

const initProjectDir: string = await invoke("get_project_dir");

export interface LocalChangesProps {
  upload: boolean
}
export function LocalChanges(props: LocalChangesProps) {
  const [files, setFiles] = useState<LocalCADFile[]>([]);
  const [projectDir, setProjectDir] = useState(initProjectDir);
  const [relativePaths, setRelativePaths] = useState<string[]>([]);

  async function handleClick() {
    const contents = await readTextFile("toUpload.json", { dir: BaseDirectory.AppLocalData });
    const files: LocalCADFile[] = JSON.parse(contents);

    const paths: string[] = []
    for(let i = 0; i < files.length; i++) {
      paths.push(files[i].path);
    }
    const projDir: string = await invoke("get_project_dir");
    setRelativePaths(paths);
    setProjectDir(projDir);
    setFiles(files);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"default"} disabled={!props.upload} onClick={handleClick}>
          {
            props.upload ? "Files ready to upload" : "Up to date"
          }
          </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
            </DialogDescription>
            <div className="flex items-center space-x-2">
            </div>
        </DialogHeader>
          <FileSelectForm files={files} projectDir={projectDir} paths={relativePaths}/>
        <DialogFooter>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
