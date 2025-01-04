import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/settings')({
  component: ProjectSettings
})

function ProjectSettings() {
  return (
    <div className='flex flex-col w-full px-4 pt-8'>
      <Card>
        <CardHeader>
          <CardTitle>Ignore List</CardTitle>
          <CardDescription>
            Configure a list of paths and files for glassyPDM to ignore changes.
            </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}