import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid')({
  component: Project,
})

function Project() {
    const { pid } = Route.useParams();
  return <div>project ID: {pid}</div>
}