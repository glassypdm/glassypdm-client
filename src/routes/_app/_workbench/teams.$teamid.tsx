import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import PermissionGroupDashboard from "@/components/team/pgroupdashboard";
import { RectangleEllipsis } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/_workbench/teams/$teamid")({
  component: () => <TeamDashboard />,
  loader: async ({ params }) => {
    const url = await invoke("get_server_url");
    return {
      teamid: params.teamid,
      url: url,
    };
  },
});

interface Member {
  emailID: string;
  name: string;
  role: string;
}

function TeamDashboard() {
  const { teamid, url } = Route.useLoaderData();
  const { getToken } = useAuth();
  const [permission, setPermission] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { isPending, isError, data, error } = useQuery({
    queryKey: [teamid],
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
  const mutationPermission = useMutation({
    mutationFn: async (level: number) => {
      const endpoint = (url as string) + "/permission";
      console.log("heh");
      return await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: "POST",
        mode: "cors",
        body: JSON.stringify({
          team_id: parseInt(teamid),
          email: email,
          level: level,
        }),
      });
    },
    onSuccess: async (res) => {
      setSubmitting(false);
      const data = await res.json();
      console.log(data);
      let errStr = "An error occured.";
      if (data.response === "error") {
        if (data.error === "user does not exist") {
          errStr = "User does not exist.";
        }
        toast({
          title: errStr,
        });
        return;
      }
      setEmail("");
      queryClient.invalidateQueries({ queryKey: [teamid] });
      toast({
        title: "Permission updated successfully.",
      });
    },
    onError: (res) => {
      setSubmitting(false);
      console.log(res);
      toast({
        title: "An error occured.",
      });
    },
  });

  function submitPermission() {
    const input = z.string().email();
    if (!input.safeParse(email).success || permission === "") {
      toast({
        title: "Invalid email.",
      });
      return;
    }
    let level = 169;
    switch (permission) {
      case "Owner":
        level = 3;
        break;
      case "Manager":
        level = 2;
        break;
      case "Member":
        level = 1;
        break;
      case "Remove":
        level = -4;
        break;
      default:
        level = 0;
    }
    setSubmitting(true);
    mutationPermission.mutate(level);
  }

  // TODO skeleton
  if (isPending) {
    return <div>Loading...</div>;
  }

  let manage = <></>;
  let pgroup = <></>;
  if (data && (data.body.role === "Owner" || data.body.role === "Manager")) {
    manage = (
      <div className="flex flex-col py-2 space-y-2">
        <div className="text-xl">Edit Permissions</div>
        <div className="flex flex-row space-x-2">
          <Input
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
          <Select onValueChange={setPermission}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role.." />
            </SelectTrigger>
            <SelectContent>
              {data.role == "Owner" ? (
                <>
                  <SelectItem value={"Owner"}>Owner</SelectItem>
                  <SelectItem value={"Manager"}>Manager</SelectItem>
                </>
              ) : (
                <></>
              )}
              <SelectItem value={"Member"}>Member</SelectItem>
              <SelectItem value={"Remove"}>Remove member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={permission == "Remove" ? "destructive" : "default"}
          disabled={permission == "" || submitting ? true : false}
          onClick={submitPermission}
        >
          Submit
        </Button>
      </div>
    );
    pgroup = (
      <PermissionGroupDashboard
        teamId={parseInt(teamid)}
        serverUrl={url as string}
      />
    );
  }

  return (
    <div className="flex flex-col w-screen px-4 h-[500px]">
      <h1 className="font-semibold text-2xl text-center pb-2 w-96">
        {data.body.teamName}
      </h1>
      <Tabs defaultValue="membership">
        {data && (data.body.role === "Owner" || data.body.role === "Manager") ? (
          <TabsList>
            <TabsTrigger value="membership">Membership</TabsTrigger>
            <TabsTrigger value="pgroup">Permission Groups</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>
        ) : (
          <></>
        )}

        <TabsContent value="membership">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.body.members.map((member: Member) => (
                <TableRow key={member.emailID}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>
              {data.body.members.length} member{data.body.members.length == 1 ? "" : "s"}
            </TableCaption>
          </Table>
        </TabsContent>
        <TabsContent value="pgroup">{pgroup}</TabsContent>
        <TabsContent value="manage">
          <div className="pb-4">Your role: {data.body.role}</div>
          {manage}
        </TabsContent>
      </Tabs>
    </div>
  );
}
