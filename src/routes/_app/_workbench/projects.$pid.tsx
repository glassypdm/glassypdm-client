import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { createFileRoute } from '@tanstack/react-router'
import Database from "@tauri-apps/plugin-sql";

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,

  loader: async ({ params }) => {
      const db = await Database.load("sqlite:glassypdm.db")
      const result = await db.select(
          "SELECT debug_url FROM server WHERE active = 1" // TODO url
      );
      const url = (result as any)[0].debug_url;
      const res = await fetch(url + "/project?pid=" + params.pid);
      const data = await res.json();
      return {
          url: url,
          title: data.title
      }
  }
})

function Project() {
    const loaderData = Route.useLoaderData();
    const { pid } = Route.useParams();
  return (
    <div className='flex flex-col items-center'>
        <NavigationMenu className='mt-2 mb-6'>
          <NavigationMenuList className='grid grid-flow-col space-x-4'>
            <NavigationMenuItem>
            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-4xl font-semibold justify-self-start')}>{loaderData.title}</NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem asChild>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')}>Project Updates</NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem asChild>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')}>Files</NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'text-md')}>Settings</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      <div className='grid grid-cols-3 gap-8 p-4 h-64'>
        <div className='flex flex-col gap-4'>
          <Button className='grow'>Download Changes</Button>
          <Button variant={"outline"}>Open Website</Button>
        </div>
        <Button className='flex h-full'>Sync</Button>
        <div className='flex flex-col gap-4'>
          <Button className='grow'>Upload Changes</Button>
          <Button variant={"outline"}>Open Project Folder</Button>
        </div>
      </div>
    </div>
  )
}