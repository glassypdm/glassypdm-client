import { Construction } from "lucide-react"

function Loading() {
  return (
    <div className="flex flex-col items-center h-[40vh] justify-center">
        <div className="flex flex-row gap-x-2">
            <Construction className="w-28 h-28 animate-bounce"/>
        </div>
        <div className="text-2xl font-semibold">Loading...</div>
    </div>
  )
}

export default Loading