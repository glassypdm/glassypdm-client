import Loading from '@/components/loading'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,

  loader: async () => {
    const url = await invoke('get_server_url')
    return {
      url: url,
    }
  },
})

function Project() {
  const { url } = Route.useLoaderData()
  const { pid } = Route.useParams()
  const { getToken } = useAuth()
  const { isPending, isError, data, error } = useQuery({
    queryKey: ['project' + pid],
    queryFn: async () => {
      const endpoint = url + '/project/info?pid=' + pid
      const resp = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: 'GET',
        mode: 'cors',
      })
      const data = await resp.json()
      console.log(data)
      if (data.response == 'success') {
        invoke('update_project_info', {
          pid: parseInt(pid),
          teamName: data.body.teamName,
          title: data.body.title,
          initCommit: data.body.initCommit,
        })
      }
      return data
    },
  })

  if (isPending) {
    return <Loading />
  } else if (isError) {
    return (
      <div>
        <div>An error occured:</div>
        <div>
          {error.name}: {error.message}
        </div>
      </div>
    )
  } else if (data.response != 'success') {
    ;<div>An error occurred fetching projects</div>
  }

  return (
    <div className="grid row-auto content-center justify-items-center">
      <NavigationMenu className="mb-2">
        <NavigationMenuList className="space-x-4">
          <NavigationMenuItem>
            <NavigationMenuLink
              className={cn(
                navigationMenuTriggerStyle(),
                'text-4xl font-semibold',
              )}
              asChild
            >
              <Link to="/projects/$pid/sync" params={{ pid: pid }}>
                {data.body.title}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              className={cn(navigationMenuTriggerStyle(), 'text-md')}
              asChild
            >
              <Link
                to="/projects/$pid/history"
                params={{ pid: pid }}
                search={{ offset: 0 }}
              >
                Project History
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          {/** 
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')} asChild>
                <Link to='/projects/$pid/files' params={{ pid: pid }} search={{ directory: ""}}>Files</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {
              data.body.canManage ? 
              <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')} asChild>
                <Link to='/projects/$pid/settings' params={{ pid: pid }}>Settings</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> : <></>
            }
            */}
        </NavigationMenuList>
      </NavigationMenu>
      <Outlet />
    </div>
  )
}
