import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_workbench/projects/$pid/history')({
  // TODO add a route query param for offset
  component: () => <History />
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
  commitId: number
  commitNumber: number
  numFiles: number
  author: string
  comment: string
  timestamp: number
}

interface Data {
  numCommit: number
  commits: CommitDescription[]
}
const data: Data = {
  numCommit: 43,
  commits: [
    {
      commitId: 43,
      commitNumber: 43,
      numFiles: 414,
      author: "Josh Tenorio",
      comment: "yap yap yap yap yap yap yap yap yap yap yap yap yap",
      timestamp: 0
    },
    {
      commitId: 42,
      commitNumber: 42,
      numFiles: 14,
      author: "Josh Tenorio",
      comment: "asdf sf",
      timestamp: 0
    },
    {
      commitId: 41,
      commitNumber: 41,
      numFiles: 111,
      author: "Josh Tenorio",
      comment: "jyjyk",
      timestamp: 0
    },    {
      commitId: 40,
      commitNumber: 40,
      numFiles: 234,
      author: "Josh Tenorio",
      comment: "erherh",
      timestamp: 0
    },    {
      commitId: 39,
      commitNumber: 39,
      numFiles: 1152,
      author: "Josh Tenorio",
      comment: "asdfasdf",
      timestamp: 0
    }
  ]
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
          <CardTitle className='text-lg'>{commitdesc.author} made {commitdesc.numFiles} changes</CardTitle>
          <CardDescription className='w-[400px]'>Project Update {commitdesc.commitNumber} - {commitdesc.comment}</CardDescription>
        </CardHeader>
        <CardContent className='p-4 justify-self-end'>
          <Button>View</Button>
        </CardContent>
      </div>
      <CardFooter className='p-2'>
        <CardDescription>{d.toLocaleString()}</CardDescription>
      </CardFooter>
    </Card>
  )
}

function History() {
  return (
    <div className='flex flex-col items-center'>
      <ScrollArea className='h-96 space-y-2'>
        <div className='space-y-2 p-4'>
        <DescriptionCard commitDesc={data.commits[0]} />
        <DescriptionCard commitDesc={data.commits[1]} />
        <DescriptionCard commitDesc={data.commits[2]} />
        <DescriptionCard commitDesc={data.commits[3]} />
        <DescriptionCard commitDesc={data.commits[4]} />
        </div>
      </ScrollArea>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious /> {/* className TODO set disabled if in-applicable*/}
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
    </div>
  )
}