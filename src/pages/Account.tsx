import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/api/fs";
import { open } from "@tauri-apps/api/shell";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "../components/ui/button";

const clerkPath = await resolveResource("resources/clerk-profile.txt");
const CLERK_USER_PROFILE_URL = await readTextFile(clerkPath);

interface AccountProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Account({ className }: AccountProps) {
  const { signOut, isLoaded } = useAuth();
  const { user, isSignedIn } = useUser();

  if (!user || !isLoaded || !isSignedIn) {
    return null;
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
    </div>
  );
}
