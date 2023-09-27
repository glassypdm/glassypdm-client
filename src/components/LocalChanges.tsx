import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "./ui/progress"
import { CheckboxReactHookFormMultiple } from "./CheckboxReactHookFormMultiple"

export function LocalChanges() {

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"default"}>Files ready to upload</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
            </DialogDescription>
            <div className="flex items-center space-x-2">
            </div>
        </DialogHeader>
          <CheckboxReactHookFormMultiple />
        <DialogFooter>
          {/** TODO move progress to hook form component */}
            <Progress value={0}/>
            <Button type="submit">Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
