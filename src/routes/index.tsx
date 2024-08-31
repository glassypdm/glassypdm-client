import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,

  beforeLoad: async () => {
    
    throw redirect({
      to: '/dashboard'
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