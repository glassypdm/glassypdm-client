import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'

interface LocalProject {
  pid: number,
  title: string,
  team_name: string
}

export const Route = createFileRoute('/_app/_workbench/dashboard')({
  component: Dashboard,
  loader: async () => {
    const data: LocalProject[] = await invoke("get_local_projects");
    return data
  }
})

function Dashboard() {
  const data = Route.useLoaderData();

  // TODO add button to navigate to /projects or /teams
  if(data.length == 0) {
    return (
      <div>
        No local projects found
      </div>
    )
  }


  return (
    <div className='flex flex-row space-x-4'>
      <div className='p-4'>
        <div className='text-2xl font-semibold'>Local Projects</div>
      </div>
      <div className='flex flex-col grow'>
      {
        data.map((project: LocalProject) => {
          return (
              <Card className="grid grid-cols-2 items-center mb-2" key={project.pid}>
              <CardHeader className="justify-self-start">
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>{project.team_name}</CardDescription>
              </CardHeader>
              <CardContent className="justify-self-end flex flex-row space-x-4 items-center">
                  {/*<p className="text-sm text-muted-foreground">Last updated MM/DD/YYYY, HH:MM:SS</p> */}
                  <Button asChild>
                      <Link to={"/projects/$pid/sync"} params={{ pid: project.pid.toString() }}>Open</Link>
                  </Button>
              </CardContent>
              </Card>
          )
        })
      }
      </div>
    </div>
  )
}