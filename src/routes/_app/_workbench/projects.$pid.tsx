import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TabsContent } from '@radix-ui/react-tabs';
import { Link, createFileRoute } from '@tanstack/react-router'
import { invoke } from "@tauri-apps/api/core";

type ProjectSearch = {
  title: string
}

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,

  validateSearch: (search: Record<string, unknown>): ProjectSearch => {
    return {
      title: String(search.title ?? "Untitled Project")
    }
  },

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
    const { title } = Route.useSearch();


    async function syncChanges() {
      const pid_number = parseInt(pid);
      await invoke("sync_changes", { pid: pid_number, name: title });
    }

  return (
    <div>
      <Tabs defaultValue='home' className='flex flex-col items-center'>
        <TabsList asChild>
        <NavigationMenu className='mt-2 mb-6 bg-background'>
          <NavigationMenuList className='grid grid-flow-col space-x-4'>
            <TabsTrigger value="home">
            <NavigationMenuItem>
            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-4xl font-semibold justify-self-start')}>{title}</NavigationMenuLink>
            </NavigationMenuItem>
            </TabsTrigger>
            <TabsTrigger value="updates">
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')}>Project Updates</NavigationMenuLink>
            </NavigationMenuItem>
            </TabsTrigger>
            <TabsTrigger value="files">
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')}>Files</NavigationMenuLink>
            </NavigationMenuItem>
            </TabsTrigger>
          </NavigationMenuList>
        </NavigationMenu>
        </TabsList>
        <TabsContent value="home">
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
            <Link to='/upload' search={{ pid: pid, title: title }}>Upload Changes</Link>
          </Button>
          <Button variant={"outline"}>Open Project Folder</Button>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="updates">
          <p>WIP</p>
        </TabsContent>
        <TabsContent value="files">
          <p>WIP</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}