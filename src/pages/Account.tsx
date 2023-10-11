import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/api/fs";
import { open } from "@tauri-apps/api/shell";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "../components/ui/button";
import { PermissionDashboard } from "@/components/PermissionDashboard";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";

const clerkPath = await resolveResource("resources/clerk-profile.txt");
const CLERK_USER_PROFILE_URL = await readTextFile(clerkPath);
const serverUrl: string = await invoke("get_server_url");

interface AccountProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Account({ className }: AccountProps) {
  const { signOut, isLoaded } = useAuth();
  const { user, isSignedIn } = useUser();
  const [permission, setPermission] = useState(0);

  if (!user || !isLoaded || !isSignedIn) {
    return null;
  }

  // TODO better way of fetching instead of useEffect
  useEffect(() => {
    fetch(
      serverUrl + "/info/permissions/" + user.primaryEmailAddress?.emailAddress,
    )
      .then((res: Response) => res.json())
      .then((data: any) => {
        if (data["result"]) {
          setPermission(data["level"]);
        }
      });
  }, []);

  let permissionDesc = "";
  switch (permission) {
    case 0:
      permissionDesc = "read-only";
      break;
    case 1:
      permissionDesc = "write-access";
      break;
    case 2:
      permissionDesc = "manager";
      break;
    case 3:
      permissionDesc = "owner";
      break;
  }

  return (
    <div className={cn("", className)}>
      <h1 className="text-2xl">Hello, {user["fullName"]}</h1>
      <div className="space-x-3 m-1">
        <Button onClick={() => signOut()}>Sign Out</Button>
        <Button onClick={() => open(CLERK_USER_PROFILE_URL)}>
          Edit Account Settings
        </Button>
      </div>
      <h1 className="text-2xl">Your permission level is: {permissionDesc}</h1>
      <PermissionDashboard level={permission} />
    </div>
  );
}
