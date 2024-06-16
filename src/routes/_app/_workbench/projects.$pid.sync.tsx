import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/sync')({
  component: () => <div>Hello /_app/_workbench/projects/$pid/sync!</div>
})