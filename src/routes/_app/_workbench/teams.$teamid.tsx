import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';

export const Route = createFileRoute('/_app/_workbench/teams/$teamid')({
  component: () => <TeamDashboard />,
  loader: async ({ params }) => {
    const url = await invoke("get_server_url")
    return {
      teamid: params.teamid,
      url: url
    }
  }
})

function TeamDashboard() {
  const { teamid, url } = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: [teamid],
    queryFn: async () => {
      const endpoint = (url as string) + "/team?teamId=" + teamid
    }
  })
  return (
    <div>
      teamid: {teamid}
    </div>
  )
}