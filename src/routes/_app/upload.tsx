import { Button } from '@/components/ui/button'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/upload')({
  validateSearch: (search) =>
    search as {
      pid: string
    },
    /*
    loaderDeps: ({ search: { pid } }) => ({
      pid,
    }),
    */
    loader: () => {

    },
  component: () => <UploadPage />

})

function UploadPage() {
  const { pid } = Route.useSearch();
  
  return (
    <div className='flex flex-col p-4'>
      <h1 className='text-3xl pb-8'>Upload Changes</h1>
      <div>
        <div className='flex flex-row justify-items-center items-center'>
          <Button className='flex-none'asChild>
            <Link to={'/projects/$pid/sync'} params={{ pid: pid as string}}>Close</Link>
          </Button>
          <p className='flex-auto text-center'>description</p>
          <Button disabled={true}>Upload Selected</Button>
        </div>
        <div>Progress bar placeholder</div>
      </div>
      <div>table here</div>
      </div>
  )
}