import { Button } from '@/components/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { HistorySearch } from './projects.$pid.history.index'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { FileRevisionTable } from '@/components/file/FileRevisionTable'
import { columns } from '@/components/file/FileRevisionColumn'
import { Undo2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'



export const Route = createFileRoute(
  '/_app/_workbench/projects/$pid/history/$commit',
)({
    validateSearch: (search: Record<string, unknown>): HistorySearch => {
        // validate and parse the search params into a typed state
        console.log(search)
        return {
            offset: Number(search?.offset ?? 0),
        }
        },
  component: () => <Commit />,
  loader: async ({ params }) => {
    const url = await invoke('get_server_url')
    return {
      url: url,
      pid: params.pid,
      commit_id: params.commit
    }
  },
})

function Commit() {
    const { pid, url, commit_id } = Route.useLoaderData();
    const { getToken } = useAuth();
    const { isPending, isError, data, error } = useQuery({
      staleTime: 1000 * 600,
      queryKey: ['pid', pid, 'commit', commit_id],
      queryFn: async () => {
        const endpoint = (url as string) + '/commit/by-id/' + commit_id;
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${await getToken()}` },
          method: 'GET',
          mode: 'cors',
        })
        return response.json();
      }
    })
    const { offset } = Route.useSearch();

    async function restore() {
      const endpoint = (url as string) + '/project/restore'
      // TODO refactor to use mutation
      /*
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({
          commit_id: parseInt(commit_id),
          project_id: parseInt(pid)
        })
      })
      const data = await response.json()
      console.log(data)
      */
    }

    if(isPending) {
      return (
        <div>Loading...</div>
      )
    }
    if(isError) {
      console.log(error)
      return (
        <div>An error occurred while fetching data, check your Internet connection</div>
      )
    }

    if(data.response != "success") {
      console.log(data)
      return (
        <div>An error occurred while fetching data, create an issue</div>
      )
    }
    console.log(data.body)
    const d = new Date(0)
    d.setUTCSeconds(data.body.description.timestamp)

    return (
        <div className='flex flex-col items-start space-y-2'>
            <div className='flex flex-row items-center place-items-start space-x-4'>
            <Button variant={'secondary'} asChild>
                <Link to='/projects/$pid/history' params={{ pid: pid }} search={{ offset: offset }}>
                    <Undo2 className='w-4 h-4 mr-2' />
                    <div>Return</div>
                </Link>
            </Button>
            <div className='font-semibold text-xl'>Project Update {data.body.description.commit_number} at {d.toLocaleString()}</div>
            {/*
            <Dialog>
              <DialogTrigger asChild>
                <Button variant={'outline'}>Restore</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restore project to Project Update {data.body.description.commit_number}?</DialogTitle>
                </DialogHeader>
                <Button variant={'destructive'} onClick={restore}>Yes</Button>
              </DialogContent>
            </Dialog>
            */}
            </div>
            <div className='flex flex-row grow border p-2 rounded-md w-full text-sm'>
              {data.body.description.comment.length == 0 ? "No comment provided" : data.body.description.comment}
            </div>
            <div className='text-md'>{data.body.description.num_files} file{data.body.description.num_files > 1 ? "s" : ""} updated by {data.body.description.author}:</div>
            {
              data.body.description.num_files > 0
              ?  <FileRevisionTable columns={columns} data={data.body.files}/>
              : <div className='text-center'>No files updated</div>
            }
        </div>
    )
}