import { Button } from '@/components/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'

const FileSearchSchema = z.object({
  directory: z.string(),
})

interface DirectorySummary {
  files: any
  folders: string[]
}
export const Route = createFileRoute('/_app/_workbench/projects/$pid/files')({
  validateSearch: FileSearchSchema,
  loaderDeps: ({ search: { directory } }) => ({ directory }),
  loader: async ({ deps: { directory }, params: { pid } }) => {
    const data: DirectorySummary = await invoke('get_files', {
      projectId: parseInt(pid),
      directory: directory,
    })
    data.folders.sort()
    console.log(data)
    return data
  },
  component: () => <Files />,
})

function Files() {
  const { pid } = Route.useParams()
  const data = Route.useLoaderData()
  const { directory } = Route.useSearch()

  async function test() {
    const start = performance.now()
    const oop = await invoke('get_files', {
      projectId: parseInt(pid),
      directory: '',
    })

    const end = performance.now()
    console.log(end - start)
    console.log(oop)
  }


  let parentDirectory = "";
  const components = directory.split('\\');
  if(components.length > 2) {
    for(let i = 0; i < components.length - 2; i++) {
      parentDirectory += components[i] + '\\';
    }
  }
  return (
    <div className="flex flex-col">
      <div>current directory: {directory}</div>
      <div>parent directory: {parentDirectory}</div>
      <div>breadcrumb todo</div>
            { directory != "" ? <Link from={Route.fullPath} search={{directory: parentDirectory}} className='underline'>..</Link> : <></> }
            { data.folders.map((folder) => {
        return (
            <Link from={Route.fullPath} search={{directory: directory + folder}} className='underline' key={folder}>{folder}</Link>
        )
      })}
    </div>
  )
}
