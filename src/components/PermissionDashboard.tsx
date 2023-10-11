import { useAuth, useUser } from "@clerk/clerk-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { PermissionDashboardProps } from "@/lib/types";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "./ui/select";

const serverUrl: string = await invoke("get_server_url");

export function PermissionDashboard(props: PermissionDashboardProps) {
  const { isLoaded } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [level, setLevel] = useState("");

  if (!isLoaded || !user) {
    return (
      <div>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[250px]" />
      </div>
    );
  }

  if (props.level < 2) {
    return <div></div>;
  }

  async function submitPermission() {
    console.log(emailInput);
    console.log(level);
    if (emailInput === user?.primaryEmailAddress?.emailAddress) {
      toast({
        title: "Failure",
        description: "You can't set your own permissions",
      });
      return;
    }
    const rawResponse = await fetch(serverUrl + "/permissions", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        setterID: user?.id,
        userEmail: emailInput,
        projectID: 0,
        permissionLevel: parseInt(level),
      }),
    });
    const response = await rawResponse.json();
    if (response["result"] === "success") {
      toast({
        title: "Success",
        description: "Permission set successfully",
      });
    } else {
      toast({
        title: "Failure",
        description: "Couldn't set permission",
      });
    }
  }

  return (
    <div className="p-1 m-2">
      <h1 className="text-2xl">Edit Permissions</h1>
      <div className="flex">
        <Input
          onChange={(e: any) => setEmailInput(e.target.value)}
          placeholder={"Enter email here.."}
          type="email"
        />
        <Select onValueChange={(e) => setLevel(e)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a permission" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Read Only</SelectItem>
            <SelectItem value="1">Write Access</SelectItem>
            <SelectItem value="2">Manager</SelectItem>
            <SelectItem value="3">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        className="my-2"
        onClick={submitPermission}
        disabled={level.length === 0 || emailInput.length === 0}
      >
        Submit
      </Button>
    </div>
  );
}
