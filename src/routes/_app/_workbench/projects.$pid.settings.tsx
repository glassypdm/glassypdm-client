import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/settings')({
  component: ProjectSettings
})

function ProjectSettings() {
  return (
    <div className='flex flex-col w-screen[504px]'>
      <Card>
        <CardHeader>
          <CardTitle>Ignore List</CardTitle>
          <CardDescription>Configure a list of paths and files for glassyPDM to ignore.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}