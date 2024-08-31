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
  // TODO map project mutation
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
      // TODO
      console.log(err);
    },
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.response === "success") {
        // TODO invalidate query
        toast({ title: "Project successfully mapped" });
      } else if (data.response == "error") {
        // TODO
        console.log(data);
      } else {
        // TODO
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
      // TODO
      console.log(err);
    },
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.response === "success") {
        // TODO happy path
        toast({ title: "User successfully added" });
      } else if (data.response == "error") {
        // TODO
        console.log("server error");
        console.log(data);
        userForm.setError("user", {
          type: "manual",
          message: "server error, create an issue",
        });
      } else {
        // TODO
        console.log(data);
      }
    },
  }); // end userMutation

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

  function addMapping(values: z.infer<typeof mappingSchema>) {
    console.log(values);
    const project_id = parseInt(values.project_id);
    if (Number.isNaN(project_id)) {
      return; // TODO set error
    }
    mappingMutation.mutate(project_id);
  }

  if (isPending) {
    return <Loader2 className="w-6 m-6 animate-spin" />;
  } else if (isError) {
    console.log(error);
    return (
      <div>An error occured while fetching data, please try again soon</div>
    );
  } else if (data.response != "success") {
    console.log(data);
    return (
      <div>An error occured while fetching data, please report an issue</div>
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
        Select a project to add or remove
        <Form {...mapForm}>
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
        <Table>
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
                <TableCell>No users in permission group</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Separator />
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
                            <SelectItem key={user.user_id} value={user.user_id}>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.body.pg_membership.length > 0 ? (
              data.body.pg_membership.map((user: any) => (
                <TableRow>
                  <TableCell>{user.name}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell>No users in permission group</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={"secondary"}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
