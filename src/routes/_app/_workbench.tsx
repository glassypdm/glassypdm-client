import { getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useAuth } from "@clerk/clerk-react"
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Home, Menu } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const Route = createFileRoute('/_app/_workbench')({
  component: WorkbenchLayout
})

const GLASSYPDM_VERSION = await getVersion();
const TAURI_VERSION = await getTauriVersion();

function WorkbenchLayout() {
    const { signOut } = useAuth();

    // TODO decide what to do with navbar
    return (
        <div className='space-y-2 mt-2 mx-2'>
          <div className='grid grid-flow-col items-center'>
            <Button asChild variant={"ghost"} size={"icon"}>
              <Link to='/projects'><Home /></Link>
            </Button>
            <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger className='max-w-fit justify-self-end mx-4' asChild>
                <Button variant='outline'><Menu className='mr-2 h-4 w-4' />Open</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='mx-4'>
                <DialogTrigger asChild>
                <DropdownMenuItem>About</DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuItem asChild><Link to='/settings'>Settings</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>About glassyPDM</DialogTitle>
              </DialogHeader>
              glassyPDM version: v{GLASSYPDM_VERSION}
              <br />
              Tauri version: v{TAURI_VERSION}
              <p>Client source code: <a href='https://github.com/joshtenorio/glassypdm-client' target='_blank' className='underline'>GitHub</a></p>
              <p>
              The glassyPDM client is released under the GNU General Public License (GPL) version 3 or later version.
              </p>
              <DialogFooter className='flex flex-row'>
              <Button asChild>
                <a href='https://github.com/joshtenorio/glassypdm-client/issues' target='_blank'>Report Bug</a>
              </Button>
            </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        <Separator />
        <Outlet />
        </div>
    )
}

export default WorkbenchLayout