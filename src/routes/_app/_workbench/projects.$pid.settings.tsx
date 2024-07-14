import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/settings')({
  component: ProjectSettings
})

function ProjectSettings() {
  return (
    <div>
      hehez settings
    </div>
  )
}