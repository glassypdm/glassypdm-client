import { getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useAuth } from "@clerk/clerk-react"
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


export const Route = createFileRoute('/_app/_workbench')({
  component: WorkbenchLayout
})

const GLASSYPDM_VERSION = await getVersion();
const TAURI_VERSION = await getTauriVersion();

function WorkbenchLayout() {
    //const router = useRouterState();
    //console.log("here", router.location.pathname) // TODO use this info to update breadcrumb
    const { signOut } = useAuth();
    // TODO decide on breadcrumb vs typical navbar
    return (
        <div className='space-y-2 mt-2 mx-2'>
          <div className='grid grid-flow-col'>
            <Breadcrumb className='self-center mx-4'>
            <BreadcrumbList className='text-base'>
              <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to='/projects'>Projects</Link>
              </BreadcrumbLink>
              </BreadcrumbItem> {/**TODO project name here */}
            </BreadcrumbList>
            </Breadcrumb>
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