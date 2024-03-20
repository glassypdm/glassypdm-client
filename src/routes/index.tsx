import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,

  beforeLoad: async ({ location }) => {
    
    throw redirect({
      to: '/projects',
      search: {
        redirect: location.href
      }
    })
  }
})


function Index() {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
    </div>
  )
}