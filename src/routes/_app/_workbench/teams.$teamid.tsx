import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

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
  email: string;
  name: string;
  role: string;
}

function TeamDashboard() {
  const { teamid, url } = Route.useLoaderData();
  const { getToken } = useAuth();
  const { isPending, isError, data, error } = useQuery({
    queryKey: [teamid],
    queryFn: async () => {
      const endpoint = (url as string) + "/team/basic/by-id/" + teamid;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${await getToken()}` },
        method: "GET",
        mode: "cors",
      });
      return response.json();
    },
  });

  if (isPending) {
    return <div>Loading...</div>;
  } else if (isError) {
    return <div>Encountered error while fetching team information</div>;
  }

  return (
    <div className="flex flex-col w-screen px-4 h-[500px]">
      <h1 className="font-semibold text-2xl text-center pb-2 w-96">
        {data.body.team_name}
      </h1>
      {data && (data.body.role === "Owner" || data.body.role === "Manager") ? (
        <div className="py-2">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(navigationMenuTriggerStyle(), "")}
                  asChild
                >
                  <Link to="/teams/$teamid/members" params={{ teamid: teamid }}>
                    Membership
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(navigationMenuTriggerStyle(), "")}
                  asChild
                >
                  <Link to="/teams/$teamid/pgroups" params={{ teamid: teamid }}>
                    Permission Groups
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(navigationMenuTriggerStyle(), "")}
                  asChild
                >
                  <Link to="/teams/$teamid/manage" params={{ teamid: teamid }}>
                    Manage
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      ) : (
        <></>
      )}
      <Outlet />
    </div>
  );
}
