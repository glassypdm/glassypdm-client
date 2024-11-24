import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_app/_workbench/teams/$teamid/orders/options',
)({
  component: () => (
    <div>Hello /_app/_workbench/teams/$teamid/orders/manage!</div>
  ),
})
