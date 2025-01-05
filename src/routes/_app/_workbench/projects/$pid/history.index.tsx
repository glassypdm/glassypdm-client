import Loading from '@/components/loading'
import Refetching from '@/components/refetching'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { ChevronLeft, Loader2 } from 'lucide-react'

export type HistorySearch = {
  offset: number
}

export const Route = createFileRoute('/_app/_workbench/projects/$pid/history/')(
  {
    validateSearch: (search: Record<string, unknown>): HistorySearch => {
      // validate and parse the search params into a typed state
      return {
        offset: Number(search?.offset ?? 0),
      }
    },
    component: () => <History />,
    loader: async ({ params }) => {
      const url = await invoke('get_server_url')
      return {
        url: url,
        pid: params.pid,
      }
    },
  },
)

interface CommitDescription {
  commit_id: number
  commit_number: number
  num_files: number
  author: string
  comment: string
  timestamp: number
}

interface Data {
  num_commits: number
  commits: CommitDescription[]
}

const DISABLED = 'pointer-events-none opacity-50'
interface DescriptionCardProps {
  pid: string
  commitDesc: CommitDescription
  offset: number
}
function DescriptionCard(props: DescriptionCardProps) {
  const commitdesc = props.commitDesc
  const d = new Date(0)
  d.setUTCSeconds(commitdesc.timestamp)
  return (
    <Card>
      <div className="flex flex-row items-center">
        <CardHeader className="p-4 grow">
          <CardTitle className="text-lg flex flex-row space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={'outline'}>v{commitdesc.commit_number}</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div>Project Update {commitdesc.commit_number}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div>
              {commitdesc.author} made {commitdesc.num_files} changes
            </div>
          </CardTitle>
          <CardDescription className="w-[400px]">
            {commitdesc.comment}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 justify-self-end">
          <Button asChild>
            <Link
              to="/projects/$pid/history/$commit"
              params={{
                pid: props.pid,
                commit: props.commitDesc.commit_id.toString(),
              }}
              search={{ offset: props.offset }}
            >
              View
            </Link>
          </Button>
        </CardContent>
      </div>
      <CardFooter className="p-2">
        <CardDescription>{d.toLocaleString()}</CardDescription>
      </CardFooter>
    </Card>
  )
}

function History() {
  const { getToken } = useAuth()
  const { url, pid } = Route.useLoaderData()
  const { offset } = Route.useSearch()
  const { isPending, isError, data, error, isRefetching } = useQuery({
    queryKey: ['history', pid, offset],
    queryFn: async () => {
      console.log(offset)
      console.log('fetching...')
      const endpoint =
        (url as string) +
        '/commit/select/by-project/' +
        pid +
        '?offset=' +
        offset
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: 'GET',
        mode: 'cors',
      })

      return response.json()
    },
  })

  let history = <div></div>
  if (isPending) {
    history = <Loading />
  } else if (isError) {
    console.log(error)
    return (
      <div>
        An error occurred while fetching data, check your Internet connection
      </div>
    )
  } else {
    console.log(data)
    if (data.response != 'success') {
      return <div>An error occured, open an issue on the GitHub repository</div>
    }

    history = (
      <ScrollArea className="max-h-[69vh] space-y-2">
        <div className="space-y-2 p-4">
          {data.body.commits.map((commit: CommitDescription) => {
            return (
              <DescriptionCard
                commitDesc={commit}
                key={commit.commit_id}
                pid={pid}
                offset={offset}
              />
            )
          })}
        </div>
      </ScrollArea>
    )
  }

  let pagination = []
  const COMMITS_PER_PAGE = 8 // this number is determined by server
  if (!isPending && !isError) {
    let idx = offset - 3 * COMMITS_PER_PAGE
    if (data.body.num_commits - offset < 2 * COMMITS_PER_PAGE) {
      idx = offset - 4 * COMMITS_PER_PAGE
    }

    while (pagination.length < 5) {
      idx += COMMITS_PER_PAGE
      if (idx < 0) {
        continue
      }
      if (idx > data.body.num_commits) {
        break
      }

      pagination.push(idx)
    }
  }
  console.log(pagination)

  return (
    <div className="flex flex-col items-center">
      {isRefetching ? <Refetching /> : <></>}
      {history}
      <Pagination className="pt-2">
        <PaginationContent>
          <PaginationItem
            className={
              offset - COMMITS_PER_PAGE < 0 || isPending ? DISABLED : ''
            }
          >
            <PaginationPrevious
              from={Route.fullPath}
              search={(prev: any) => ({
                offset: Number(prev.offset ?? 0) - COMMITS_PER_PAGE,
              })}
              params={{ pid: pid }}
            ></PaginationPrevious>
          </PaginationItem>
          {pagination.length > 0 ? (
            pagination.map((offset_val) => (
              <PaginationItem>
                <PaginationLink
                  from={Route.fullPath}
                  search={{ offset: offset_val }}
                  params={{ pid: pid }}
                  isActive={offset_val == offset}
                >
                  {offset_val / COMMITS_PER_PAGE + 1}
                </PaginationLink>
              </PaginationItem>
            ))
          ) : (
            <div>
              <Skeleton className="w-10 h-10" />
            </div>
          )}
          <PaginationItem
            className={
              isPending || offset + COMMITS_PER_PAGE > data.body.num_commits
                ? DISABLED
                : ''
            }
          >
            <PaginationNext
              from={Route.fullPath}
              search={(prev: any) => ({
                offset: Number(prev.offset ?? 0) + COMMITS_PER_PAGE,
              })}
              params={{ pid: pid }}
            ></PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
