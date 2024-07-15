import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/dashboard')({
  component: Dashboard
})

function Dashboard() {
  return (
    <div>
    <div>ideas for dashboard:</div>
    <div>show local projects</div>
    <div>notifications (LOL)</div>
  </div>
  )
}