import { File } from '@/components/file/FileColumn';
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/clerk-react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
export const Route = createFileRoute('/_app/_workbench/projects/$pid/sync')({
  component: () => <SyncPage />,
  loader: async ({ params }) => {
    const pid = parseInt(params.pid);
    const uploadOutput: File[] = await invoke("get_uploads", { pid: pid });
    const downloadOutput: File[] = await invoke("get_downloads", { pid: pid });
    const url: string = await invoke("get_server_url");

    return (
      {
      upload: uploadOutput.length,
      download: downloadOutput.length,
      url: url
      }
    )
  },
  gcTime: 0, // do not cache this route's data after its unloaded per docs
  shouldReload: false, // only reload the route when dependencies change or user navigates to it (per docs)
})

interface RemoteFile {
  frid: number,
  path: string,
  commitid: number,
  hash: string,
  changetype: number,
  size: number
}

interface ProjectStateOutput {
  status: string,
  project: RemoteFile[]
}

function SyncPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { upload, download, url } = Route.useLoaderData();
  const { pid } = Route.useParams();
  const [uploadSize, setUploadSize] = useState(upload)
  const [downloadSize, setDownloadSize] = useState(download)
  const [syncInProgress, setSyncInProgress] = useState(false)

  async function syncChanges() {
    setSyncInProgress(true)
    const pid_number = parseInt(pid);

    const start = performance.now();

    // TODO put in a try/catch ?
    const data = await fetch(url + "/project/status/by-id/" + pid, {
      headers: { Authorization: `Bearer ${await getToken()}`},
      method: "GET",
      mode: "cors"
    });
    const remote: ProjectStateOutput = await data.json();
    if(remote.status != "success") {
      // TODO handle error
      console.log("sync error")
      setSyncInProgress(false)
      return;
    }

    let project: RemoteFile[] = [];
    console.log(remote)
    if(remote.project != null) {
      project = remote.project;
    }
    let permission = await isPermissionGranted();
    if (!permission) {
      const a = await requestPermission();
      permission = a === 'granted';
    }

    await invoke("sync_changes", { pid: pid_number, remote: project });

    // TODO update download/conflict lists
    // TODO type this so its not any
    const uploadOutput: any = await invoke("get_uploads", { pid: pid_number });
    console.log(uploadOutput)

    const downloadOutput: any = await invoke("get_downloads", { pid: pid_number })
    console.log(downloadOutput)
    const conflictOutput: any = await invoke("get_conflicts", { pid: pid_number })
    console.log(conflictOutput)
    setDownloadSize(downloadOutput.length)
    setUploadSize(uploadOutput.length)
    setSyncInProgress(false)

    const end = performance.now();
        
    // Once permission has been granted we can send the notification
    if (permission) {
      sendNotification({ title: 'glassyPDM', body: `Finished syncing in ${(end - start)/1000} seconds` });
    }
  }

  async function navigateUpload() {
    navigate({
      to: '/upload',
      search: { pid: pid }
    })
  }

  async function navigateDownload() {
    navigate({
      to: '/download',
      search: { pid: pid }
    })
  }

  async function openFolder() {
    await invoke("open_project_dir", { pid: parseInt(pid) })
  }

  return (
    <div className='grid grid-cols-3 gap-8 p-4 h-64 w-[600px]'>
    <div className='flex flex-col gap-4'>
      <Button className='grow text-wrap' onClick={navigateDownload} disabled={downloadSize == 0 ? true : false}>
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