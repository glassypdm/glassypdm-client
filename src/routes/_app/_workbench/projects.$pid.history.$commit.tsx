import { Button } from '@/components/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { HistorySearch } from './projects.$pid.history.index'



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
    const { offset } = Route.useSearch();
    return (
        <div className='flex flex-col'>
            <div>
            <Button variant={'outline'} asChild>
                <Link to='/projects/$pid/history' params={{ pid: pid }} search={{ offset: offset }}>
                    Return
                </Link>
            </Button>
            </div>
            lmao
        </div>
    )
}