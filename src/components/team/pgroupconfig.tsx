import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { map, z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useToast } from "../ui/use-toast";
import { Loader2, Settings2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";

const userSchema = z.object({
  user: z.string().min(1, { message: "Please select a user." }),
});

const mappingSchema = z.object({
  project_id: z.string().min(1, { message: "Please select a project." }),
});

export type PermissionGroup = {
  pgroupid: number;
  name: string;
  count: number;
  url: string;
};

interface PermissionGroupConfigProps {
  group: PermissionGroup;
}

export function PermissionGroupConfig(props: PermissionGroupConfigProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["pgroupdialog", props.group.pgroupid],
    queryFn: async () => {
      const endpoint = (props.group.url +
        "/pgroup/info?pgroup_id=" +
        props.group.pgroupid) as string;
      console.log(endpoint);
      const resp = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: "GET",
        mode: "cors",
      });
      return resp.json();
    },
  });
  const mappingMutation = useMutation({
    mutationFn: async (project_id: number) => {
      const endpoint = props.group.url + "/pgroup/map";
      return await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: { Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({
          pgroup_id: props.group.pgroupid,
          project_id: project_id,
        }),
      });
    },
    onError: (err) => {
      toast({ title: "Error mapping project",
          description: "Please check your Internet connection."
        });
      console.log(err);
    },
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.response === "success") {
        toast({ title: "Project successfully mapped" });
      } else {
        toast({ title: "Error mapping project",
          description: "Check your permissions, if the project still exists, or create an issue on the GitHub repository."
         });
        console.log(data);
      }
    },
  });
  const addUserMutation = useMutation({
    mutationFn: async (user: string) => {
      const endpoint = props.group.url + "/pgroup/add";
      return await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: { Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({
          member: user,
          pgroup_id: props.group.pgroupid,
        }),
      });
    },
    onError: (err) => {
      toast({
        title: "Error adding user to group",
        description: "Check your internet connection."
      })
      console.log(err);
    },
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.response === "success") {
        toast({ title: "User successfully added" });
      } else {
        console.log(data);
        toast({
          title: "Error adding user to group",
          description: "Check your permission level, if the user is still in the team, or create an issue on the GitHub repository."
        })
        userForm.setError("user", {
          type: "manual",
          message: "server error, please create an issue on the GitHub repository.",
        });
      }
    },
  }); // end addUserMutation

  const removeUserMutation = useMutation({
    mutationFn: async (user: string) => {
      const endpoint = props.group.url + "/pgroup/remove";
      return await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: { Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({
          member: user,
          pgroup_id: props.group.pgroupid,
        }),
      });
    },
    onError: (err) => {
      toast({
        title: "Error removing user",
        description: "Check your Internet connection and try again later."
      });
      console.log(err);
    },
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.response === "success") {
        toast({ title: "User successfully removed" });
      } else {
        toast({
          title: "Error removing user",
          description: "Check your permission level, or create an issue on the GitHub repository."
        });
        console.log("server error");
        console.log(data);
        userForm.setError("user", {
          type: "manual",
          message: "server error, please create an issue on the GitHub repository.",
        });
      }
    },
  }); // end removeUserMutation

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      user: "",
    },
  });

  const mapForm = useForm<z.infer<typeof mappingSchema>>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      project_id: "",
    },
  });

  function addUser(values: z.infer<typeof userSchema>) {
    addUserMutation.mutate(values.user);
  }

  function removeUser(user: any) {
    removeUserMutation.mutate(user.user_id);
  }

  function addMapping(values: z.infer<typeof mappingSchema>) {
    console.log(values);
    const project_id = parseInt(values.project_id);
    if (Number.isNaN(project_id)) {
      mapForm.setError("project_id", {
        type: "manual",
        message: "Invalid project ID."
      });
      return;
    }
    mappingMutation.mutate(project_id);
  }

  if (isPending) {
    return <Loader2 className="w-6 m-6 animate-spin" />;
  } else if (isError) {
    console.log(error);
    return (
      <div>An error occured while fetching data, please try again soon and check your Internet connection</div>
    );
  } else if (data.response != "success") {
    console.log(data);
    return (
      <div>An error occured while fetching data, please report an issue on the GitHub repository</div>
    );
  } else {
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Settings2 className="w-6 h-6 hover:bg-gray-600 rounded-md transition-colors" />
      </DialogTrigger>
      <DialogContent className="m-2">
        <DialogHeader>
          <DialogTitle>{props.group.name}</DialogTitle>
        </DialogHeader>
        <Separator />
        <Tabs defaultValue="member">
          <TabsList>
            <TabsTrigger value="member">Members</TabsTrigger>
            <TabsTrigger value="project">Projects</TabsTrigger>
          </TabsList>
          <TabsContent value="member">
            <Form {...userForm}>
              <FormLabel>Select a user to add</FormLabel>
              <form
                onSubmit={userForm.handleSubmit(addUser)}
                className="flex flex-row space-x-2"
              >
                <FormField
                  control={userForm.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.body.team_membership.map((user: any) => {
                              return (
                                <SelectItem
                                  key={user.user_id}
                                  value={user.user_id}
                                >
                                  {user.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Add member to group</Button>
              </form>
            </Form>
            <ScrollArea className="flex h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.body.pg_membership.length > 0 ? (
                  data.body.pg_membership.map((user: any) => (
                    <TableRow className="flex flex-row items-center">
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="flex-grow"></TableCell>
                      <TableCell className="place-self-end">
                        <AlertDialog>
                          <AlertDialogTrigger>
                            <Button variant={"outline"}>Remove User</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {user.name}?
                              </AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <Button
                                variant={"destructive"}
                                onClick={() => removeUser(user)}
                              >
                                Continue
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell>No users in permission group</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </ScrollArea>
            </TabsContent>
          <TabsContent value="project">
            <Form {...mapForm}>
              <FormLabel>Select a project to add</FormLabel>
              <form
                onSubmit={mapForm.handleSubmit(addMapping)}
                className="flex flex-row space-x-2"
              >
                <FormField
                  control={mapForm.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.body.team_projects.map((project: any) => {
                              return (
                                <SelectItem
                                  key={project.id}
                                  value={project.id.toString()}
                                >
                                  {project.name}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Add project to group</Button>
              </form>
            </Form>
            <ScrollArea className="flex h-48">
              <Table className="py-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.body.pg_projects.length > 0 ? (
                    data.body.pg_projects.map((project: any) => (
                      <TableRow>
                        <TableCell>{project.name}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell>
                        No projects mapped to permission group
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={"secondary"}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
