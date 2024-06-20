import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/settings')({
  component: () => <div>Hello /_app/_workbench/projects/$pid/settings!</div>
})