import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@clerk/clerk-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { message } from "@tauri-apps/plugin-dialog";
import { useToast } from "@/components/ui/use-toast";

export const Route = createFileRoute("/_app/_workbench/teams")({
  component: Teams,

  loader: async () => {
    const url = await invoke("get_server_url");
    return {
      url: url,
    };
  },
});

const createTeamFormSchema = z.object({
  name: z.string({
    required_error: "Name is required"
  }).regex(new RegExp("^[a-zA-Z0-9 -]+$"), "Invalid team name.").trim(),
});

interface Team {
  id: number;
  name: string;
}

function Teams() {
  const { url } = Route.useLoaderData();
  const [created, setCreated] = useState(false);
  const { getToken } = useAuth();
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const endpoint = (url as string) + "/team";
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
        method: "GET",
        mode: "cors",
      });
      return response.json();
    },
  });
  const queryClient = useQueryClient();
  const {toast} = useToast();
  const form = useForm<z.infer<typeof createTeamFormSchema>>({
    resolver: zodResolver(createTeamFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (hehez: string) => {
      const endpoint = (url as string) + "/team";
      return await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({
          name: hehez,
        }),
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
    },
    onError: (error) => {
        toast({
            title: "An error ocurred while creating a team.",
            description: "Try again soon."
        })        
    },
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.status === "success") {
        setCreated(true);
        toast({
            title: "Team created successfully."
        })
      }
      else {
        toast({
            title: "An error ocurred while creating a team.",
            description: "Create an issue on the GitHub repository."
        })     
      }

      queryClient.invalidateQueries({
        queryKey: ["teams", "projects"],
      });
    },
  });

  function createTeam(values: z.infer<typeof createTeamFormSchema>) {
    mutation.mutate(values.name)
  }

  if (isPending) {
    return <div>Loading...</div>;
  } else if (isError) {
    return <div>an error occured while fetching data :c</div>;
  } else if (data.response != "success") {
    return <div>an error occured while fetching data :c</div>;
  }

  return (
    <div className="flex flex-row space-x-4">
      <div className="w-fit">
        <h1 className="text-2xl font-semibold text-center">Teams</h1>
        <NavigationMenu className="max-w-1/4 p-2">
          <ScrollArea className="h-48">
            <NavigationMenuList className="grid grid-flow-row items-center space-y-2 py-2">
              {data.body.teams && !isPending && !isError ? (
                data.body.teams.map((team: Team) => (
                  <NavigationMenuItem
                    className="w-48 text-center text-wrap"
                    key={team.id}
                  >
                    <NavigationMenuLink
                      className={cn(navigationMenuTriggerStyle(), "min-w-full")}
                      asChild
                    >
                      <Link
                        to="/teams/$teamid"
                        params={{ teamid: String(team.id) }}
                      >
                        {team.name}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))
              ) : (
                <div>No teams found</div>
              )}
            </NavigationMenuList>
          </ScrollArea>
        </NavigationMenu>
        <Dialog
          onOpenChange={() => {
            setCreated(false);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant={"outline"}
              className="w-full"
              disabled={!data.body.open}
            >
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="space-y-2">
            <Form {...form}>
              <DialogHeader>
                <DialogTitle>Create a new Team</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(createTeam)} className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={mutation.isPending || created} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={mutation.isPending || created}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Outlet />
    </div>
  );
}
