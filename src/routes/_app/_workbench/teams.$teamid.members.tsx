import Loading from "@/components/loading";
import Refetching from "@/components/refetching";
import { MemberColumns, Member } from "@/components/team/MemberColumn";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";

export const Route = createFileRoute("/_app/_workbench/teams/$teamid/members")({
  component: () => <TeamMembers />,
  loader: async ({ params }) => {
    const url = await invoke("get_server_url");
    return {
      teamid: params.teamid,
      url: url,
    };
  },
});

function TeamMembers() {
  const { teamid, url } = Route.useLoaderData();
  const { getToken } = useAuth();
  const { isPending, isError, data, error, isRefetching } = useQuery({
    queryKey: ["members", teamid],
    queryFn: async () => {
      const endpoint = (url as string) + "/team/by-id/" + teamid;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: "GET",
        mode: "cors",
      });
      return response.json();
    },
  });

  if (isPending) {
    return <Loading />;
  } else if (isError) {
    return (
      <div>
        An error occurred while fetching members, check your Internet connection
      </div>
    );
  }

  console.log(data);

  let tableData: Member[] = []
  for(let i = 0; i < data.body.members.length; i++) {
    let m: Member = {
      name: data.body.members[i].name,
      role: data.body.members[i].role,
      userid: data.body.members[i].id,
      teamid: teamid
    }
    tableData.push(m)
  }
  return (
    <div className="flex flex-col">
      {isRefetching ? (
        <Refetching />
      ) : (
        <></>
      )}
      <ScrollArea className="max-h-[70vh]">
        <DataTable columns={MemberColumns} data={tableData}>

        </DataTable>
      </ScrollArea>
    </div>
  );
}
