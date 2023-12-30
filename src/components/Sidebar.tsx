import { cn, pingServer } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

interface SidebarLinkProps {
  label: string;
  route: string;
}

function SidebarLink(props: SidebarLinkProps) {
  return (
    <NavLink to={props.route}>
      {({ isActive }) => (
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className="w-full justify-start"
        >
          {props.label}
        </Button>
      )}
    </NavLink>
  );
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [serverStatus, setServerStatus] = useState(false);

  useEffect(() => {
    // ping server on load
    pingServer().then((serverOk: boolean) => {
      console.log(serverOk ? "ok" : "no");
      setServerStatus(serverOk);
    });

    // then ping server ocassionally
    const interval = setInterval(() => {
      pingServer().then((serverOk: boolean) => {
        console.log(serverOk ? "ok" : "no");
        setServerStatus(serverOk);
      });
    }, 90 * 1000);

    // clear timer
    return () => clearInterval(interval);
  }, [serverStatus]);

  const statusOutput = serverStatus
    ? "Server Connected"
    : "Server Disconnected";
  const statusColor = serverStatus ? "" : "text-red-500";

  return (
    <div
      className={cn(
        "flex flex-col space-y-4 py-4 pb-12 h-screen bg-slate-900",
        className,
      )}
    >
      <div className="px-3 py-2">
        <div className="space-y-1">
          <SidebarLink route="/" label="Workspace" />
          <SidebarLink route="/history" label="Project History" />
          <SidebarLink route="/settings" label="Client Settings" />
          <SidebarLink route="/account" label="Account" />
          <SidebarLink route="/about" label="About" />
        </div>
      </div>
      <h2
        className={cn(
          "rounded-md border fixed m-5 py-3 px-3 font-semibold bottom-3 ",
          statusColor,
        )}
      >
        {statusOutput}
      </h2>
    </div>
  );
}
