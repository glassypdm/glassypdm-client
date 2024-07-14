import { columns, File } from '@/components/file/FileColumn';
import { FileTable } from '@/components/file/FileTable';
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useAuth } from '@clerk/clerk-react';
import { Link, createFileRoute } from '@tanstack/react-router'
import { RowSelectionState } from '@tanstack/react-table';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export const Route = createFileRoute('/_app/upload')({
  validateSearch: (search) =>
    search as {
      pid: string
    },
    loaderDeps: ({ search: { pid } }) => ({
      pid
    }),
    loader: async ({ deps: { pid } }) => {
      let pid_i32 = parseInt(pid)
      const uploads: File[] = await invoke("get_uploads", { pid: pid_i32 });

      // initialize selection list
      let selectionList: RowSelectionState = {};
      for(let i = 0; i < uploads.length; i++) {
        selectionList[i.toString()] = true;
      }
      const projectName: string = await invoke("get_project_name", { pid: pid_i32 })
      return { uploads, selectionList, projectName }
    },
  component: () => <UploadPage />

})

function UploadPage() {
  const { uploads, selectionList, projectName } = Route.useLoaderData();
  const { getToken } = useAuth();
  const { pid } = Route.useSearch();
  const [action, setAction] = useState("Upload");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [selection, setSelection] = useState(selectionList)
  
  async function handleAction() {
    // get special JWT for rust/store operations
    //const uwu = await getToken({ template: "store-operations", leewayInSeconds: 30 })
    let selectedFiles: File[] = []
    for(let i = 0; i < Object.keys(selection).length; i++) {
      const key: number = parseInt(Object.keys(selection)[i]);
      selectedFiles.push({
        filepath: uploads[key].filepath,
        size: uploads[key].size,
        change_type: uploads[key].change_type
      })
    }
    console.log(selectedFiles)
    if(action == "Upload") {

    }
    else {
      // if change_type is create, we can delete these
      // otherwise download by filepath/pid/base_commitid
    }
  }


  return (
    <div className='flex flex-col p-4'>
      <h1 className='text-3xl pb-8'>Upload Changes to {projectName}</h1>
        <div className='flex flex-row justify-items-center items-center'>
          <Button className='flex-none'asChild>
            <Link to={'/projects/$pid/sync'} params={{ pid: pid as string}}>Close</Link>
          </Button>
          <p className='flex-auto text-center'>{status}</p>
          <div className='flex'>
          <Button
            disabled={Object.keys(selection).length == 0}
            onClick={handleAction}
            variant={action == "Reset" ? "destructive" : "default"}
            >{progress == 100 ? action + " Complete" : action + " Selected"}</Button>
          <Select onValueChange={(e) => setAction(e)}>
          <SelectTrigger className="w-[40px]"></SelectTrigger>
          <SelectContent>
            <SelectItem value="Upload">Upload</SelectItem>
            <SelectItem value="Reset">Reset</SelectItem>
          </SelectContent>
        </Select>
          </div>
        </div>
      <div className='py-4'>
        <Progress value={progress}/>
      </div>
      <FileTable columns={columns} data={uploads} selection={selection} setSelection={setSelection}/>
      </div>
  )
}