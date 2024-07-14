import { Separator } from '@/components/ui/separator'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/settings')({
  component: ProjectSettings
})

function ProjectSettings() {
  return (
    <div className='flex flex-col w-screen[504px]'>
      <div className='pb-4'>Your permission level: Manager (R/W)</div>
      <Separator />
      membership table
    </div>
  )
}