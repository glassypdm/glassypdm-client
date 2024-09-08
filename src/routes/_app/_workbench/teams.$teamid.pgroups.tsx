import PermissionGroupDashboard from '@/components/team/pgroupdashboard';
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';

export const Route = createFileRoute('/_app/_workbench/teams/$teamid/pgroups')({
  component: () => <PermissionGroupMembership />,
  loader: async ({ params }) => {
    const url = await invoke("get_server_url") as string;
    return {
      teamid: params.teamid,
      url: url,
    };
  },
})

function PermissionGroupMembership() {
    const { teamid, url } = Route.useLoaderData();
    return (
        <PermissionGroupDashboard teamId={parseInt(teamid)} serverUrl={url} />
    )
}