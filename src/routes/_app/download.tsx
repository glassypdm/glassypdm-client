import { columns, File } from '@/components/file/FileColumn'
import { FileTable } from '@/components/file/FileTable'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RowSelectionState } from '@tanstack/react-table'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Loader2 } from 'lucide-react'
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
  const { downloads, selectionList, projectName } = Route.useLoaderData();
  const { getToken } = useAuth();
  const { pid } = Route.useSearch();
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [selection, setSelection] = useState(selectionList);

  async function handleDownload() {
    setDisabled(true);
    console.log("hehe")
    console.log(selection)
    const uwu = await getToken({ template: "store-operations", leewayInSeconds: 30 })

    // time function
    const startTime = performance.now();

    // get paths for download
    let selectedDownload: any[] = [];
    for (let i = 0; i < Object.keys(selection).length; i++) {
      let key: string = Object.keys(selection)[i];
      const idx = parseInt(key);
      selectedDownload.push({
        commit_id: downloads[idx].commit_id,
        rel_path: downloads[idx].filepath,
        hash: downloads[idx].hash,
        download: downloads[idx].change_type == 3 ? false : true
      });
    }

    let hehe = 0;
    const unlisten = await listen('downloadedFile', (event: any) => {
      console.log(event)
      setProgress(100 * ++hehe / event.payload)
      setStatus(`${hehe} of ${event.payload} file chunks downloaded...`);
    });

    const unlisten2 = await listen('deletedFile', (event: any) => {
      console.log(event)
      setStatus(`Assembling files...`)
    })

    setStatus("Preparing files to download...");

    let ret = await invoke("download_files", { pid: parseInt(pid), files: selectedDownload, token: uwu });

    unlisten();
    unlisten2();
    setStatus(`Download complete!`);
    setDisabled(false);
  }

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
            onClick={handleDownload}
            disabled={Object.keys(selection).length == 0 || disabled || progress == 100}
            >{progress == 100 ? "Download Complete" : progress == 0 || disabled ? "Download Selected" : <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait</>}</Button>
          </div>
        </div>
      <div className='py-4 space-y-2'>
        <Progress value={progress}/>
      </div>
      <FileTable columns={columns} data={downloads} selection={selection} setSelection={setSelection}/>
      </div>
  )
}