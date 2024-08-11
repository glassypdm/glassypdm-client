import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
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
    const { getToken } = useAuth();
    const { isPending, isError, data, error } = useQuery({
      queryKey: ['project' + pid],
      queryFn: async () => {
        const endpoint = url + '/project/info?pid=' + pid;
        const resp = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${await getToken()}`},
          method: "GET",
          mode: "cors"
        });
        const data = await resp.json()
        console.log(data)
        invoke("update_project_info", { pid: parseInt(pid), teamName: data.teamName, title: data.title, initCommit: data.initCommit })
        return data
      }
    })

    if(isPending) {
      return <div>Loading project...</div>
    }
    else if(isError) {
      return <div>
        <div>An error occured:</div>
        <div>{error.name}: {error.message}</div>
      </div>
    }

  return (
    <div className='grid row-auto content-center justify-items-center'>
        <NavigationMenu className='mt-2 mb-6'>
          <NavigationMenuList className='space-x-4'>
            <NavigationMenuItem>
            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-4xl font-semibold')} asChild>
                <Link to='/projects/$pid/sync' params={{ pid: pid }}>{data.title}</Link>
            </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')} asChild>
                <Link to='/projects/$pid/history' params={{ pid: pid }}>Project History</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')} asChild>
                <Link to='/projects/$pid/files' params={{ pid: pid }}>Files</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {
              data.canManage ? 
              <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')} asChild>
                <Link to='/projects/$pid/settings' params={{ pid: pid }}>Settings</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> : <></>
            }
          </NavigationMenuList>
        </NavigationMenu>
        <Outlet />
    </div>
  )
}