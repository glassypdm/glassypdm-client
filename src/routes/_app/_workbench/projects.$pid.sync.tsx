import { Button } from '@/components/ui/button'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export const Route = createFileRoute('/_app/_workbench/projects/$pid/sync')({
  component: () => <SyncPage />,
  loader: async ({ params }) => {
    const pid = parseInt(params.pid);
    // TODO do sync actions here
    const upload = await invoke("get_uploads", { pid: pid })

    return (
      {
      upload: upload
      }
    )
  }
})

function SyncPage() {
  const navigate = useNavigate();
  const { upload } = Route.useLoaderData();
  const { pid } = Route.useParams();
  const [uploadSize, SetUploadSize] = useState(upload)
  const [downloadSize, setDownloadSize] = useState(0)

  async function syncChanges() {
    const pid_number = parseInt(pid);
    await invoke("sync_changes", { pid: pid_number });

    // TODO update download/upload/conflict lists
    const uploadOutput = await invoke("get_uploads", { pid: pid_number });
    SetUploadSize(uploadOutput as number)
  }

  async function navigateUpload() {
    navigate({
      to: '/upload',
      search: { pid: pid }
    })
  }

  return (
    <div className='grid grid-cols-3 gap-8 p-4 h-64 w-[600px]'>
    <div className='flex flex-col gap-4'>
      <Button className='grow text-wrap' disabled={downloadSize == 0 ? true : false}>
        {downloadSize == 0 ? "Up to date" : downloadSize + " files ready to download"}
      </Button>
      <Button variant={"outline"}>Open in Website</Button>
    </div>
    <Button className='flex h-full' onClick={syncChanges}>Sync</Button>
    <div className='flex flex-col gap-4'>
      <Button className='grow text-wrap' onClick={navigateUpload}  disabled={uploadSize == 0 ? true : false}>
        {uploadSize == 0 ? "Up to date" : uploadSize + " files ready to upload"}
      </Button>
      <Button variant={"outline"}>Open Project Folder</Button>
    </div>
  </div>
  )
}