import { Button } from '@/components/ui/button'
import { Link, createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';

export const Route = createFileRoute('/_app/_workbench/projects/$pid/sync')({
  component: () => <SyncPage />
})

function SyncPage() {
  const { pid } = Route.useParams();

  async function syncChanges() {
    const pid_number = parseInt(pid);
    await invoke("sync_changes", { pid: pid_number, name: "hehez" });
  }
  return (
    <div className='grid grid-cols-3 gap-8 p-4 h-64'>
    <div className='flex flex-col gap-4'>
      <Button className='grow' asChild>
        <Link to='/download'>Download Changes</Link>
      </Button>
      <Button variant={"outline"}>Open in Website</Button>
    </div>
    <Button className='flex h-full' onClick={syncChanges}>Sync</Button>
    <div className='flex flex-col gap-4'>
      <Button className='grow' asChild>
        <Link to='/upload' search={{ pid: "4", title: "hehez" }}>Upload Changes</Link>
      </Button>
      <Button variant={"outline"}>Open Project Folder</Button>
    </div>
  </div>
  )
}