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
      const uploads: File[] = await invoke("get_uploads", { pid: parseInt(pid) });

      // initialize selection list
      let selectionList: RowSelectionState = {};
      for(let i = 0; i < uploads.length; i++) {
        selectionList[i.toString()] = true;
      }
      // TODO
      //const projectName = await invoke("")
      console.log(uploads)
      return { uploads, selectionList }
    },
  component: () => <UploadPage />

})

function UploadPage() {
  const { uploads, selectionList } = Route.useLoaderData();
  const { getToken } = useAuth();
  const { pid } = Route.useSearch();
  const [action, setAction] = useState("Upload");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [selection, setSelection] = useState(selectionList)
  
  async function handleAction() {
    // get special JWT for rust/store operations
    //const uwu = await getToken({ template: "store-operations", leewayInSeconds: 30 })
    console.log(selection)
    if(action == "Upload") {

    }
    else {

    }
  }


  return (
    <div className='flex flex-col p-4'>
      <h1 className='text-3xl pb-8'>Upload Changes</h1>
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