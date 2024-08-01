import { columns, File } from '@/components/file/FileColumn'
import { FileTable } from '@/components/file/FileTable'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RowSelectionState } from '@tanstack/react-table'
import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

export const Route = createFileRoute('/_app/download')({
  validateSearch: (search) =>
    search as {
      pid: string
    },
    loaderDeps: ({ search: { pid } }) => ({
      pid
    }),
    loader: async ({ deps: { pid } }) => {
      let pid_i32 = parseInt(pid)
      const url: string = await invoke("get_server_url");
      const downloads: File[] = await invoke("get_downloads", { pid: pid_i32 });

      // initialize selection list
      let selectionList: RowSelectionState = {};
      for(let i = 0; i < downloads.length; i++) {
        selectionList[i.toString()] = true;
      }
      const projectName: string = await invoke("get_project_name", { pid: pid_i32 })
      return { downloads, selectionList, projectName, url }
    },
  component: () => <DownloadPage />,
  gcTime: 0, // do not cache this route's data after its unloaded per docs
  shouldReload: false, // only reload the route when dependencies change or user navigates to it (per docs)

})

function DownloadPage() {
  const { downloads, selectionList, projectName, url } = Route.useLoaderData();
  const { getToken } = useAuth();
  const { pid } = Route.useSearch();
  const [action, setAction] = useState("Upload");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [selection, setSelection] = useState(selectionList)

  return (
    <div className='flex flex-col p-4'>
      <h1 className='text-3xl pb-8'>Download Changes for {projectName}</h1>
        <div className='flex flex-row justify-items-center items-center'>
        <Link
              to={'/projects/$pid/sync'}
              params={{ pid: pid }}
              disabled={disabled}>
          <Button className='flex-none disabled:pointer-events-none disabled:opacity-50' disabled={disabled}>
Close
          </Button></Link>
          <p className='flex-auto text-center'>{status}</p>
          <div className='flex'>
          <Button
            disabled={Object.keys(selection).length == 0 || disabled || progress == 100}
            variant={action == "Reset" ? "destructive" : "default"}
            >{progress == 100 ? action + " Complete" : action + " Selected"}</Button>
          <Select onValueChange={(e) => setAction(e)}>
          <SelectTrigger className="w-[40px]" disabled={disabled || progress == 100}></SelectTrigger>
          <SelectContent>
            <SelectItem value="Upload">Upload</SelectItem>
            <SelectItem value="Reset">Reset</SelectItem>
          </SelectContent>
        </Select>
          </div>
        </div>
      <div className='py-4 space-y-2'>
        <Progress value={progress}/>
      </div>
      <FileTable columns={columns} data={downloads} selection={selection} setSelection={setSelection}/>
      </div>
  )
}