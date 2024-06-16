import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/files')({
  component: () => <div>Hello /_app/_workbench/projects/$pid/files!</div>
})