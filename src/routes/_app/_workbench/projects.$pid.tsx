import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { TabsContent } from '@radix-ui/react-tabs';
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,

  loader: async ({ params }) => {
      const url = await invoke("get_server_url");
      const res = await fetch(url + "/project?pid=" + params.pid);
      const data = await res.json();
      return {
          url: url,
          title: data.title,
          pid: params.pid
      }
  }
})

function Project() {
    const loaderData = Route.useLoaderData();
    const { pid } = Route.useParams();


    async function syncChanges() {
      const pid_number = parseInt(pid);
      await invoke("sync_changes", { pid: pid_number, name: loaderData.title });
    }

  return (
    <div>
      <Tabs defaultValue='home' className='flex flex-col items-center'>
        <TabsList asChild>
        <NavigationMenu className='mt-2 mb-6 bg-background'>
          <NavigationMenuList className='grid grid-flow-col space-x-4'>
            <TabsTrigger value="home">
            <NavigationMenuItem>
            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-4xl font-semibold justify-self-start')}>{loaderData.title}</NavigationMenuLink>
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
          <Button className='grow'>Download Changes</Button>
          <Button variant={"outline"}>Open in Website</Button>
        </div>
        <Button className='flex h-full' onClick={syncChanges}>Sync</Button>
        <div className='flex flex-col gap-4'>
          <Button className='grow'>Upload Changes</Button>
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