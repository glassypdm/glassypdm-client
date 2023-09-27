import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  }

export function Sidebar({ className }: SidebarProps) {
    return (
        <div className={cn("pb-12 h-screen bg-slate-900", className)}>
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              SDM-24
            </h2>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start">
                Workspace
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Project History
              </Button>
              <Button variant="ghost" className="w-full justify-start">
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
