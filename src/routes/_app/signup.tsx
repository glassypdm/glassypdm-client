import { Button } from '@/components/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/signup')({
    component: SignUp,
})

function SignUp() {
  return (
    <div className='flex flex-col place-items-center'>
        <h1 className='text-2xl mb-4'>Create an Account</h1>
        <Button>
            <Link to='/signin'>
                Back to Sign In
            </Link>
        </Button>
    </div>
  )
}

export default SignUp