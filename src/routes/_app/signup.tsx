import { Button } from '@/components/ui/button'
import { SignUp } from '@clerk/clerk-react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/signup')({
    component: hehez,
})

function hehez() {
  return (
    <div className='flex flex-row justify-center space-x-2 p-2'>
        <Button asChild>
            <Link to='/signin'>
                Back to Sign In
            </Link>
        </Button>
      <SignUp />
      </div>
  )
}

export default hehez