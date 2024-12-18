import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";

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

interface Member {
  email: string;
  name: string;
  role: string;
}

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
    return <div>Loading members...</div>;
  } else if (isError) {
    return (
      <div>
        An error occurred while fetching members, check your Internet connection
      </div>
    );
  }

  console.log(data);
  return (
    <div className="flex flex-col">
      {isRefetching ? (
        <div className="flex flex-row items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <div>Loading...</div>
        </div>
      ) : (
        <></>
      )}
      <ScrollArea className="max-h-[70vh]">
        <TableCaption className="flex">
          {data.body.members.length} member
          {data.body.members.length == 1 ? "" : "s"}
        </TableCaption>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.body.members.map((member: Member) => (
              <TableRow key={member.name}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
