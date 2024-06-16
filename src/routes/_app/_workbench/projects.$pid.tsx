import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,

  loader: async ({ params }) => {
      const url = await invoke("get_server_url");
      return {
          url: url
      }
  }
})

function Project() {
    const { url } = Route.useLoaderData();
    const { pid } = Route.useParams();

  return (
    <div className='grid row-auto content-center justify-items-center'>
        <NavigationMenu className='mt-2 mb-6'>
          <NavigationMenuList className='space-x-4'>
            <NavigationMenuItem>
            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-4xl font-semibold')}>
                <Link to='/projects/$pid/sync' params={{ pid: pid }}>{"SDM-24"}</Link>
            </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')}>
                <Link to='/projects/$pid/history' params={{ pid: pid }}>Project History</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')} asChild>
                <Link to='/projects/$pid/files' params={{ pid: pid }}>Files</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Outlet />
    </div>
  )
}