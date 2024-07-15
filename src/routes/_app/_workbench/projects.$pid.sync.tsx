import { File } from '@/components/file/FileColumn';
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/clerk-react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export const Route = createFileRoute('/_app/_workbench/projects/$pid/sync')({
  component: () => <SyncPage />,
  loader: async ({ params }) => {
    const pid = parseInt(params.pid);
    const uploadOutput: File[] = await invoke("get_uploads", { pid: pid });
    const url: string = await invoke("get_server_url");

    return (
      {
      upload: uploadOutput.length,
      url: url
      }
    )
  },
  gcTime: 0, // do not cache this route's data after its unloaded per docs
  shouldReload: false, // only reload the route when dependencies change or user navigates to it (per docs)
})

function SyncPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { upload, url } = Route.useLoaderData();
  const { pid } = Route.useParams();
  const [uploadSize, SetUploadSize] = useState(upload)
  const [downloadSize, setDownloadSize] = useState(0)
  const [syncInProgress, setSyncInProgress] = useState(false)

  async function syncChanges() {
    setSyncInProgress(true)
    const pid_number = parseInt(pid);
    await invoke("sync_changes", { pid: pid_number });

    // TODO update download/conflict lists
    // TODO type this so its not any
    const uploadOutput: any = await invoke("get_uploads", { pid: pid_number });
    console.log(uploadOutput)
    SetUploadSize(uploadOutput.length)
    setSyncInProgress(false)
  }

  async function navigateUpload() {

    navigate({
      to: '/upload',
      search: { pid: pid }
    })
  }

  async function openFolder() {
    await invoke("open_project_dir", { pid: parseInt(pid) })
  }

  return (
    <div className='grid grid-cols-3 gap-8 p-4 h-64 w-[600px]'>
    <div className='flex flex-col gap-4'>
      <Button className='grow text-wrap' disabled={downloadSize == 0 ? true : false}>
        {downloadSize == 0 ? "Up to date" : downloadSize + " files ready to download"}
      </Button>
      <Button variant={"outline"}>Open in Website</Button>
    </div>
    <Button className='flex h-full' onClick={syncChanges} disabled={syncInProgress}>Sync</Button>
    <div className='flex flex-col gap-4'>
      <Button className='grow text-wrap' onClick={navigateUpload}  disabled={uploadSize == 0 ? true : false}>
        {uploadSize == 0 ? "Up to date" : uploadSize + " files ready to upload"}
      </Button>
      <Button variant={"outline"} onClick={openFolder}>Open Project Folder</Button>
    </div>
  </div>
  )
}