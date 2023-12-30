import { cn, pingServer } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [serverStatus, setServerStatus] = useState(true);

  useEffect(() => {
    // ping server ocassionally
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
      className={cn("space-y-4 py-4 pb-12 h-screen bg-slate-900", className)}
    >
      <div className="px-3 py-2">
        <h2 className={cn("mb-2 px-4 font-semibold", statusColor)}>
          {statusOutput}
        </h2>
        <div className="space-y-1">
          <NavLink to="/">
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                Workspace
              </Button>
            )}
          </NavLink>
          <NavLink to="/history">
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                Project History
              </Button>
            )}
          </NavLink>
          <NavLink to="/settings">
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                Client Settings
              </Button>
            )}
          </NavLink>
          <NavLink to="/account">
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                Account
              </Button>
            )}
          </NavLink>
          <NavLink to="/about">
            {({ isActive }) => (
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                About
              </Button>
            )}
          </NavLink>
        </div>
      </div>
    </div>
  );
}
