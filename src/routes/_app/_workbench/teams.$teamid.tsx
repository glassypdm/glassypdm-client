import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Loading from "@/components/loading";

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
  const { resolvedLocation} = useRouterState();
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
  console.log()

  if (isPending) {
    return <Loading />;
  } else if (isError) {
    return <div>Encountered error while fetching team information</div>;
  }

  return (
    <div className="flex flex-col px-4 h-[500px]">
      <div className="flex flex-row space-x-2 w-full justify-center">
        <h1 className="font-semibold text-2xl text-center pb-2 grow">
          {data.body.team_name}
        </h1>
      </div>
      {data ? (
        <div className="flex flex-col justify-center py-2 w-full space-y-2">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(navigationMenuTriggerStyle(), "")}
                  active={resolvedLocation.pathname.includes('members')}
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
                  active={resolvedLocation.pathname.includes('pgroups')}
                  asChild
                >
                  <Link to="/teams/$teamid/pgroups" params={{ teamid: teamid }}>
                    Permission Groups
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
                  {/*
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={cn(navigationMenuTriggerStyle(), "")}
                  active={resolvedLocation.pathname.includes('orders')}
                  asChild
                >
                  <Link to="/teams/$teamid/orders" params={{ teamid: teamid }}>
                    Orders
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
                  */}
              {data.body.role === "Owner" || data.body.role === "Manager" ? (
                <NavigationMenuItem>
                  <NavigationMenuLink
                    className={cn(navigationMenuTriggerStyle(), "")}
                    active={resolvedLocation.pathname.includes('manage')}
                    asChild
                  >
                    <Link
                      to="/teams/$teamid/manage"
                      params={{ teamid: teamid }}
                    >
                      Manage
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ) : (
                <></>
              )}
            </NavigationMenuList>
          </NavigationMenu>
          <Separator />
        </div>
      ) : (
        <></>
      )}
      <Outlet />
    </div>
  );
}
