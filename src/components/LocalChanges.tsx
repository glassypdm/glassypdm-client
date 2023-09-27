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
import { PendingFile } from "./PendingFile"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "./ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "./ui/label"
import { useState } from "react"

enum ChangeType {
    CREATE,
    UPDATE,
    DELETE,
    UNIDENTIFIED
  }

// TODO remove
const tags = Array.from({ length: 50 }).map(
    (_, i, a) => `v1.2.0-beta.${a.length - i}`
);

export function LocalChanges() {

    const [allChecked, setAllChecked] = useState(true);
    const [isCheck, setIsCheck] = useState([]);

    function onCheckAll(event: any) {
        setAllChecked(!allChecked)
        console.log(event.target.value)
        if(event.target.value == "on") {
            event.target.value = "off"
        }
        else {
            event.target.value = "on"
        }
    }

    function onCheck(event: any) {
        console.log(event)
    }
    // TODO: probably need to yarn shadcn add form so we get name/value pairs
    // or look at gridlist in react aria
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
                <Switch id="sfr" onClick={onCheckAll}/>
                <Label htmlFor="sfr">Select All</Label>
            </div>
        </DialogHeader>
        <div className="grid gap-4">
        <ScrollArea className="h-72 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Changes</h4>
            <PendingFile key="sf" path="/kanguwu.txt" change={ChangeType.CREATE} checked={allChecked} handleCheck={onCheck}/>
            <Separator className="my-2" />
            <PendingFile path="/kangufwu.txt" change={ChangeType.UPDATE} checked={allChecked} handleCheck={onCheck}/>
            <Separator className="my-2" />
            <PendingFile path="/kanguwssu.txt" change={ChangeType.DELETE} checked={allChecked} handleCheck={onCheck}/>
            <Separator className="my-2" />
      </div>
    </ScrollArea>
    </div>
        <DialogFooter>
            <Progress value={0}/>
            <Button type="submit">Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
