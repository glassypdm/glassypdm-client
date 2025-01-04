import { Loader2 } from "lucide-react"

function Refetching() {
  return (
    <div className="flex flex-row items-center space-x-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    <div>Loading...</div>
  </div>
  )
}

export default Refetching