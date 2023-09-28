import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { redirect } from "react-router-dom";
// TODO look into redirect in loaders and actions
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {

}

export function Sidebar({ className }: SidebarProps) {

    function handleWorkspace() {
        console.log("/")
        redirect("/")
    }

    function handleSettings() {
        console.log("/set")
        redirect("/settings")
    }

    function handleProjectHistory() {

    }

    return (
        <div className={cn("pb-12 h-screen bg-slate-900", className)}>
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              SDM-24
            </h2>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start" onClick={handleWorkspace}>
                Workspace
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Project History
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={handleSettings}>
                Client Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
}
