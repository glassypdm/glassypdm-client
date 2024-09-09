import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/settings')({
  component: ProjectSettings
})

function ProjectSettings() {
  return (
    <div className='flex flex-col w-screen[504px]'>
      Coming soon
    </div>
  )
}