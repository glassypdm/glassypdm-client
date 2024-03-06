import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { z } from 'zod'

const OriginSchema = z.object({
    origin: z.string()
})
export const Route = createFileRoute('/owo')({
    validateSearch: OriginSchema,
    component: Owo,
})

function Owo() {
    const { origin } = Route.useSearch();
  return (
    <div className="p-2">
      <h3>owo owo!</h3>    <Button variant={'outline'} asChild>
        <Link to={origin}>back</Link>
    </Button>
    </div>
  )
}