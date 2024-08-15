import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/history')({
  validateSearch: (search: Record<string, unknown>): any => {
    // validate and parse the search params into a typed state
    return {
      offset: search.offset
    }
  },
  component: () => <History />,
  loader: async ({params }) => {
    const url = await invoke("get_server_url")
    return {
      url: url,
      pid: params.pid
    }
  }
})

/*
type CommitDescription struct {
	CommitId     int    `json:"commit_id"`
	CommitNumber int    `json:"commit_number"`
	NumFiles     int    `json:"num_files"`
	Author       string `json:"author"`
	Comment      string `json:"comment"`
	Timestamp    int    `json:"timestamp"`
}

type CommitList struct {
	NumCommit int                 `json:"num_commits"`
	Commits   []CommitDescription `json:"commits"`
}
*/

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


interface DescriptionCardProps {
  commitDesc: CommitDescription
}
function DescriptionCard(props: DescriptionCardProps) {
  const commitdesc = props.commitDesc;
  const d = new Date(0);
  d.setUTCSeconds((commitdesc.timestamp) / 1000.0)
  // d.tolocalestring
  return (
    <Card className=''>
      <div className='flex flex-row items-center'>
        <CardHeader className='p-4 grow'>
          <CardTitle className='text-lg'>{commitdesc.author} made {commitdesc.num_files} changes</CardTitle>
          <CardDescription className='w-[400px]'>Project Update {commitdesc.commit_number} - {commitdesc.comment}</CardDescription>
        </CardHeader>
        <CardContent className='p-4 justify-self-end'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Button disabled>View</Button></TooltipTrigger>
              <TooltipContent>Feature coming soon</TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </CardContent>
      </div>
      <CardFooter className='p-2'>
        <CardDescription>{d.toLocaleString()}</CardDescription>
      </CardFooter>
    </Card>
  )
}

function History() {
  const { getToken } = useAuth();
  const { url, pid } = Route.useLoaderData();
  const { offset } = Route.useSearch();
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["history", pid],
    queryFn: async () => {
      const endpoint = (url as string) + "/commit/select/by-project/" + pid + "?offset=" + offset;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}`},
        method: "GET",
        mode: "cors"
      })

      return response.json();
    },
  })

  if(isPending) {
    return (
      <div>Loading</div>
    )
  }
  console.log(data)
  if(data.response != "success") {
    return (
      <div>An error occured</div>
    )
  }

  // TODO handle pagination
  
  return (
    <div className='flex flex-col items-center'>
      <ScrollArea className='h-96 space-y-2'>
        <div className='space-y-2 p-4'>
          {
            data.body.commits.map((commit: CommitDescription) => {
              return (
              <DescriptionCard commitDesc={commit} key={commit.commit_id} />
              )
            })
          }
        </div>
      </ScrollArea>
      {/*
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious /> {/* className TODO set disabled if in-applicable*//*}
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      */}
    </div>
  )
}