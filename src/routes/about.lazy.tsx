import { Button } from '@/components/ui/button'
import { Link, createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/about')({
  component: About,
})

function About() {
  return <div className="p-2">
    Hello from About!
    <Button variant={'outline'} asChild>
        <Link from='/about' to='../'>hehea</Link>
    </Button>
    </div>
}