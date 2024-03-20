import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useAuth } from "@clerk/clerk-react"
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';


export const Route = createFileRoute('/_app/_workbench')({
  component: WorkbenchLayout
})


function WorkbenchLayout() {
    //const router = useRouterState();
    //console.log("here", router.location.pathname) // TODO use this info to update breadcrumb
    const { signOut } = useAuth();
    return (
        <div className='space-y-2 mt-2 mx-2'>
          <div className='grid grid-flow-col'>
            <Breadcrumb className='self-center mx-4'>
            <BreadcrumbList className='text-base'>
              <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to='/projects'>Projects</Link>
              </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>SDM-25</BreadcrumbItem>
            </BreadcrumbList>
            </Breadcrumb>
            <DropdownMenu>
              <DropdownMenuTrigger className='max-w-fit justify-self-end mx-4' asChild>
                <Button variant='outline'><Menu className='mr-2 h-4 w-4' />Open</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='mx-4'>
                <DropdownMenuItem>About</DropdownMenuItem>
                <DropdownMenuSeparator className='mx-2'/>
                <DropdownMenuItem>Client Settings</DropdownMenuItem>
                <DropdownMenuItem>Organization Settings</DropdownMenuItem>
                <DropdownMenuSeparator className='mx-2'/>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        <Separator />
        <Outlet />
        </div>
    )
}

export default WorkbenchLayout