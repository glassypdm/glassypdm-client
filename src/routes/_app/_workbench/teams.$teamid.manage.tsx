import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import { z } from 'zod';

export const Route = createFileRoute('/_app/_workbench/teams/$teamid/manage')({
  component: () => <Manage />,
  loader: async ({ params }) => {
    const url = await invoke("get_server_url") as string;
    return {
      teamid: params.teamid,
      url: url,
    };
  },
})

function Manage() {
    const { teamid, url } = Route.useLoaderData();
    const { toast } = useToast();
    const { getToken } = useAuth();
    const [permission, setPermission] = useState("");
    const [email, setEmail] = useState("");
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
            } else if(data.error === "invalid permission") {
              errStr = "You have insufficent permission for this action."
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

      return (
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
              {data.body.role == "Owner" || data.body.role == "Manager" ? (
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
      )
}