import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/history')({
  component: () => <div>Hello /_app/_workbench/projects/$pid/history!</div>
})